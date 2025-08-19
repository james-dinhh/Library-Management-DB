SET NAMES utf8mb4;
USE smart_library;

-- Re-run safe
DROP PROCEDURE IF EXISTS sp_borrow_book;
DROP PROCEDURE IF EXISTS sp_return_book;
DROP PROCEDURE IF EXISTS sp_add_book;
DROP PROCEDURE IF EXISTS sp_update_inventory;
DROP PROCEDURE IF EXISTS sp_retire_book;
DROP PROCEDURE IF EXISTS sp_review_book;

DELIMITER $$

-- sp_borrow_book: concurrency-safe borrow operation
-- Locks the book row, checks status & stock, inserts checkout, decrements stock.
CREATE PROCEDURE sp_borrow_book (
  IN  p_user_id INT,
  IN  p_book_id INT,
  IN  p_borrow_days INT,
  OUT p_checkout_id INT
)
BEGIN
  DECLARE v_status ENUM('active','retired');
  DECLARE v_available INT;
  DECLARE v_due DATETIME;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Lock the target book row
  SELECT status, copies_available
    INTO v_status, v_available
  FROM books
  WHERE book_id = p_book_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not found';
  END IF;

  IF v_status <> 'active' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book is retired';
  END IF;

  IF v_available < 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No copies available';
  END IF;

  SET v_due = NOW() + INTERVAL p_borrow_days DAY;

  INSERT INTO checkouts (user_id, book_id, borrow_date, due_date, return_date)
  VALUES (p_user_id, p_book_id, NOW(), v_due, NULL);

  SET p_checkout_id = LAST_INSERT_ID();

  -- Decrement stock here (triggers only validate)
  UPDATE books
  SET copies_available = copies_available - 1
  WHERE book_id = p_book_id;

  COMMIT;

  -- Optional convenience result --> don't need @out_id
  SELECT p_checkout_id AS checkout_id;
END$$

-- sp_return_book: safe return operation
-- Locks checkout and its book; idempotent (won't double-increment stock).
CREATE PROCEDURE sp_return_book (
  IN p_checkout_id INT
)
BEGIN
  DECLARE v_book_id INT;
  DECLARE v_return_date DATETIME;
  DECLARE v_dummy INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  main: BEGIN
    START TRANSACTION;

    -- Lock the checkout row
    SELECT book_id, return_date
      INTO v_book_id, v_return_date
    FROM checkouts
    WHERE checkout_id = p_checkout_id
    FOR UPDATE;

    IF v_book_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Checkout not found';
    END IF;

    -- If already returned, do nothing
    IF v_return_date IS NOT NULL THEN
      COMMIT;
      LEAVE main;
    END IF;

    -- Lock the book row (explicit)
    SELECT 1 INTO v_dummy
    FROM books
    WHERE book_id = v_book_id
    FOR UPDATE;

    UPDATE checkouts
    SET return_date = NOW()
    WHERE checkout_id = p_checkout_id;

    -- Increment stock
    UPDATE books
    SET copies_available = copies_available + 1
    WHERE book_id = v_book_id;

    COMMIT;
  END main;
END$$

-- sp_add_book: create book + initial stock, log admin action atomically
-- (includes optional published_year & cover_image_url)
CREATE PROCEDURE sp_add_book (
  IN p_staff_id INT,
  IN p_title VARCHAR(255),
  IN p_genre VARCHAR(50),
  IN p_publisher_id INT,
  IN p_copies_total INT,
  IN p_published_year SMALLINT,
  IN p_cover_image_url VARCHAR(512)
)
BEGIN
  DECLARE v_book_id INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  INSERT INTO books (
    title, genre, published_year, publisher_id, cover_image_url,
    copies_total, copies_available, status
  )
  VALUES (
    p_title, p_genre, p_published_year, p_publisher_id, p_cover_image_url,
    p_copies_total, p_copies_total, 'active'
  );

  SET v_book_id = LAST_INSERT_ID();

  INSERT INTO staff_logs (staff_id, action_type, book_id, timestamp)
  VALUES (p_staff_id, 'add_book', v_book_id, NOW());

  COMMIT;
END$$

-- sp_update_inventory: adjust copies_total safely, recompute available, log
-- Ensures new total >= currently borrowed.
CREATE PROCEDURE sp_update_inventory (
  IN p_staff_id INT,
  IN p_book_id INT,
  IN p_new_total INT
)
BEGIN
  DECLARE v_total INT;
  DECLARE v_available INT;
  DECLARE v_borrowed INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Lock book row
  SELECT copies_total, copies_available
    INTO v_total, v_available
  FROM books
  WHERE book_id = p_book_id
  FOR UPDATE;

  IF v_total IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not found';
  END IF;

  SET v_borrowed = v_total - v_available;

  IF p_new_total < v_borrowed THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'New total cannot be less than currently borrowed';
  END IF;

  UPDATE books
  SET copies_total = p_new_total,
      copies_available = p_new_total - v_borrowed
  WHERE book_id = p_book_id;

  INSERT INTO staff_logs (staff_id, action_type, book_id, timestamp)
  VALUES (p_staff_id, 'update_book', p_book_id, NOW());

  COMMIT;
END$$

-- sp_retire_book: retire a book (no further borrows), log action
-- Sets status = 'retired' and sets available = 0 (borrowed copies remain tracked).
CREATE PROCEDURE sp_retire_book (
  IN p_staff_id INT,
  IN p_book_id INT
)
BEGIN
  DECLARE v_status ENUM('active','retired');

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  main: BEGIN
    START TRANSACTION;

    -- Lock book
    SELECT status
      INTO v_status
    FROM books
    WHERE book_id = p_book_id
    FOR UPDATE;

    IF v_status IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not found';
    END IF;

    IF v_status = 'retired' THEN
      -- Already retired; just log and commit
      INSERT INTO staff_logs (staff_id, action_type, book_id, timestamp)
      VALUES (p_staff_id, 'retire_book', p_book_id, NOW());
      COMMIT;
      LEAVE main;
    END IF;

    UPDATE books
    SET status = 'retired',
        copies_available = 0
    WHERE book_id = p_book_id;

    INSERT INTO staff_logs (staff_id, action_type, book_id, timestamp)
    VALUES (p_staff_id, 'retire_book', p_book_id, NOW());

    COMMIT;
  END main;
END$$

-- sp_review_book: validate + upsert a review (one per user/book)
-- Requires UNIQUE KEY (user_id, book_id) on reviews table.
CREATE PROCEDURE sp_review_book (
  IN p_user_id INT,
  IN p_book_id INT,
  IN p_rating TINYINT,
  IN p_comment TEXT
)
BEGIN
  DECLARE v_has_borrowed INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Basic validation
  IF p_rating < 1 OR p_rating > 5 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rating must be between 1 and 5';
  END IF;

  -- Ensure the user has borrowed the book at least once
  SELECT COUNT(*) INTO v_has_borrowed
  FROM checkouts
  WHERE user_id = p_user_id
    AND book_id = p_book_id;

  IF v_has_borrowed = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User must borrow the book before reviewing';
  END IF;

  START TRANSACTION;

  -- Insert or update one review per (user, book)
  INSERT INTO reviews (user_id, book_id, rating, comment, review_date)
  VALUES (p_user_id, p_book_id, p_rating, p_comment, NOW())
  ON DUPLICATE KEY UPDATE
    rating = VALUES(rating),
    comment = VALUES(comment),
    review_date = VALUES(review_date);

  COMMIT;
END$$

DELIMITER ;
