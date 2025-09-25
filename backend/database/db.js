const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = process.env.DB_PATH || './database/websecurity.db';

class Database {
    constructor() {
        this.db = null;
        this.connect();
    }

    connect() {
        // Ensure database directory exists
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error connecting to SQLite database:', err.message);
            } else {
                console.log('✅ Connected to SQLite database');
                this.initializeSchema();
            }
        });
    }

    initializeSchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error initializing database schema:', err.message);
                } else {
                    console.log('✅ Database schema initialized');
                }
            });
        }
    }

    // User-related database operations
    createUser(username, email, hashedPassword, callback) {
        const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        this.db.run(sql, [username, email, hashedPassword], function(err) {
            callback(err, this.lastID);
        });
    }

    getUserByEmail(email, callback) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        this.db.get(sql, [email], callback);
    }

    getUserByUsername(username, callback) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        this.db.get(sql, [username], callback);
    }

    getUserById(id, callback) {
        const sql = 'SELECT id, username, email, created_at FROM users WHERE id = ?';
        this.db.get(sql, [id], callback);
    }

    checkUserExists(username, email, callback) {
        const sql = 'SELECT id FROM users WHERE username = ? OR email = ?';
        this.db.get(sql, [username, email], callback);
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

// Create and export a single database instance
const database = new Database();

module.exports = database;