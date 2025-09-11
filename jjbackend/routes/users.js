const express = require('express');
const router = express.Router();
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

// Admin: reset a user's password to a temporary OTP and require reset
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.password = otp;
        user.requiresPasswordReset = true;
        await user.save();
        await sendEmail(
            user.email,
            'Password Reset - J & J Secondary School',
            `<p>Dear ${user.fullName},</p>
             <p>Your password has been reset by the administrator.</p>
             <p><b>Temporary Password (OTP):</b> ${otp}</p>
             <p>Please login and change your password.</p>`
        );
        res.status(200).json({ message: 'Password reset and email sent.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;


