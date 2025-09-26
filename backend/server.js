require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Import security middleware
const { 
    helmetConfig, 
    generalLimiter, 
    authLimiter, 
    registerLimiter, 
    speedLimiter,
    sanitizeInput,
    securityLogger,
    validateContentType,
    threatDetection
} = require('./middleware/security');

const { logger, requestLogger, errorLogger } = require('./middleware/logger');
const { addCSRFToken, verifyCSRFToken, getCSRFToken } = require('./middleware/csrf');

// Import Supabase routes
const supabaseAuthRoutes = require('./routes/supabase-auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure Winston logger
logger.info('🚀 Starting WebSecurity Backend Server with Supabase...');

console.log('🚀 Starting WebSecurity Backend Server with Supabase...');

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

// CORS configuration - Updated for single server deployment
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.PRODUCTION_URL || `http://localhost:${PORT}`
        : [`http://localhost:${PORT}`, 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true, // Allow credentials (cookies, sessions)
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};

// Security Middleware (Applied First)
app.use(helmetConfig); // Security headers
app.use(threatDetection); // Threat detection (before rate limiting)
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
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' // Stricter in production
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

app.use('/api', supabaseAuthRoutes); // Supabase authentication routes

// Serve static files from React build (Production)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    console.log('📁 Serving static frontend files from:', frontendDistPath);
    app.use(express.static(frontendDistPath));
    
    // Handle React Router - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({
                status: 'error',
                message: `API route ${req.originalUrl} not found`,
                data: null
            });
        }
        
        console.log('🎯 Serving React app for route:', req.path);
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
} else {
    console.log('⚠️  Frontend build not found at:', frontendDistPath);
    console.log('   Run "npm run build:frontend" to build the React app');
    
    // Fallback route for development
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({
                status: 'error',
                message: `API route ${req.originalUrl} not found`,
                data: null
            });
        }
        
        res.status(503).json({
            status: 'error',
            message: 'Frontend not built. Please run "npm run build:frontend" first.',
            data: { buildPath: frontendDistPath }
        });
    });
}

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
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log('✅ WebSecurity Server running on:', `http://localhost:${PORT}`);
    console.log('� Frontend served from:', fs.existsSync(frontendDistPath) ? 'Built React app (dist/)' : 'Not built - run npm run build:frontend');
    console.log('🌐 CORS enabled for:', corsOptions.origin);
    console.log('🔐 Session secret:', process.env.SESSION_SECRET ? 'Configured' : 'Using fallback');
    console.log('📊 Available endpoints:');
    console.log('   GET  /                     - React application (frontend)');
    console.log('   GET  /api/health           - Health check');
    console.log('   GET  /api/supabase-health  - Supabase connection check');
    console.log('   GET  /api/csrf-token       - CSRF token retrieval');
    console.log('   ');
    console.log('   🔗 Supabase Authentication Routes:');
    console.log('   POST /api/register         - User registration');
    console.log('   POST /api/login            - User login');
    console.log('   GET  /api/user             - Get user info');
    console.log('   PUT  /api/profile          - Update user profile');
    console.log('   POST /api/logout           - User logout');
    console.log('   ');
    console.log('🔥 Single server deployment ready!');
    console.log('💡 Frontend + Backend served from one server - powered by Supabase!');
    console.log('🚀 Open your browser to: http://localhost:' + PORT);
});

module.exports = app;