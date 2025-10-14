const express = require('express');
const router = express.Router();
const { sendEmailAsync, verifyTransporter, getMailerInfo } = require('../modules/mailer');

// POST route to send a test email
router.post('/test-email', async (req, res) => {
    const { to } = req.body;
    if (!to) {
        return res.status(400).json({ message: 'Recipient email "to" is required.' });
    }

    try {
        // First, verify connection
        const isVerified = await verifyTransporter();
        if (!isVerified) {
            return res.status(500).json({
                message: 'Mailer verification failed. Check credentials and server logs.',
                ok: false,
                info: getMailerInfo()
            });
        }

        // If verified, attempt to send email
        const subject = 'J & J School - Mailer Test';
        const html = `<p>This is a test email from the J & J Secondary School application.</p>
                      <p>If you received this, the mailer is configured correctly.</p>
                      <p>Timestamp: ${new Date().toISOString()}</p>`;
        
        const success = await sendEmailAsync(to, subject, html);

        if (success) {
            res.status(200).json({
                message: `Successfully sent test email to ${to}.`,
                ok: true,
                info: getMailerInfo()
            });
        } else {
            res.status(500).json({
                message: 'Failed to send test email. Check server logs for errors.',
                ok: false,
                info: getMailerInfo() // This will include the lastError
            });
        }
    } catch (error) {
        console.error('Error in /test-email endpoint:', error);
        res.status(500).json({
            message: 'An unexpected error occurred.',
            error: error.message,
            ok: false,
            info: getMailerInfo()
        });
    }
});

module.exports = router;
