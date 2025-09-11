const express = require('express');
const router = express.Router();
const PendingSignup = require('../models/PendingSignup');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function sendEmail(to, subject, html) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
}

// List pending signups
router.get('/pending-signups', async (req, res) => {
    try {
        const signups = await PendingSignup.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.status(200).json({ message: 'Pending signups retrieved', count: signups.length, data: signups });
    } catch (err) {
        console.error('List signups error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve pending signup -> create actual User with random temp password, email OTP
router.post('/pending-signups/:id/approve', async (req, res) => {
    try {
        const signup = await PendingSignup.findById(req.params.id);
        if (!signup || signup.status !== 'pending') return res.status(404).json({ message: 'Signup not found' });

        // Create user with temp password = generated OTP, requiresPasswordReset = true
        const tempPassword = signup.otp; // reuse OTP as initial password
        const user = new User({
            username: signup.desiredUsername,
            password: tempPassword,
            email: signup.email,
            fullName: signup.fullName,
            role: 'student',
            isActive: true,
            requiresPasswordReset: true
        });
        await user.save();

        signup.status = 'approved';
        await signup.save();

        await sendEmail(
            signup.email,
            'Your Student Account Is Ready',
            `<p>Dear ${signup.fullName},</p>
             <p>Your portal account has been created.</p>
             <p><b>Username:</b> ${signup.desiredUsername}<br/>
             <b>Temporary Password (OTP):</b> ${tempPassword}</p>
             <p>Please login and change your password immediately.</p>`
        );

        res.status(200).json({ message: 'Signup approved and user created', user: { id: user._id, username: user.username, email: user.email } });
    } catch (err) {
        console.error('Approve signup error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reject pending signup
router.post('/pending-signups/:id/reject', async (req, res) => {
    try {
        const { reason } = req.body;
        const signup = await PendingSignup.findById(req.params.id);
        if (!signup || signup.status !== 'pending') return res.status(404).json({ message: 'Signup not found' });
        signup.status = 'rejected';
        await signup.save();
        await sendEmail(
            signup.email,
            'Account Request Rejected',
            `<p>Dear ${signup.fullName},</p>
             <p>Your account setup request has been rejected.${reason ? ' Reason: ' + reason : ''}</p>`
        );
        res.status(200).json({ message: 'Signup rejected' });
    } catch (err) {
        console.error('Reject signup error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;


