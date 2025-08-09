-- ==========================================
-- Smart Library - Functions (MySQL 8+)
-- ==========================================

-- Note:
-- If MySQL server has binary logging and get:
-- "This function has none of DETERMINISTIC, NO SQL, or READS SQL DATA"
-- May need (temporarily) to:
--   SET GLOBAL log_bin_trust_function_creators = 1;
-- Then reconnect and run this file again.

SET NAMES utf8mb4;
USE smart_library;

-- Drop existing functions to allow re-run
DROP FUNCTION IF EXISTS fn_is_book_available;
DROP FUNCTION IF EXISTS fn_is_return_on_time;
DROP FUNCTION IF EXISTS fn_count_borrowed_in_range;

DELIMITER $$

-- 1) Is a book available? (status = 'active' AND copies_available > 0)
CREATE FUNCTION fn_is_book_available(p_book_id INT)
RETURNS TINYINT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_exists INT DEFAULT 0;

  SELECT COUNT(*)
    INTO v_exists
  FROM books
  WHERE book_id = p_book_id
    AND status = 'active'
    AND copies_available > 0;

  RETURN IF(v_exists > 0, 1, 0);
END$$

-- 2) Was a checkout returned on time?
-- Returns:
--   1  = on time (return_date <= due_date)
--   0  = late     (return_date >  due_date)
--   NULL = not yet returned (return_date IS NULL)
-- Uses the generated column checkouts.is_late for consistency/perf.
CREATE FUNCTION fn_is_return_on_time(p_checkout_id INT)
RETURNS TINYINT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_is_late TINYINT;

  SELECT is_late
    INTO v_is_late
  FROM checkouts
  WHERE checkout_id = p_checkout_id;

  IF v_is_late IS NULL THEN
    RETURN NULL;          -- not returned yet
  ELSE
    RETURN IF(v_is_late = 1, 0, 1); -- late -> 0; on-time -> 1
  END IF;
END$$

-- 3) How many books were borrowed in a time range?
-- Counts checkouts whose borrow_date falls within [p_start, p_end].
CREATE FUNCTION fn_count_borrowed_in_range(p_start DATETIME, p_end DATETIME)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_cnt INT DEFAULT 0;

  SELECT COUNT(*)
    INTO v_cnt
  FROM checkouts
  WHERE borrow_date >= p_start
    AND borrow_date <= p_end;

  RETURN v_cnt;
END$$

DELIMITER ;

-- Optional quick sanity checks (uncomment to run manually):
-- SELECT fn_is_book_available(1);
-- SELECT fn_is_return_on_time(1);
-- SELECT fn_count_borrowed_in_range('2025-01-01','2025-12-31');
