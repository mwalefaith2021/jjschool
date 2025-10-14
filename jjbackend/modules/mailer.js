const nodemailer = require('nodemailer');

// Create a reusable transporter with flexible configuration
// Priority: SMTP_URL > SMTP_HOST/PARTIAL > Gmail service via EMAIL_USER/EMAIL_PASS
let transporter;
let configured = false;
let mailerInfo = {
  configured: false,
  method: 'none',
  from: null,
  host: null,
  port: null,
  secure: null,
  lastError: null,
};

function buildTransporter() {
  try {
    if (process.env.SMTP_URL) {
      transporter = nodemailer.createTransport(process.env.SMTP_URL);
      configured = true;
      mailerInfo.method = 'SMTP_URL';
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
      mailerInfo.method = 'SMTP_HOST';
      mailerInfo.host = process.env.SMTP_HOST;
      mailerInfo.port = Number(process.env.SMTP_PORT || 587);
      mailerInfo.secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
      return;
    }
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Normalize Gmail App Password (Google shows it with spaces; remove them)
      const normalizedPass = String(process.env.EMAIL_PASS).replace(/\s+/g, '');
      // Gmail with App Password recommended
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: normalizedPass }
      });
      configured = true;
      mailerInfo.method = 'GMAIL_SERVICE';
      return;
    }
    configured = false;
    mailerInfo.method = 'none';
  } catch (e) {
    console.error('Mailer setup error:', e.message);
    configured = false;
    mailerInfo.method = 'error';
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
    mailerInfo.lastError = e && e.message ? e.message : String(e);
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
  mailerInfo.from = from || mailerInfo.from;
  try {
    console.log('📧 Sending email', { to, subject, from, via: mailerInfo.method });
  } catch {}
  const mailOptions = { from, to, subject, html };
  return transporter.sendMail(mailOptions)
    .then(() => true)
    .catch(err => {
      console.error('Email send error:', err && err.message ? err.message : err);
      mailerInfo.lastError = err && err.message ? err.message : String(err);
      return false;
    });
}

module.exports = {
  sendEmailAsync,
  verifyTransporter,
  getMailerInfo: () => ({ ...mailerInfo, configured }),
};
