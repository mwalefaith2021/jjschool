const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
// Tokens removed: no JWT secret needed

// Validation middleware
const validateLogin = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required')
];

const validateRegister = [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('fullName').notEmpty().withMessage('Full name is required')
];

// POST route for login
router.post('/login', validateLogin, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { username, password } = req.body;
        
        console.log('Login attempt:', { username, hasPassword: !!password });

        if (!username || !password) {
            console.log('Missing credentials');
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        // Find the user by username
        const user = await User.findOne({ username, isActive: true });
        console.log('User lookup result:', { found: !!user, username });

        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Compare the provided password with the hashed password
        const isMatch = await user.comparePassword(password);
        console.log('Password check:', { username, isMatch });

        if (!isMatch) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({ 
            message: 'Login successful!', 
            user: { 
                id: user._id, 
                username: user.username, 
                role: user.role,
                fullName: user.fullName,
                email: user.email,
                requiresPasswordReset: !!user.requiresPasswordReset
            } 
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// POST route for registration
router.post('/register', validateRegister, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Validation failed', 
                errors: errors.array() 
            });
        }

        const { username, password, email, fullName, role = 'student' } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'Username or email already exists.' 
            });
        }

        // Create new user
        const newUser = new User({
            username,
            password,
            email,
            fullName,
            role,
            requiresPasswordReset: role === 'student'
        });

        await newUser.save();

        res.status(201).json({ 
            message: 'User registered successfully!',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// POST route for logout (client should remove any stored session data). Also set no-cache headers so logged-out pages won't be cached.
const { noCache } = require('../middleware/auth');
router.post('/logout', (req, res) => {
    // Try to clear any session cookie (if present)
    try {
        res.clearCookie && res.clearCookie('connect.sid', { path: '/' });
    } catch (e) {}

    // Ensure responses are not cached
    noCache(req, res, () => {});

    // Inform client to remove client-side session state
    res.status(200).json({ message: 'Logout successful.' });
});

// Change password (first-time login flow)
router.post('/change-password', async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'Missing fields' });
        }
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.requiresPasswordReset) {
            // allow without checking oldPassword
        } else {
            const match = await user.comparePassword(oldPassword || '');
            if (!match) return res.status(401).json({ message: 'Old password incorrect' });
        }
        user.password = newPassword;
        user.requiresPasswordReset = false;
        await user.save();
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error during password change.' });
    }
});

// Tokens removed: /verify endpoint is no longer used

module.exports = router;