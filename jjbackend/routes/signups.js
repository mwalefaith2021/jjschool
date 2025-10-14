const express = require('express');
const router = express.Router();
const PendingSignup = require('../models/PendingSignup');
const User = require('../models/User');
const { sendEmailAsync, createEmailTemplate } = require('../modules/mailer');

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

        const approvedEmailContent = `
            <h2>🎓 Your Student Account Is Ready!</h2>
            <p>Dear <strong>${signup.fullName}</strong>,</p>
            <p>Great news! Your student portal account has been successfully created and activated.</p>
            <h3>Your Login Credentials</h3>
            <div class="highlight">
                <p><strong>Username:</strong> ${signup.desiredUsername}</p>
                <p><strong>Temporary Password:</strong> <span style="font-size: 1.3em; font-weight: bold; color: #2d5016;">${tempPassword}</span></p>
            </div>
            <p><strong>⚠️ Important Security Notice:</strong></p>
            <ul>
                <li>Please change your password immediately after your first login</li>
                <li>Do not share your credentials with anyone</li>
                <li>Keep your password secure and confidential</li>
            </ul>
            <h3>How to Access Your Account</h3>
            <ol>
                <li>Visit the student portal login page</li>
                <li>Enter your username and temporary password</li>
                <li>You will be prompted to create a new secure password</li>
                <li>Complete the password change process</li>
            </ol>
            <p><strong>What You Can Do:</strong></p>
            <ul>
                <li>View your student profile and academic information</li>
                <li>Check fee balances and payment history</li>
                <li>Access important school announcements</li>
                <li>Submit payment confirmations</li>
            </ul>
            <p>Welcome to J & J Secondary School! We're excited to have you as part of our community.</p>
            <p>Best regards,<br/><strong>Administration Office</strong><br/>J & J Secondary School</p>
        `;

        sendEmailAsync(
            signup.email,
            '🎓 Your J & J Student Account - Login Credentials',
            createEmailTemplate(approvedEmailContent)
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
        
        const rejectedEmailContent = `
            <h2>Account Request Status Update</h2>
            <p>Dear <strong>${signup.fullName}</strong>,</p>
            <p>Thank you for your interest in creating a student account with J & J Secondary School.</p>
            <p>We regret to inform you that your account setup request has not been approved at this time.</p>
            ${reason ? `
            <div class="highlight">
                <p><strong>Reason:</strong> ${reason}</p>
            </div>
            ` : ''}
            <p>If you believe this is an error or have questions about this decision, please contact our admissions office for clarification.</p>
            <p>Best regards,<br/><strong>Administration Office</strong><br/>J & J Secondary School</p>
        `;
        
        sendEmailAsync(
            signup.email,
            'Account Request Update - J & J Secondary School',
            createEmailTemplate(rejectedEmailContent)
        );
        res.status(200).json({ message: 'Signup rejected' });
    } catch (err) {
        console.error('Reject signup error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;


