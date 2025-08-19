SET NAMES utf8mb4;
USE smart_library;

-- Re-run safe: drop triggers if they exist
DROP TRIGGER IF EXISTS trg_checkouts_before_insert_adjust_stock;
DROP TRIGGER IF EXISTS trg_checkouts_after_update_return;
DROP TRIGGER IF EXISTS trg_reviews_after_insert_update_book_rating;
DROP TRIGGER IF EXISTS trg_reviews_after_update_adjust_book_rating;
DROP TRIGGER IF EXISTS trg_reviews_after_delete_adjust_book_rating;

DELIMITER $$

-- Borrow: adjust stock atomically and validate availability
CREATE TRIGGER trg_checkouts_before_insert_adjust_stock
BEFORE INSERT ON checkouts
FOR EACH ROW
BEGIN
  DECLARE v_rows INT DEFAULT 0;

  UPDATE books
  SET copies_available = copies_available - 1
  WHERE book_id = NEW.book_id
    AND status = 'active'
    AND copies_available > 0;

  SET v_rows = ROW_COUNT();

  IF v_rows = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Borrow failed: book not available or retired';
  END IF;
END$$

-- Return: increment stock only on first return
CREATE TRIGGER trg_checkouts_after_update_return
AFTER UPDATE ON checkouts
FOR EACH ROW
BEGIN
  IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
    UPDATE books
    SET copies_available = copies_available + 1
    WHERE book_id = NEW.book_id;
  END IF;
END$$

-- Reviews: insert -> increment counters and recompute average
CREATE TRIGGER trg_reviews_after_insert_update_book_rating
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  UPDATE books
  SET rating_count = rating_count + 1,
      rating_sum = rating_sum + NEW.rating,
      rating_avg = ROUND((rating_sum + NEW.rating) / (rating_count + 1), 2)
  WHERE book_id = NEW.book_id;
END$$

-- Reviews: update -> handle rating change and/or book move
CREATE TRIGGER trg_reviews_after_update_adjust_book_rating
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  IF NEW.book_id = OLD.book_id THEN
    -- Same book: adjust sum; count unchanged
    UPDATE books
    SET rating_sum = rating_sum + (NEW.rating - OLD.rating),
        rating_avg = ROUND((rating_sum + (NEW.rating - OLD.rating)) / rating_count, 2)
    WHERE book_id = NEW.book_id;
  ELSE
    -- Moved to a different book
    UPDATE books
    SET rating_count = rating_count - 1,
        rating_sum = rating_sum - OLD.rating,
        rating_avg = CASE WHEN rating_count - 1 <= 0 THEN 0.00 ELSE ROUND((rating_sum - OLD.rating) / (rating_count - 1), 2) END
    WHERE book_id = OLD.book_id;

    UPDATE books
    SET rating_count = rating_count + 1,
        rating_sum = rating_sum + NEW.rating,
        rating_avg = ROUND((rating_sum + NEW.rating) / (rating_count + 1), 2)
    WHERE book_id = NEW.book_id;
  END IF;
END$$

-- Reviews: delete -> decrement counters and recompute average
CREATE TRIGGER trg_reviews_after_delete_adjust_book_rating
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
  UPDATE books
  SET rating_count = rating_count - 1,
      rating_sum = rating_sum - OLD.rating,
      rating_avg = CASE WHEN rating_count - 1 <= 0 THEN 0.00 ELSE ROUND((rating_sum - OLD.rating) / (rating_count - 1), 2) END
  WHERE book_id = OLD.book_id;
END$$

DELIMITER ; 