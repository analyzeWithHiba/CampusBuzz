const express = require('express');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all users (mainly students for admin)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const users = await User.find({ role: 'student' }).select('-password');

        // Map _id to id for frontend compatibility
        const formattedUsers = users.map(u => {
            const userObj = u.toObject();
            userObj.id = userObj.uid; // Frontend expects id to be the admission number/uid
            return userObj;
        });

        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a user and their associated data
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        // Find user by uid since frontend uses admission number as 'id'
        const user = await User.findOne({ uid: req.params.id });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete associated registrations
        await Registration.deleteMany({ studentId: user.uid });

        // Delete associated notifications
        await Notification.deleteMany({ user: user._id });

        // Delete user
        await user.deleteOne();

        res.json({ message: 'User and associated data removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
// Allows updating email, yearOfStudy, password, profilePicture, settings
router.put('/:id', protect, async (req, res) => {
    try {
        const userIdParam = req.params.id;

        // Find by uid or _id 
        // Frontend uses currentUser.id which is actually currentUser._id based on auth.js response
        const user = await User.findOne({
            $or: [
                { uid: userIdParam },
                { _id: userIdParam.match(/^[0-9a-fA-F]{24}$/) ? userIdParam : null }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only allow a user to update their own profile, or an admin
        if (req.user.uid !== user.uid && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this profile' });
        }

        if (req.body.email && req.body.email.trim() !== '') {
            // Check if email already in use by another user
            const emailExists = await User.findOne({ email: req.body.email, uid: { $ne: user.uid } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email is already taken by another account' });
            }
            user.email = req.body.email;
        }

        if (req.body.yearOfStudy !== undefined && req.body.yearOfStudy !== '') {
            user.yearOfStudy = req.body.yearOfStudy;
        }

        if (req.body.password && req.body.password.trim() !== '') {
            user.password = req.body.password;
        }

        if (req.body.profilePicture !== undefined) {
            user.profilePicture = req.body.profilePicture;
        }

        if (req.body.settings !== undefined) {
            user.settings = { ...user.settings, ...req.body.settings };
        }

        await user.save();

        res.json({
            id: user.uid,
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            yearOfStudy: user.yearOfStudy,
            profilePicture: user.profilePicture,
            settings: user.settings
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            const userObj = user.toObject();
            userObj.id = userObj.uid;
            res.json(userObj);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
