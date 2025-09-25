const { verifySupabaseToken, getUserProfile } = require('../config/supabase');

// Middleware to verify Supabase JWT token
const authenticateSupabase = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    
    // If no token in header, check cookies (for browser requests)
    if (!token && req.cookies && req.cookies['sb-access-token']) {
      token = req.cookies['sb-access-token'];
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No authentication token provided',
        data: null
      });
    }
    
    // Verify token with Supabase
    const tokenResult = await verifySupabaseToken(token);
    
    if (!tokenResult.success) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authentication token',
        data: { error: tokenResult.error }
      });
    }
    
    // Get user profile
    const profileResult = await getUserProfile(tokenResult.user.id);
    
    if (!profileResult.success) {
      console.warn('User profile not found for:', tokenResult.user.id);
      // Continue without profile - user object will still have basic info
    }
    
    // Attach user info to request
    req.user = {
      id: tokenResult.user.id,
      email: tokenResult.user.email,
      username: profileResult.success ? profileResult.profile.username : null,
      profile: profileResult.success ? profileResult.profile : null,
      supabaseUser: tokenResult.user
    };
    
    console.log('✅ Authenticated user:', req.user.email);
    next();
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication verification failed',
      data: null
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token && req.cookies && req.cookies['sb-access-token']) {
      token = req.cookies['sb-access-token'];
    }
    
    if (token) {
      const tokenResult = await verifySupabaseToken(token);
      
      if (tokenResult.success) {
        const profileResult = await getUserProfile(tokenResult.user.id);
        
        req.user = {
          id: tokenResult.user.id,
          email: tokenResult.user.email,
          username: profileResult.success ? profileResult.profile.username : null,
          profile: profileResult.success ? profileResult.profile : null,
          supabaseUser: tokenResult.user
        };
      }
    }
    
    next();
    
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if auth fails
  }
};

module.exports = {
  authenticateSupabase,
  optionalAuth
};