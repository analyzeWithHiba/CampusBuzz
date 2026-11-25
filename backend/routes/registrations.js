const express = require('express');
const Registration = require('../models/Registration');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all registrations
// @route   GET /api/registrations
// @access  Private/Admin
router.get('/', protect, async (req, res) => {
    try {
        const registrations = await Registration.find({})
            .populate('userid', 'uid name email department')
            .populate('eventid', 'title date department');

        // Map back to frontend expected format for compatibility
        const formatted = registrations.map(r => ({
            id: r._id,
            eventId: r.eventid ? r.eventid._id : null,
            studentId: r.admissionNumber,
            studentName: r.userid ? r.userid.name : 'Unknown User',
            studentDept: r.userid && r.userid.department ? r.userid.department : 'Unknown',
            userid: r.userid ? r.userid._id : null,
            status: r.status,
            createdAt: r.Registrationdate,
            Registrationdate: r.Registrationdate
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get my registrations
// @route   GET /api/registrations/my
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const registrations = await Registration.find({ userid: req.user._id })
            .populate('eventid', 'title date department resultStatus type venue maxParticipants');

        // Formatted for frontend
        const formatted = registrations.map(r => ({
            id: r._id,
            eventId: r.eventid ? r.eventid._id : null,
            event: r.eventid, // keep populated object here for frontend UI
            status: r.status,
            createdAt: r.Registrationdate,
            Registrationdate: r.Registrationdate
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { eventId } = req.body;

        const exists = await Registration.findOne({ userid: req.user._id, eventid: eventId });
        if (exists) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }

        const registration = await Registration.create({
            userid: req.user._id,
            eventid: eventId,
            admissionNumber: req.user.uid,
            status: 'Pending'
        });

        // Add Notification for Admin
        const Event = require('../models/Event');
        const Notification = require('../models/Notification');
        const event = await Event.findById(eventId);
        if (event) {
            await Notification.create({
                user: null,
                forAdmin: true,
                title: 'New Registration',
                message: `${req.user.name} (${req.user.uid}) has registered for ${event.title}.`,
                type: 'info',
                eventId: event._id
            });
        }

        res.status(201).json(registration);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update registration status only (Results are now separate)
// @route   PUT /api/registrations/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);
        if (registration) {
            const { status } = req.body;
            if (status) registration.status = status;

            const updated = await registration.save();
            res.json(updated);
        } else {
            res.status(404).json({ message: 'Registration not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
