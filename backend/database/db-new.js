const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.connection = null;
        this.dbType = process.env.DB_TYPE || 'sqlite';
        this.connect();
    }

    async connect() {
        try {
            if (this.dbType === 'mysql') {
                await this.connectMySQL();
            } else {
                await this.connectSQLite();
            }
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            console.log('🔄 Falling back to SQLite...');
            this.dbType = 'sqlite';
            await this.connectSQLite();
        }
    }

    async connectMySQL() {
        console.log('🔄 Connecting to MySQL database...');
        
        this.connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'websecurity',
            acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
            timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
        });

        console.log('✅ Connected to MySQL database');
        await this.initializeMySQLSchema();
    }

    async connectSQLite() {
        console.log('🔄 Connecting to SQLite database...');
        
        const dbPath = process.env.DB_PATH || './database/websecurity.db';
        const dbDir = path.dirname(dbPath);
        
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.connection = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                throw err;
            }
            console.log('✅ Connected to SQLite database');
        });

        await this.initializeSQLiteSchema();
    }

    async initializeMySQLSchema() {
        try {
            // Create users table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create sessions table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id VARCHAR(128) PRIMARY KEY,
                    expires BIGINT NOT NULL,
                    data TEXT
                )
            `);

            console.log('✅ MySQL database schema initialized');
        } catch (error) {
            console.error('❌ Error initializing MySQL schema:', error);
        }
    }

    async initializeSQLiteSchema() {
        return new Promise((resolve, reject) => {
            const schemaPath = path.join(__dirname, 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf8');
                this.connection.exec(schema, (err) => {
                    if (err) {
                        console.error('❌ Error initializing SQLite schema:', err);
                        reject(err);
                    } else {
                        console.log('✅ SQLite database schema initialized');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // User operations
    async createUser(username, email, hashedPassword) {
        if (this.dbType === 'mysql') {
            const [result] = await this.connection.execute(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword]
            );
            return result.insertId;
        } else {
            return new Promise((resolve, reject) => {
                this.connection.run(
                    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                    [username, email, hashedPassword],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
        }
    }

    async getUserByEmail(email) {
        if (this.dbType === 'mysql') {
            const [rows] = await this.connection.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            return rows[0];
        } else {
            return new Promise((resolve, reject) => {
                this.connection.get(
                    'SELECT * FROM users WHERE email = ?',
                    [email],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
        }
    }

    async getUserByUsername(username) {
        if (this.dbType === 'mysql') {
            const [rows] = await this.connection.execute(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );
            return rows[0];
        } else {
            return new Promise((resolve, reject) => {
                this.connection.get(
                    'SELECT * FROM users WHERE username = ?',
                    [username],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
        }
    }

    async getUserById(id) {
        if (this.dbType === 'mysql') {
            const [rows] = await this.connection.execute(
                'SELECT id, username, email, created_at FROM users WHERE id = ?',
                [id]
            );
            return rows[0];
        } else {
            return new Promise((resolve, reject) => {
                this.connection.get(
                    'SELECT id, username, email, created_at FROM users WHERE id = ?',
                    [id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
        }
    }

    async checkUserExists(username, email) {
        if (this.dbType === 'mysql') {
            const [rows] = await this.connection.execute(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );
            return rows[0];
        } else {
            return new Promise((resolve, reject) => {
                this.connection.get(
                    'SELECT id FROM users WHERE username = ? OR email = ?',
                    [username, email],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
        }
    }

    // Close database connection
    async close() {
        if (this.connection) {
            if (this.dbType === 'mysql') {
                await this.connection.end();
                console.log('MySQL connection closed');
            } else {
                this.connection.close((err) => {
                    if (err) {
                        console.error('Error closing SQLite database:', err.message);
                    } else {
                        console.log('SQLite connection closed');
                    }
                });
            }
        }
    }
}

// Create and export a single database instance
const database = new Database();

module.exports = database;