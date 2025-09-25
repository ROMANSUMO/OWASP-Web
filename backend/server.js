require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Import routes and database
const authRoutes = require('./routes/auth-new');
const database = require('./database/db-new');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting WebSecurity Backend Server...');

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Allow credentials (cookies, sessions)
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(morgan('combined')); // Request logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'websecurity.sid' // Custom session name
}));

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path}`, {
        body: req.body,
        session: req.session?.userId ? `User ID: ${req.session.userId}` : 'No session'
    });
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check requested');
    res.status(200).json({
        status: 'success',
        message: 'WebSecurity Backend API is running',
        data: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        }
    });
});

// API Routes
app.use('/api', authRoutes);

// 404 handler for unknown routes
app.use('/api/*', (req, res) => {
    console.log('❌ Route not found:', req.originalUrl);
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
        data: null
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Global error handler:', err);
    
    // Handle specific error types
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid JSON in request body',
            data: null
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal server error',
        data: process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    
    // Close database connection
    database.close();
    
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    database.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log('✅ WebSecurity Backend Server running on:', `http://localhost:${PORT}`);
    console.log('🌐 CORS enabled for:', process.env.FRONTEND_URL || 'http://localhost:3000');
    console.log('🔐 Session secret:', process.env.SESSION_SECRET ? 'Configured' : 'Using fallback');
    console.log('📊 API endpoints available:');
    console.log('   GET  /api/health      - Health check');
    console.log('   POST /api/register    - User registration');
    console.log('   POST /api/login       - User login');
    console.log('   GET  /api/user        - Get user info (protected)');
    console.log('   POST /api/logout      - User logout (protected)');
    console.log('🔥 Server ready for connections!');
});

module.exports = app;