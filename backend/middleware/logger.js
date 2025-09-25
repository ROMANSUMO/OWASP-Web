const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += `\n${JSON.stringify(meta, null, 2)}`;
        }
        return msg;
    })
);

// Create Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports: [
        // Error logs
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        
        // Combined logs
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        
        // Security-specific logs
        new winston.transports.File({
            filename: path.join(logsDir, 'security.log'),
            level: 'warn',
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        }),
        
        // Authentication logs
        new winston.transports.File({
            filename: path.join(logsDir, 'auth.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Security-specific logging functions
const securityLogger = {
    // Log authentication attempts
    logAuth: (event, data) => {
        logger.info('AUTH_EVENT', {
            event,
            timestamp: new Date().toISOString(),
            ip: data.ip,
            userAgent: data.userAgent,
            email: data.email,
            success: data.success,
            reason: data.reason
        });
    },
    
    // Log security violations
    logSecurityViolation: (type, data) => {
        logger.warn('SECURITY_VIOLATION', {
            type,
            timestamp: new Date().toISOString(),
            ip: data.ip,
            userAgent: data.userAgent,
            url: data.url,
            method: data.method,
            payload: data.payload,
            reason: data.reason
        });
    },
    
    // Log rate limiting events
    logRateLimit: (data) => {
        logger.warn('RATE_LIMIT_EXCEEDED', {
            timestamp: new Date().toISOString(),
            ip: data.ip,
            url: data.url,
            userAgent: data.userAgent,
            limit: data.limit,
            windowMs: data.windowMs
        });
    },
    
    // Log input sanitization
    logSanitization: (data) => {
        logger.info('INPUT_SANITIZED', {
            timestamp: new Date().toISOString(),
            ip: data.ip,
            url: data.url,
            field: data.field,
            original: data.original,
            sanitized: data.sanitized,
            threatsRemoved: data.threatsRemoved
        });
    },
    
    // Log admin actions
    logAdminAction: (action, data) => {
        logger.info('ADMIN_ACTION', {
            action,
            timestamp: new Date().toISOString(),
            adminId: data.adminId,
            targetUser: data.targetUser,
            ip: data.ip,
            details: data.details
        });
    }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Log incoming request
    logger.info('HTTP_REQUEST', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        timestamp: new Date().toISOString(),
        sessionId: req.session?.id,
        userId: req.session?.userId
    });
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - startTime;
        
        logger.info('HTTP_RESPONSE', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
        
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
    logger.error('APPLICATION_ERROR', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        userId: req.session?.userId
    });
    
    next(err);
};

module.exports = {
    logger,
    securityLogger,
    requestLogger,
    errorLogger
};