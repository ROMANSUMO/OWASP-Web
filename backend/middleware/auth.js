// Authentication middleware to protect routes

const requireAuth = (req, res, next) => {
    console.log('🔐 Auth middleware - Session:', req.session);
    console.log('🔐 Auth middleware - User ID:', req.session?.userId);
    
    if (req.session && req.session.userId) {
        console.log('✅ User authenticated, proceeding...');
        return next();
    } else {
        console.log('❌ User not authenticated');
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required. Please log in.',
            data: null
        });
    }
};

// Middleware to check if user is already authenticated
const requireGuest = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.status(409).json({
            status: 'error',
            message: 'Already authenticated',
            data: null
        });
    }
    return next();
};

// Middleware to get current user info
const getCurrentUser = (req, res, next) => {
    if (req.session && req.session.userId) {
        req.currentUser = {
            id: req.session.userId,
            username: req.session.username,
            email: req.session.email
        };
    }
    return next();
};

module.exports = {
    requireAuth,
    requireGuest,
    getCurrentUser
};