const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Admission = require('../models/Admission');
const Payment = require('../models/Payment');

// GET route to fetch all students
router.get('/students', async (req, res) => {
    try {
        const students = await User.find({ role: 'student', isActive: true })
            .select('-password -__v')
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            message: 'Students retrieved successfully',
            count: students.length,
            data: students
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// GET route to fetch a specific student by ID
router.get('/students/:id', async (req, res) => {
    try {
        const student = await User.findById(req.params.id)
            .select('-password -__v');
        
        if (!student || student.role !== 'student') {
            return res.status(404).json({ 
                message: 'Student not found' 
            });
        }
        
        res.status(200).json({
            message: 'Student retrieved successfully',
            data: student
        });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// GET route to fetch student's admission application
router.get('/students/:id/application', async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        
        if (!student || student.role !== 'student') {
            return res.status(404).json({ 
                message: 'Student not found' 
            });
        }

        // Find admission application by email
        const application = await Admission.findOne({ 
            'contactInfo.email': student.email 
        });
        
        if (!application) {
            return res.status(404).json({ 
                message: 'No admission application found for this student' 
            });
        }
        
        res.status(200).json({
            message: 'Student application retrieved successfully',
            data: application
        });
    } catch (error) {
        console.error('Error fetching student application:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// PUT route to update student profile
router.put('/students/:id', async (req, res) => {
    try {
        const { fullName, email, phone } = req.body;
        
        const student = await User.findByIdAndUpdate(
            req.params.id,
            { 
                fullName: fullName || undefined,
                email: email || undefined
            },
            { new: true }
        ).select('-password -__v');
        
        if (!student || student.role !== 'student') {
            return res.status(404).json({ 
                message: 'Student not found' 
            });
        }
        
        res.status(200).json({
            message: 'Student profile updated successfully',
            data: student
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// DELETE route to deactivate student (soft delete)
router.delete('/students/:id', async (req, res) => {
    try {
        const student = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        ).select('-password -__v');
        
        if (!student || student.role !== 'student') {
            return res.status(404).json({ 
                message: 'Student not found' 
            });
        }
        
        res.status(200).json({
            message: 'Student deactivated successfully',
            data: student
        });
    } catch (error) {
        console.error('Error deactivating student:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// GET route to get student statistics
router.get('/students-stats', async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
        const newStudentsThisMonth = await User.countDocuments({
            role: 'student',
            isActive: true,
            createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
        });
        const totalPayments = await Payment.countDocuments();
        const totalPaymentsAmountAgg = await Payment.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalPaymentsAmount = totalPaymentsAmountAgg[0]?.total || 0;
        
        res.status(200).json({
            message: 'Student statistics retrieved successfully',
            data: {
                total: totalStudents,
                newThisMonth: newStudentsThisMonth,
                paymentsCount: totalPayments,
                paymentsTotalConfirmed: totalPaymentsAmount
            }
        });
    } catch (error) {
        console.error('Error fetching student statistics:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

module.exports = router;