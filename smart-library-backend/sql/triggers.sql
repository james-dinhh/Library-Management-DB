SET NAMES utf8mb4;
USE smart_library;

-- Clean re-run
DROP TRIGGER IF EXISTS trg_checkouts_before_insert_validate;
DROP TRIGGER IF EXISTS trg_reviews_after_insert_avg;
DROP TRIGGER IF EXISTS trg_reviews_after_update_avg;
DROP TRIGGER IF EXISTS trg_reviews_after_delete_avg;

DELIMITER $$

/* -----------------------------------------------------------
   CHECKOUTS (validation only; procedures adjust stock)
   ----------------------------------------------------------- */
CREATE TRIGGER trg_checkouts_before_insert_validate
BEFORE INSERT ON checkouts
FOR EACH ROW
BEGIN
  DECLARE v_status ENUM('active','retired');
  DECLARE v_available INT;

  -- Lock the book row to prevent races, and read current status/stock
  SELECT status, copies_available
    INTO v_status, v_available
  FROM books
  WHERE book_id = NEW.book_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Borrow failed: book not found';
  END IF;

  IF v_status <> 'active' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Borrow failed: book is retired';
  END IF;

  IF v_available < 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Borrow failed: no copies available';
  END IF;

  -- Optional extra guards
  IF NEW.due_date < NEW.borrow_date THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Borrow failed: due_date must be >= borrow_date';
  END IF;

  -- IMPORTANT: Do NOT modify copies_available here.
  -- Stock changes are handled by stored procedures within transactions.
END$$

/* -----------------------------------------------------------
   REVIEWS (maintain avg_rating + ratings_count)
   ----------------------------------------------------------- */

-- INSERT review: initialize or update rolling average
CREATE TRIGGER trg_reviews_after_insert_avg
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  DECLARE v_count INT;
  DECLARE v_avg DECIMAL(9,4);
  DECLARE v_new_avg DECIMAL(9,4);

  SELECT ratings_count, avg_rating
    INTO v_count, v_avg
  FROM books
  WHERE book_id = NEW.book_id
  FOR UPDATE;

  IF v_avg IS NULL OR v_count = 0 THEN
    SET v_new_avg = NEW.rating;
    UPDATE books
       SET ratings_count = 1,
           avg_rating    = ROUND(v_new_avg, 2)
     WHERE book_id = NEW.book_id;
  ELSE
    SET v_new_avg = ((v_avg * v_count) + NEW.rating) / (v_count + 1);
    UPDATE books
       SET ratings_count = v_count + 1,
           avg_rating    = ROUND(v_new_avg, 2)
     WHERE book_id = NEW.book_id;
  END IF;
END$$

-- UPDATE review: adjust average if rating changed or book_id moved
CREATE TRIGGER trg_reviews_after_update_avg
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  DECLARE v_count INT;
  DECLARE v_avg DECIMAL(9,4);
  DECLARE v_sum DECIMAL(12,4);
  DECLARE v_new_avg DECIMAL(9,4);

  DECLARE v_cnt_old INT;
  DECLARE v_avg_old DECIMAL(9,4);
  DECLARE v_sum_old DECIMAL(12,4);
  DECLARE v_new_avg_old DECIMAL(9,4);

  DECLARE v_cnt_new INT;
  DECLARE v_avg_new DECIMAL(9,4);
  DECLARE v_sum_new DECIMAL(12,4);
  DECLARE v_new_avg_new DECIMAL(9,4);

  IF NEW.book_id = OLD.book_id THEN
    IF NEW.rating <> OLD.rating THEN
      SELECT ratings_count, avg_rating
        INTO v_count, v_avg
      FROM books
      WHERE book_id = NEW.book_id
      FOR UPDATE;

      SET v_sum = (v_avg * v_count) - OLD.rating + NEW.rating;
      SET v_new_avg = v_sum / v_count;

      UPDATE books
         SET avg_rating = ROUND(v_new_avg, 2)
       WHERE book_id = NEW.book_id;
    END IF;
  ELSE
    -- Moved review from OLD.book_id to NEW.book_id
    -- subtract from OLD
    SELECT ratings_count, avg_rating
      INTO v_cnt_old, v_avg_old
    FROM books
    WHERE book_id = OLD.book_id
    FOR UPDATE;

    IF v_cnt_old - 1 <= 0 THEN
      UPDATE books
         SET ratings_count = 0,
             avg_rating    = NULL
       WHERE book_id = OLD.book_id;
    ELSE
      SET v_sum_old = (v_avg_old * v_cnt_old) - OLD.rating;
      SET v_new_avg_old = v_sum_old / (v_cnt_old - 1);
      UPDATE books
         SET ratings_count = v_cnt_old - 1,
             avg_rating    = ROUND(v_new_avg_old, 2)
       WHERE book_id = OLD.book_id;
    END IF;

    -- add to NEW
    SELECT ratings_count, avg_rating
      INTO v_cnt_new, v_avg_new
    FROM books
    WHERE book_id = NEW.book_id
    FOR UPDATE;

    IF v_avg_new IS NULL OR v_cnt_new = 0 THEN
      UPDATE books
         SET ratings_count = 1,
             avg_rating    = ROUND(NEW.rating, 2)
       WHERE book_id = NEW.book_id;
    ELSE
      SET v_sum_new = (v_avg_new * v_cnt_new) + NEW.rating;
      SET v_new_avg_new = v_sum_new / (v_cnt_new + 1);
      UPDATE books
         SET ratings_count = v_cnt_new + 1,
             avg_rating    = ROUND(v_new_avg_new, 2)
       WHERE book_id = NEW.book_id;
    END IF;
  END IF;
END$$

-- DELETE review: decrement count; avg becomes NULL if none left
CREATE TRIGGER trg_reviews_after_delete_avg
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
  DECLARE v_count INT;
  DECLARE v_avg DECIMAL(9,4);
  DECLARE v_sum DECIMAL(12,4);
  DECLARE v_new_count INT;
  DECLARE v_new_avg DECIMAL(9,4);

  SELECT ratings_count, avg_rating
    INTO v_count, v_avg
  FROM books
  WHERE book_id = OLD.book_id
  FOR UPDATE;

  SET v_new_count = v_count - 1;

  IF v_new_count <= 0 THEN
    UPDATE books
       SET ratings_count = 0,
           avg_rating    = NULL
     WHERE book_id = OLD.book_id;
  ELSE
    SET v_sum = (v_avg * v_count) - OLD.rating;
    SET v_new_avg = v_sum / v_new_count;
    UPDATE books
       SET ratings_count = v_new_count,
           avg_rating    = ROUND(v_new_avg, 2)
     WHERE book_id = OLD.book_id;
  END IF;
END$$

DELIMITER ;
