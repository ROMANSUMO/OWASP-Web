const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const xss = require('xss');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Create DOMPurify instance for server-side use
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Suspicious path detection for security monitoring
const isSuspiciousPath = (path) => {
    const suspiciousPaths = [
        '.env', '.htaccess', 'config', '.git', '.svn', 'cvs', 'backup',
        'admin', 'administrator', 'wp-admin', 'phpmyadmin', 'adminer',
        'phpinfo', 'server-status', 'server-info', 'trace.axd', 'elmah',
        '.ssh/', 'id_rsa', 'id_dsa', '.key', '.pem', 'privatekey',
        'database.yml', 'databases.yml', 'wp-config', 'configuration.php',
        'filezilla', 'winscp', 'sftp-config', 'composer.', 'package.json',
        'actuator/', 'health', 'metrics', 'dump', 'debug', 'test.php'
    ];
    
    const pathLower = path.toLowerCase();
    return suspiciousPaths.some(suspicious => pathLower.includes(suspicious));
};

// XSS Protection Configuration
const xssOptions = {
    whiteList: {
        p: [],
        br: [],
        strong: [],
        em: [],
        u: [],
        i: [],
        b: [],
        span: ['class'],
        div: ['class']
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
    css: false
};

// Rate Limiting Configuration
const createRateLimit = (windowMs, max, message, skipPaths = []) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            status: 'error',
            message,
            data: null
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req, res) => {
            // Skip rate limiting for static assets and certain paths
            const path = req.originalUrl.toLowerCase();
            return skipPaths.some(skipPath => path.includes(skipPath));
        },
        handler: (req, res) => {
            const path = req.originalUrl;
            const isSuspicious = isSuspiciousPath(path);
            
            if (isSuspicious) {
                console.log(`🚨 SECURITY ALERT: Potential attack detected from IP: ${req.ip} on ${path}`);
            } else {
                console.log(`🚨 Rate limit exceeded for IP: ${req.ip} on ${path}`);
            }
            
            res.status(429).json({
                status: 'error',
                message,
                data: null
            });
        }
    });
};

// General API rate limiting (exclude static assets)
const generalLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per 15 minutes
    'Too many requests from this IP, please try again later',
    ['/assets/', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot']
);

// Strict rate limiting for auth endpoints
const authLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per 15 minutes
    'Too many authentication attempts, please try again later'
);

// Registration rate limiting (prevent spam accounts)
const registerLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // 3 registration attempts per hour
    'Too many registration attempts, please try again in an hour'
);

// Slow down middleware for repeated requests
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // allow 2 requests per windowMs without delay
    delayMs: 500, // add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // maximum delay of 20 seconds
    handler: (req, res, next) => {
        console.log(`🐌 Slow down applied for IP: ${req.ip} on ${req.originalUrl}`);
        next();
    }
});

// Helmet security headers configuration
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "http:", "https:"],
            connectSrc: ["'self'", process.env.SUPABASE_URL || "", "http:", "https:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for HTTP
    crossOriginOpenerPolicy: false, // Disable problematic header for HTTP
    crossOriginResourcePolicy: false, // Disable for HTTP
    originAgentCluster: false, // Disable Origin-Agent-Cluster header
    hsts: false, // Disable HSTS for HTTP
    forceHTTPSRedirect: false // Never redirect to HTTPS
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    console.log('🧹 Sanitizing input for:', req.originalUrl);
    
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                // Apply XSS filtering
                const xssFiltered = xss(req.body[key], xssOptions);
                // Apply DOMPurify for additional safety
                req.body[key] = DOMPurify.sanitize(xssFiltered, {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'i', 'b'],
                    ALLOWED_ATTR: [],
                    KEEP_CONTENT: true
                });
                
                console.log(`   Sanitized ${key}:`, {
                    original: req.body[key],
                    sanitized: req.body[key]
                });
            }
        }
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = xss(req.query[key], xssOptions);
            }
        }
    }
    
    next();
};

// Security logging middleware
const securityLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Log security-relevant information
    console.log('🔒 Security Check:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        sessionId: req.session?.id
    });
    
    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(obj) {
        const responseTime = Date.now() - startTime;
        
        if (obj && obj.status === 'error') {
            console.log('🚨 Security Error Response:', {
                url: req.originalUrl,
                error: obj.message,
                responseTime: `${responseTime}ms`,
                ip: req.ip
            });
        }
        
        return originalJson.call(this, obj);
    };
    
    next();
};

// Validate Content-Type for POST requests
const validateContentType = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        
        if (!contentType || (!contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded'))) {
            console.log('🚨 Invalid content type:', contentType);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid content type',
                data: null
            });
        }
    }
    
    next();
};

// Security threat detection middleware
const threatDetection = (req, res, next) => {
    const path = req.originalUrl;
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip;
    
    if (isSuspiciousPath(path)) {
        console.log('🚨 THREAT DETECTED:', {
            type: 'Suspicious Path Access',
            path: path,
            ip: ip,
            userAgent: userAgent.substring(0, 200), // Limit length
            timestamp: new Date().toISOString(),
            method: req.method
        });
        
        // You could add additional actions here:
        // - Log to security file
        // - Send alert to monitoring system  
        // - Block IP temporarily
        // - Return 404 instead of 429 to avoid revealing information
        
        return res.status(404).json({
            status: 'error',
            message: 'Not found',
            data: null
        });
    }
    
    next();
};

module.exports = {
    helmetConfig,
    generalLimiter,
    authLimiter,
    registerLimiter,
    speedLimiter,
    sanitizeInput,
    securityLogger,
    validateContentType,
    threatDetection,
    xss: (input) => xss(input, xssOptions),
    domPurify: (input) => DOMPurify.sanitize(input)
};