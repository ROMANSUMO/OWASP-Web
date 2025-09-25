const crypto = require('crypto');

// Simple CSRF protection implementation (since csurf is deprecated)
class CSRFProtection {
    constructor(options = {}) {
        this.secret = options.secret || process.env.CSRF_SECRET || 'your-csrf-secret-key';
        this.tokenLength = options.tokenLength || 32;
        this.cookieName = options.cookieName || 'csrfToken';
        this.headerName = options.headerName || 'x-csrf-token';
    }
    
    // Generate CSRF token
    generateToken(sessionId) {
        const timestamp = Date.now().toString();
        const randomBytes = crypto.randomBytes(this.tokenLength).toString('hex');
        const payload = `${sessionId}:${timestamp}:${randomBytes}`;
        
        const hmac = crypto.createHmac('sha256', this.secret);
        hmac.update(payload);
        const signature = hmac.digest('hex');
        
        return `${Buffer.from(payload).toString('base64')}.${signature}`;
    }
    
    // Verify CSRF token
    verifyToken(token, sessionId) {
        if (!token) return false;
        
        try {
            const [payloadB64, signature] = token.split('.');
            if (!payloadB64 || !signature) return false;
            
            const payload = Buffer.from(payloadB64, 'base64').toString();
            const [tokenSessionId, timestamp, randomBytes] = payload.split(':');
            
            // Verify session ID matches
            if (tokenSessionId !== sessionId) return false;
            
            // Verify signature
            const hmac = crypto.createHmac('sha256', this.secret);
            hmac.update(payload);
            const expectedSignature = hmac.digest('hex');
            
            if (signature !== expectedSignature) return false;
            
            // Check token age (24 hours max)
            const tokenAge = Date.now() - parseInt(timestamp);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            return tokenAge < maxAge;
        } catch (error) {
            console.error('CSRF token verification error:', error);
            return false;
        }
    }
    
    // Middleware to add CSRF token to session/response
    addToken() {
        return (req, res, next) => {
            // Ensure session exists
            if (!req.session) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Session required for CSRF protection',
                    data: null
                });
            }
            
            // Generate or retrieve CSRF token
            if (!req.session.csrfToken) {
                req.session.csrfToken = this.generateToken(req.session.id || req.sessionID);
            }
            
            // Add token to response locals for templates
            res.locals.csrfToken = req.session.csrfToken;
            
            // Add token to response header for AJAX requests
            res.set('X-CSRF-Token', req.session.csrfToken);
            
            next();
        };
    }
    
    // Middleware to verify CSRF token
    verifyToken() {
        return (req, res, next) => {
            // Skip verification for GET, HEAD, OPTIONS
            if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                return next();
            }
            
            // Skip verification for health check endpoints
            if (req.originalUrl.includes('/health')) {
                return next();
            }
            
            const token = req.get(this.headerName) || 
                         req.body._csrf || 
                         req.query._csrf;
            
            const sessionId = req.session?.id || req.sessionID;
            
            if (!this.verifyToken(token, sessionId)) {
                console.log('🚨 CSRF token verification failed:', {
                    ip: req.ip,
                    url: req.originalUrl,
                    method: req.method,
                    userAgent: req.get('User-Agent'),
                    providedToken: token ? 'present' : 'missing',
                    sessionId
                });
                
                return res.status(403).json({
                    status: 'error',
                    message: 'Invalid or missing CSRF token',
                    data: null
                });
            }
            
            next();
        };
    }
    
    // Get token endpoint
    getTokenEndpoint() {
        return (req, res) => {
            if (!req.session) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Session required',
                    data: null
                });
            }
            
            if (!req.session.csrfToken) {
                req.session.csrfToken = this.generateToken(req.session.id || req.sessionID);
            }
            
            res.json({
                status: 'success',
                message: 'CSRF token retrieved',
                data: { csrfToken: req.session.csrfToken }
            });
        };
    }
}

// Create CSRF protection instance
const csrfProtection = new CSRFProtection({
    secret: process.env.CSRF_SECRET || 'your-csrf-secret-key-change-in-production',
    tokenLength: 32
});

module.exports = {
    CSRFProtection,
    csrfProtection,
    addCSRFToken: csrfProtection.addToken(),
    verifyCSRFToken: csrfProtection.verifyToken(),
    getCSRFToken: csrfProtection.getTokenEndpoint()
};