CREATE DATABASE IF NOT EXISTS biblioteka_online
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE biblioteka_online;

CREATE TABLE IF NOT EXISTS books (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  author VARCHAR(140) NOT NULL,
  category VARCHAR(60) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  description TEXT NULL,
  cover_color CHAR(7) NOT NULL DEFAULT '#315f4c',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(140) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  address VARCHAR(255) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('new', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NULL,
  book_title VARCHAR(180) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO books (title, author, category, price, stock, description, cover_color)
SELECT 'Prilli i thyer', 'Ismail Kadare', 'Roman', 8.50, 7,
       'Një histori për besën, kanunin dhe jetën në malësinë shqiptare.', '#315f4c'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Prilli i thyer' AND author = 'Ismail Kadare');

INSERT INTO books (title, author, category, price, stock, description, cover_color)
SELECT 'Kronikë në gur', 'Ismail Kadare', 'Histori', 10.00, 3,
       'Një qytet i rrëfyer përmes kujtimeve të një fëmije.', '#bd7354'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Kronikë në gur' AND author = 'Ismail Kadare');

INSERT INTO books (title, author, category, price, stock, description, cover_color)
SELECT 'Kopshti sekret', 'Frances Hodgson Burnett', 'Fëmijë', 7.25, 12,
       'Një vajzë zbulon një kopsht të fshehur dhe fillime të reja.', '#65856a'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Kopshti sekret' AND author = 'Frances Hodgson Burnett');

INSERT INTO books (title, author, category, price, stock, description, cover_color)
SELECT 'Një histori e shkurtër e pothuajse gjithçkaje', 'Bill Bryson', 'Shkencë', 14.90, 5,
       'Një udhëtim nëpër zbulimet që na ndihmojnë të kuptojmë botën.', '#60758b'
WHERE NOT EXISTS (SELECT 1 FROM books WHERE title = 'Një histori e shkurtër e pothuajse gjithçkaje' AND author = 'Bill Bryson');