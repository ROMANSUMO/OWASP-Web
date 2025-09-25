-- Database Schema for WebSecurity Application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for express-session store)
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    expires INTEGER NOT NULL,
    data TEXT
);

-- Insert sample users (passwords will be hashed in the application)
-- Password for demo users: 'password123'
INSERT OR IGNORE INTO users (username, email, password) VALUES 
('admin', 'admin@example.com', '$2a$10$example.hashed.password.placeholder'),
('testuser', 'test@example.com', '$2a$10$example.hashed.password.placeholder');