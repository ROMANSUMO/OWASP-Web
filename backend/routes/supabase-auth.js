const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, getUserProfile, upsertUserProfile } = require('../config/supabase');
const { authenticateSupabase, optionalAuth } = require('../middleware/supabase-auth');

const router = express.Router();

// Validation middleware
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Health check specifically for Supabase
router.get('/supabase-health', optionalAuth, async (req, res) => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    res.status(200).json({
      status: 'success',
      message: 'Supabase connection healthy',
      data: {
        connection: error ? 'failed' : 'ok',
        authenticated: req.user ? true : false,
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Supabase health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Supabase connection failed',
      data: { error: error.message }
    });
  }
});

// Register endpoint - creates user via Supabase Auth
router.post('/register', validateRegister, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        data: { errors: errors.array() }
      });
    }

    const { email, password, username } = req.body;
    
    console.log('📝 Registration attempt for:', email);

    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0] // Use email prefix if no username provided
        }
      }
    });

    if (authError) {
      console.error('Supabase registration error:', authError.message);
      
      // Handle common Supabase errors
      let errorMessage = 'Registration failed';
      if (authError.message.includes('already registered')) {
        errorMessage = 'An account with this email already exists';
      } else if (authError.message.includes('Password')) {
        errorMessage = 'Password does not meet requirements';
      } else {
        errorMessage = authError.message;
      }
      
      return res.status(400).json({
        status: 'error',
        message: errorMessage,
        data: { supabaseError: authError.message }
      });
    }

    console.log('✅ User registered successfully:', email);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
          emailConfirmed: authData.user?.email_confirmed_at ? true : false,
          username: authData.user?.user_metadata?.username
        },
        needsEmailConfirmation: !authData.user?.email_confirmed_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration',
      data: process.env.NODE_ENV === 'development' ? { error: error.message } : null
    });
  }
});

// Login endpoint - authenticates via Supabase Auth
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        data: { errors: errors.array() }
      });
    }

    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);

    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Supabase login error:', authError.message);
      
      let errorMessage = 'Invalid email or password';
      if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before logging in';
      } else if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else {
        errorMessage = authError.message;
      }
      
      return res.status(401).json({
        status: 'error',
        message: errorMessage,
        data: { supabaseError: authError.message }
      });
    }

    // Get user profile
    const profileResult = await getUserProfile(authData.user.id);
    
    console.log('✅ User logged in successfully:', email);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username: profileResult.success ? profileResult.profile.username : authData.user.user_metadata?.username,
          emailConfirmed: authData.user.email_confirmed_at ? true : false,
          lastSignIn: authData.user.last_sign_in_at
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login',
      data: process.env.NODE_ENV === 'development' ? { error: error.message } : null
    });
  }
});

// Get user info (protected route)
router.get('/user', authenticateSupabase, async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'User information retrieved successfully',
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          username: req.user.username,
          profile: req.user.profile,
          emailConfirmed: req.user.supabaseUser.email_confirmed_at ? true : false,
          lastSignIn: req.user.supabaseUser.last_sign_in_at,
          createdAt: req.user.supabaseUser.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user information',
      data: null
    });
  }
});

// Update user profile (protected route)
router.put('/profile', authenticateSupabase, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        data: { errors: errors.array() }
      });
    }

    const { username } = req.body;
    
    console.log('📝 Profile update for user:', req.user.id);

    // Update profile in database
    const result = await upsertUserProfile(req.user.id, {
      username,
      email: req.user.email
    });

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to update profile',
        data: { error: result.error }
      });
    }

    console.log('✅ Profile updated successfully for:', req.user.email);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        profile: result.profile
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during profile update',
      data: process.env.NODE_ENV === 'development' ? { error: error.message } : null
    });
  }
});

// Logout endpoint (optional - mainly for cleanup)
router.post('/logout', authenticateSupabase, async (req, res) => {
  try {
    // Sign out from Supabase (this invalidates the JWT)
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Supabase logout error:', error.message);
    }
    
    console.log('👋 User logged out:', req.user.email);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
      data: null
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during logout',
      data: null
    });
  }
});

module.exports = router;