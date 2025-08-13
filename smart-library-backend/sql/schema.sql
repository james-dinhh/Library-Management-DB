SET NAMES utf8mb4;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';

-- Create & use database
CREATE DATABASE IF NOT EXISTS smart_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE smart_library;

-- Drop in FK-safe order (for local resets)
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS checkouts;
DROP TABLE IF EXISTS staff_logs;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS publishers;
DROP TABLE IF EXISTS users;

-- ======================
-- Core lookup / entities
-- ======================

-- Users (readers & staff)
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  role ENUM('reader','staff') NOT NULL,
  password VARCHAR(100) NOT NULL,
  registration_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Publishers
CREATE TABLE publishers (
  publisher_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  address VARCHAR(255)
) ENGINE=InnoDB;

-- Books
CREATE TABLE books (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  genre VARCHAR(50) NOT NULL,
  published_year SMALLINT NULL,
  publisher_id INT NOT NULL,
  cover_image_url VARCHAR(512) NULL,
  copies_total INT NOT NULL,
  copies_available INT NOT NULL,
  status ENUM('active','retired') NOT NULL DEFAULT 'active',
  avg_rating DECIMAL(3,2) NULL,
  ratings_count INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_books_publisher
    FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  -- Integrity checks
  CONSTRAINT chk_copies_nonneg CHECK (copies_total >= 0 AND copies_available >= 0),
  CONSTRAINT chk_copies_le_total CHECK (copies_available <= copies_total),
  CONSTRAINT chk_published_year CHECK (
    published_year IS NULL OR (published_year BETWEEN 1000 AND YEAR(CURDATE()))
  )
) ENGINE=InnoDB;

-- Authors
CREATE TABLE authors (
  author_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  bio TEXT
) ENGINE=InnoDB;

-- Book <-> Author (many-to-many)
CREATE TABLE book_authors (
  book_id INT NOT NULL,
  author_id INT NOT NULL,
  PRIMARY KEY (book_id, author_id),
  CONSTRAINT fk_ba_book
    FOREIGN KEY (book_id) REFERENCES books(book_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_ba_author
    FOREIGN KEY (author_id) REFERENCES authors(author_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ======================
-- Transactions & reviews
-- ======================

-- Checkouts
CREATE TABLE checkouts (
  checkout_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  borrow_date DATETIME NOT NULL,
  due_date DATETIME NOT NULL,
  return_date DATETIME NULL,
  -- Generated column: NULL if not returned; 1 if late; 0 if on-time
  is_late TINYINT(1)
    GENERATED ALWAYS AS (
      CASE
        WHEN return_date IS NULL THEN NULL
        ELSE (return_date > due_date)
      END
    ) STORED,
  CONSTRAINT fk_co_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_co_book
    FOREIGN KEY (book_id) REFERENCES books(book_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_due_after_borrow CHECK (due_date >= borrow_date),
  CONSTRAINT chk_return_after_borrow CHECK (return_date IS NULL OR return_date >= borrow_date)
) ENGINE=InnoDB;

-- Reviews
CREATE TABLE reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NULL,
  review_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rev_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_rev_book
    FOREIGN KEY (book_id) REFERENCES books(book_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- Staff logs (admin actions)
CREATE TABLE staff_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  action_type ENUM('add_book','update_book','retire_book') NOT NULL,
  book_id INT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_staff
    FOREIGN KEY (staff_id) REFERENCES users(user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_log_book
    FOREIGN KEY (book_id) REFERENCES books(book_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- =======
-- Indexes
-- =======

-- Book search
CREATE INDEX idx_books_title ON books (title);
CREATE INDEX idx_books_genre ON books (genre);
CREATE INDEX idx_books_publisher ON books (publisher_id);

-- Author name search
CREATE INDEX idx_authors_name ON authors (name);

-- Reports
CREATE INDEX idx_checkouts_borrow_date ON checkouts (borrow_date);
CREATE INDEX idx_checkouts_due_date ON checkouts (due_date);
CREATE INDEX idx_checkouts_is_late ON checkouts (is_late);  -- new
CREATE INDEX idx_reviews_book ON reviews (book_id);
CREATE INDEX idx_stafflogs_staff_time ON staff_logs (staff_id, timestamp);
