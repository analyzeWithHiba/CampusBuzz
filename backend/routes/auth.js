const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { uid, name, email, password, role, department, yearOfStudy } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            uid,
            name,
            email,
            password,
            role: role || 'student', // default
            department: department || null,
            yearOfStudy: yearOfStudy || null
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                uid: user.uid,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Allow login by email or uid (admission number/username). Frontend sends this in the email field.
        const user = await User.findOne({
            $or: [
                { email: email },
                { uid: email }
            ]
        });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user.id,
                uid: user.uid,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
                profilePicture: user.profilePicture,
                settings: user.settings
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
