const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const database = require('../database/db-new');
const { requireAuth, requireGuest } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateRegistration = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match password');
            }
            return true;
        })
];

const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// POST /api/register - User registration
router.post('/register', requireGuest, validateRegistration, async (req, res) => {
    console.log('📝 Registration attempt:', { 
        username: req.body.username, 
        email: req.body.email 
    });

    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Registration validation errors:', errors.array());
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                data: { errors: errors.array() }
            });
        }

        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await database.checkUserExists(username, email);
        if (existingUser) {
            console.log('❌ User already exists:', { username, email });
            return res.status(409).json({
                status: 'error',
                message: 'Username or email already exists',
                data: null
            });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await database.createUser(username, email, hashedPassword);

        console.log('✅ User registered successfully:', { userId, username, email });
        
        // Create session for the new user
        req.session.userId = userId;
        req.session.username = username;
        req.session.email = email;

        res.status(201).json({
            status: 'success',
            message: 'Registration successful',
            data: {
                user: {
                    id: userId,
                    username,
                    email
                }
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error occurred during registration',
            data: null
        });
    }
});

// POST /api/login - User authentication
router.post('/login', requireGuest, validateLogin, async (req, res) => {
    console.log('🔐 Login attempt for email:', req.body.email);

    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Login validation errors:', errors.array());
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                data: { errors: errors.array() }
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await database.getUserByEmail(email);
        if (!user) {
            console.log('❌ Login failed: User not found for email:', email);
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password',
                data: null
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('❌ Login failed: Invalid password for email:', email);
            return res.status(401).json({
                status: 'error',
                message: 'Invalid email or password',
                data: null
            });
        }

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.email = user.email;

        console.log('✅ Login successful for user:', { 
            id: user.id, 
            username: user.username, 
            email: user.email 
        });

        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error occurred during login',
            data: null
        });
    }
});

// GET /api/user - Get current logged-in user info (protected route)
router.get('/user', requireAuth, async (req, res) => {
    console.log('👤 Getting current user info for session:', req.session.userId);

    try {
        const user = await database.getUserById(req.session.userId);
        if (!user) {
            console.log('❌ User not found for session:', req.session.userId);
            return res.status(404).json({
                status: 'error',
                message: 'User not found',
                data: null
            });
        }

        console.log('✅ User info retrieved:', { id: user.id, username: user.username });

        res.status(200).json({
            status: 'success',
            message: 'User information retrieved',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    created_at: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching user info:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user information',
            data: null
        });
    }
});

// POST /api/logout - User logout
router.post('/logout', requireAuth, (req, res) => {
    const username = req.session.username;
    console.log('👋 Logout request for user:', username);

    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Error destroying session:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to logout',
                data: null
            });
        }

        res.clearCookie('connect.sid');
        console.log('✅ User logged out successfully:', username);

        res.status(200).json({
            status: 'success',
            message: 'Logout successful',
            data: null
        });
    });
});

module.exports = router;