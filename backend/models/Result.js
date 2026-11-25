const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    eventid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    position: {
        type: String,
        default: null
    },
    score: {
        type: Number,
        default: null
    },
    remarks: {
        type: String,
        default: null
    },
    publishedat: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Prevent duplicate results for the same user in the same event
resultSchema.index({ eventid: 1, userid: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
