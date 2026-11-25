const express = require('express');
const Result = require('../models/Result');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all results
// @route   GET /api/results
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const results = await Result.find({}).populate('userid', 'name uid').populate('eventid', 'title');
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create or update a result
// @route   POST /api/results
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    try {
        const { eventid, userid, score, position, remarks } = req.body;

        if (!eventid || !userid) {
            return res.status(400).json({ message: 'Event ID and User ID are required' });
        }

        // Check if registration exists and matches
        const registration = await Registration.findOne({ eventid, userid });
        if (!registration) {
            return res.status(404).json({ message: 'User is not registered for this event' });
        }

        // Upsert Result
        let result = await Result.findOne({ eventid, userid });
        if (result) {
            result.score = score !== undefined ? score : result.score;
            result.position = position || result.position;
            result.remarks = remarks || result.remarks;
            result.publishedat = Date.now();
            await result.save();
        } else {
            result = await Result.create({
                eventid,
                userid,
                score: score !== undefined ? score : null,
                position: position || null,
                remarks: remarks || null
            });
        }

        // Automatically update the Registration status to 'Result Published'
        registration.status = 'Result Published';
        await registration.save();

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
