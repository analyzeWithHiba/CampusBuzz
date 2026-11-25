const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get my notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let query;
        if (req.user.role === 'admin') {
            query = { forAdmin: true };
        } else {
            query = { user: req.user._id };
        }
        const notifications = await Notification.find(query).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        let userId = req.body.user;

        // If a student is trying to create a notification, restrict it to themselves
        if (req.user.role === 'student') {
            userId = req.user._id;
            req.body.forAdmin = false;
        } else if (userId && typeof userId === 'string' && userId.length !== 24) {
            // Admin is passing an admission number (uid), look up the ObjectId
            const user = await User.findOne({ uid: userId });
            if (user) {
                userId = user._id;
            } else {
                return res.status(404).json({ message: 'User not found' });
            }
        }

        req.body.user = userId;

        const notification = await Notification.create(req.body);
        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Mark as read
// @route   PUT /api/notifications/read
// @access  Private
router.put('/read', protect, async (req, res) => {
    try {
        let query;
        if (req.user.role === 'admin') {
            query = { forAdmin: true, read: false };
        } else {
            query = { user: req.user._id, read: false };
        }
        await Notification.updateMany(query, { read: true });
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
