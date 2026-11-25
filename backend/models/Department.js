const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    deptname: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Department', departmentSchema);
