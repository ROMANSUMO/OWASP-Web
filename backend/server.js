require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import security middleware
const { 
    helmetConfig, 
    generalLimiter, 
    authLimiter, 
    registerLimiter, 
    speedLimiter,
    sanitizeInput,
    securityLogger,
    validateContentType
} = require('./middleware/security');

const { logger, requestLogger, errorLogger } = require('./middleware/logger');
const { addCSRFToken, verifyCSRFToken, getCSRFToken } = require('./middleware/csrf');

// Import routes (both legacy and Supabase)
const authRoutes = require('./routes/auth-new'); // Legacy routes
const supabaseAuthRoutes = require('./routes/supabase-auth'); // New Supabase routes

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Winston logger
logger.info('🚀 Starting WebSecurity Backend Server...');
logger.info('🔄 Migration Mode: Supporting both legacy and Supabase authentication');

console.log('🚀 Starting WebSecurity Backend Server...');
console.log('🔄 Migration Mode: Supporting both legacy and Supabase authentication');

// Validate Supabase configuration
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase configuration incomplete - please update .env file');
  console.warn('   Required: SUPABASE_URL, SUPABASE_ANON_KEY');
  console.warn('   Optional: SUPABASE_SERVICE_ROLE_KEY (for admin operations)');
  logger.warn('Supabase configuration incomplete', {
    hasUrl: !!process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Allow credentials (cookies, sessions)
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};

// Security Middleware (Applied First)
app.use(helmetConfig); // Security headers
app.use(generalLimiter); // General rate limiting
app.use(speedLimiter); // Slow down repeated requests
app.use(cors(corsOptions));
app.use(requestLogger); // Advanced request logging
app.use(morgan('combined')); // Request logging
app.use(cookieParser()); // Parse cookies
app.use(validateContentType); // Validate content type
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // CSRF protection
    },
    name: 'websecurity.sid' // Custom session name
}));

// CSRF Protection Middleware
app.use(addCSRFToken); // Add CSRF token to all responses
app.use(sanitizeInput); // XSS protection and input sanitization
app.use(securityLogger); // Security event logging

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
    logger.info('Health check requested', { ip: req.ip });
    res.status(200).json({
        status: 'success',
        message: 'WebSecurity Backend API is running',
        data: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            security: {
                helmet: true,
                rateLimiting: true,
                xssProtection: true,
                csrfProtection: true,
                inputSanitization: true
            }
        }
    });
});

// CSRF Token endpoint
app.get('/api/csrf-token', getCSRFToken);

// API Routes with specific rate limiting
app.use('/api/register', registerLimiter); // Strict rate limiting for registration
app.use('/api/login', authLimiter); // Strict rate limiting for login
app.use('/api/logout', authLimiter); // Rate limit logout attempts

// Apply CSRF protection to state-changing operations
app.use(['/api/register', '/api/login', '/api/logout'], verifyCSRFToken);

app.use('/api', authRoutes); // Legacy authentication routes
app.use('/api', supabaseAuthRoutes); // New Supabase authentication routes

// 404 handler for unknown routes
app.use('/api/*', (req, res) => {
    console.log('❌ Route not found:', req.originalUrl);
    logger.warn('Route not found', { 
        url: req.originalUrl, 
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
        data: null
    });
});

// Global error handling middleware
app.use(errorLogger); // Log all errors
app.use((err, req, res, next) => {
    console.error('❌ Global error handler:', err);
    logger.error('Global application error', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });
    
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
    
    // Close database connection (if using legacy database)
    try {
        const database = require('./database/db-new');
        database.close();
    } catch (error) {
        console.log('   No legacy database connection to close');
    }
    
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    
    try {
        const database = require('./database/db-new');
        database.close();
    } catch (error) {
        console.log('   No legacy database connection to close');
    }
    
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log('✅ WebSecurity Backend Server running on:', `http://localhost:${PORT}`);
    console.log('🌐 CORS enabled for:', process.env.FRONTEND_URL || 'http://localhost:3000');
    console.log('🔐 Session secret:', process.env.SESSION_SECRET ? 'Configured' : 'Using fallback');
    console.log('📊 API endpoints available:');
    console.log('   GET  /api/health           - Health check');
    console.log('   GET  /api/supabase-health  - Supabase connection check');
    console.log('   ');
    console.log('   📡 Legacy Authentication Routes:');
    console.log('   POST /api/register         - User registration (legacy)');
    console.log('   POST /api/login            - User login (legacy)');
    console.log('   GET  /api/user             - Get user info (legacy)');
    console.log('   POST /api/logout           - User logout (legacy)');
    console.log('   ');
    console.log('   🔗 Supabase Authentication Routes:');
    console.log('   POST /api/register         - User registration (Supabase)');
    console.log('   POST /api/login            - User login (Supabase)');
    console.log('   GET  /api/user             - Get user info (Supabase)');
    console.log('   PUT  /api/profile          - Update user profile (Supabase)');
    console.log('   POST /api/logout           - User logout (Supabase)');
    console.log('   ');
    console.log('🔥 Server ready for connections!');
    console.log('💡 Frontend should use Supabase client directly - backend is for additional API needs');
});

module.exports = app;