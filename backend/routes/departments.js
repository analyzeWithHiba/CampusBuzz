const express = require('express');
const Department = require('../models/Department');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find({});
        // Map fields to what frontend previously expected just in case, plus new fields
        const formatted = departments.map(d => ({
            id: d._id,
            name: d.deptname, // legacy fallback for frontend
            deptname: d.deptname
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a department
// @route   POST /api/departments
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    try {
        // Accept either deptname or name for backwards compatibility during migration
        const deptname = req.body.deptname || req.body.name;

        if (!deptname) {
            return res.status(400).json({ message: 'Department name is required' });
        }

        const exists = await Department.findOne({ deptname });
        if (exists) return res.status(400).json({ message: 'Department already exists' });

        const department = await Department.create({ deptname });
        res.status(201).json({ id: department._id, name: department.deptname, deptname: department.deptname });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (department) {
            department.deptname = req.body.deptname || department.deptname;
            const updated = await department.save();
            res.json({ id: updated._id, name: updated.deptname, deptname: updated.deptname });
        } else {
            res.status(404).json({ message: 'Department not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (department) {
            await department.deleteOne();
            res.json({ message: 'Department removed' });
        } else {
            res.status(404).json({ message: 'Department not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
