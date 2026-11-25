const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    admissionNumber: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Attended', 'Absent', 'Result Published'],
        default: 'Pending'
    },
    Registrationdate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Prevent duplicate registrations
registrationSchema.index({ userid: 1, eventid: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
