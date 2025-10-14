const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendEmailAsync, createEmailTemplate } = require('../modules/mailer');

// Admin: reset a user's password to a temporary OTP and require reset
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.password = otp;
        user.requiresPasswordReset = true;
        await user.save();
        
        const resetEmailContent = `
            <h2>🔐 Password Reset Request</h2>
            <p>Dear <strong>${user.fullName}</strong>,</p>
            <p>Your password has been reset by the school administrator. This is a security measure to help protect your account.</p>
            <h3>Your New Temporary Password</h3>
            <div class="highlight">
                <p><strong>Temporary Password (OTP):</strong> <span style="font-size: 1.4em; font-weight: bold; color: #2d5016;">${otp}</span></p>
                <p><strong>Username:</strong> ${user.username}</p>
            </div>
            <p><strong>⚠️ Important Security Steps:</strong></p>
            <ol>
                <li>Login to your student portal using the temporary password above</li>
                <li>You will be immediately prompted to create a new password</li>
                <li>Choose a strong, unique password that you haven't used before</li>
                <li>Keep your new password secure and do not share it with anyone</li>
            </ol>
            <p><strong>Password Requirements:</strong></p>
            <ul>
                <li>Minimum 6 characters</li>
                <li>Mix of letters and numbers recommended</li>
                <li>Avoid using easily guessable information</li>
            </ul>
            <p>If you did not request this password reset, please contact the administration office immediately.</p>
            <p>Best regards,<br/><strong>Administration Office</strong><br/>J & J Secondary School</p>
        `;
        
        sendEmailAsync(
            user.email,
            '🔐 Password Reset - J & J Student Portal',
            createEmailTemplate(resetEmailContent)
        );
        res.status(200).json({ message: 'Password reset and email sent.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;


