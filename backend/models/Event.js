const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    type: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    venue: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    bannerImage: {
        type: String,
        default: null
    },
    maxParticipants: {
        type: Number,
        default: null
    },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Hidden'],
        default: 'Published'
    },
    resultStatus: {
        type: String,
        enum: ['Draft', 'Published', 'Hidden'],
        default: 'Draft'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Event', eventSchema);
