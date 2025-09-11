const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');

// Create a payment record (from student dashboard)
router.post('/payments', async (req, res) => {
    try {
        const { studentId, amount, type, method, reference } = req.body;
        if (!studentId || !amount || !type || !method || !reference) {
            return res.status(400).json({ message: 'Missing fields' });
        }
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }
        const payment = await Payment.create({ studentId, amount, type, method, reference, status: 'pending' });
        res.status(201).json({ message: 'Payment recorded', data: payment });
    } catch (err) {
        console.error('Create payment error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// List payments for admin
router.get('/payments', async (req, res) => {
    try {
        const payments = await Payment.find().sort({ createdAt: -1 }).populate('studentId', 'username fullName email');
        res.status(200).json({ message: 'Payments retrieved', count: payments.length, data: payments });
    } catch (err) {
        console.error('List payments error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update payment status (approve/reject)
router.put('/payments/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['confirmed', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('studentId', 'username fullName email');
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        res.status(200).json({ message: 'Payment updated', data: payment });
    } catch (err) {
        console.error('Update payment status error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;


