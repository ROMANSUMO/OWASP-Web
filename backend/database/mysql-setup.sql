-- MySQL Database Setup for WebSecurity Application

-- Create database
CREATE DATABASE IF NOT EXISTS websecurity;

-- Use the database
USE websecurity;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    expires BIGINT NOT NULL,
    data TEXT
);

-- Insert sample users (with hashed passwords)
-- Password for both users: 'password123'
INSERT IGNORE INTO users (username, email, password) VALUES 
('admin', 'admin@example.com', '$2a$10$K7L/g/Gx1g1l1g1l1g1l1u.J6L/g/Gx1g1l1g1l1g1l1g1l1g1l1g1l1u'),
('testuser', 'test@example.com', '$2a$10$K7L/g/Gx1g1l1g1l1g1l1u.J6L/g/Gx1g1l1g1l1g1l1g1l1g1l1g1l1u');

-- Show tables
SHOW TABLES;

-- Show users
SELECT * FROM users;