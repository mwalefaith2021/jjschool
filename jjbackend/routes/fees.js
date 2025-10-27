const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Fees management endpoints should be protected
router.use(requireAuth);
const mongoose = require('mongoose');

// Define Fee Schema
const feeSchema = new mongoose.Schema({
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    academicYear: { type: String, required: true },
    form: { 
        type: String, 
        required: true,
        enum: ['form1', 'form2', 'form3', 'form4']
    },
    feeType: { 
        type: String, 
        required: true,
        enum: ['tuition', 'boarding', 'transport', 'uniform', 'books', 'other']
    },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'paid', 'overdue', 'partial'],
        default: 'pending'
    },
    paymentMethod: { type: String },
    paymentReference: { type: String },
    paidAmount: { type: Number, default: 0 },
    paidDate: { type: Date },
    notes: { type: String }
}, {
    timestamps: true
});

const Fee = mongoose.model('Fee', feeSchema);

// GET route to fetch all fees
router.get('/fees', async (req, res) => {
    try {
        const fees = await Fee.find()
            .populate('studentId', 'username fullName email')
            .sort({ dueDate: -1 });
        
        res.status(200).json({
            message: 'Fees retrieved successfully',
            count: fees.length,
            data: fees
        });
    } catch (error) {
        console.error('Error fetching fees:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// GET route to fetch fees for a specific student
router.get('/fees/student/:studentId', async (req, res) => {
    try {
        const fees = await Fee.find({ studentId: req.params.studentId })
            .populate('studentId', 'username fullName email')
            .sort({ dueDate: -1 });
        
        res.status(200).json({
            message: 'Student fees retrieved successfully',
            count: fees.length,
            data: fees
        });
    } catch (error) {
        console.error('Error fetching student fees:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// POST route to create a new fee
router.post('/fees', async (req, res) => {
    try {
        const { studentId, academicYear, form, feeType, amount, dueDate, notes } = req.body;
        
        const newFee = new Fee({
            studentId,
            academicYear,
            form,
            feeType,
            amount,
            dueDate,
            notes
        });

        await newFee.save();
        
        res.status(201).json({
            message: 'Fee created successfully',
            data: newFee
        });
    } catch (error) {
        console.error('Error creating fee:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// PUT route to update fee payment
router.put('/fees/:id/payment', async (req, res) => {
    try {
        const { paidAmount, paymentMethod, paymentReference, notes } = req.body;
        
        const fee = await Fee.findById(req.params.id);
        
        if (!fee) {
            return res.status(404).json({ 
                message: 'Fee not found' 
            });
        }

        const newPaidAmount = (fee.paidAmount || 0) + paidAmount;
        const remainingAmount = fee.amount - newPaidAmount;
        
        let status = 'partial';
        if (remainingAmount <= 0) {
            status = 'paid';
        } else if (new Date() > fee.dueDate) {
            status = 'overdue';
        }

        const updatedFee = await Fee.findByIdAndUpdate(
            req.params.id,
            {
                paidAmount: newPaidAmount,
                paymentMethod,
                paymentReference,
                paidDate: new Date(),
                status,
                notes: notes || fee.notes
            },
            { new: true }
        ).populate('studentId', 'username fullName email');
        
        res.status(200).json({
            message: 'Payment recorded successfully',
            data: updatedFee
        });
    } catch (error) {
        console.error('Error updating fee payment:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// GET route to get fee statistics
router.get('/fees-stats', async (req, res) => {
    try {
        const stats = await Fee.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    paidAmount: { $sum: '$paidAmount' }
                }
            }
        ]);
        
        const totalFees = await Fee.countDocuments();
        const totalAmount = await Fee.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        res.status(200).json({
            message: 'Fee statistics retrieved successfully',
            data: {
                total: totalFees,
                totalAmount: totalAmount[0]?.total || 0,
                byStatus: stats
            }
        });
    } catch (error) {
        console.error('Error fetching fee statistics:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

module.exports = router;