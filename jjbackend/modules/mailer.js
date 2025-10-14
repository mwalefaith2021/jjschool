const nodemailer = require('nodemailer');

// Create a reusable transporter with flexible configuration
// Priority: SMTP_URL > SMTP_HOST/PARTIAL > Gmail service via EMAIL_USER/EMAIL_PASS
let transporter;
let configured = false;

function buildTransporter() {
  try {
    if (process.env.SMTP_URL) {
      transporter = nodemailer.createTransport(process.env.SMTP_URL);
      configured = true;
      return;
    }
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
        auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        } : undefined
      });
      configured = true;
      return;
    }
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Gmail with App Password recommended
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      configured = true;
      return;
    }
    configured = false;
  } catch (e) {
    console.error('Mailer setup error:', e.message);
    configured = false;
  }
}

buildTransporter();

async function verifyTransporter() {
  if (!transporter) return false;
  try {
    await transporter.verify();
    return true;
  } catch (e) {
    console.warn('Mailer verify failed:', e.message);
    return false;
  }
}

// Fire-and-forget email sender. Logs failures but never throws to callers.
function sendEmailAsync(to, subject, html, options = {}) {
  if (!configured || !transporter) {
    console.warn('Email not configured; skipping email to', to);
    return Promise.resolve(false);
  }
  const from = options.from || process.env.MAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
  const mailOptions = { from, to, subject, html };
  return transporter.sendMail(mailOptions)
    .then(() => true)
    .catch(err => {
      console.error('Email send error:', err && err.message ? err.message : err);
      return false;
    });
}

module.exports = {
  sendEmailAsync,
  verifyTransporter,
};
