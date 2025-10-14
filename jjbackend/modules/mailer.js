const nodemailer = require('nodemailer');
let sgMail = null;
let resendClient = null;

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
    console.log('🔧 Building email transporter...');
    // Prefer Resend API if available (HTTPS 443)
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        resendClient = new Resend(process.env.RESEND_API_KEY);
        configured = true;
        mailerInfo.method = 'RESEND';
        mailerInfo.from = process.env.RESEND_FROM || process.env.MAIL_FROM || process.env.EMAIL_USER || null;
        console.log('✅ Transporter configured via Resend API');
        return;
      } catch (e) {
        console.error('❌ Failed to initialize Resend:', e.message);
        mailerInfo.lastError = e.message;
      }
    }
    // Prefer SendGrid API if available (avoids SMTP port blocks)
    if (process.env.SENDGRID_API_KEY) {
      try {
        sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        configured = true;
        mailerInfo.method = 'SENDGRID';
        mailerInfo.from = process.env.SENDGRID_FROM || process.env.MAIL_FROM || process.env.EMAIL_USER || null;
        console.log('✅ Transporter configured via SendGrid API');
        return;
      } catch (e) {
        console.error('❌ Failed to initialize SendGrid:', e.message);
        mailerInfo.lastError = e.message;
      }
    }
    if (process.env.SMTP_URL) {
      transporter = nodemailer.createTransport(process.env.SMTP_URL);
      configured = true;
      mailerInfo.method = 'SMTP_URL';
      console.log('✅ Transporter configured via SMTP_URL');
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
      console.log(`✅ Transporter configured via SMTP_HOST: ${process.env.SMTP_HOST}`);
      return;
    }
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Normalize Gmail App Password (Google shows it with spaces; remove them)
      const normalizedPass = String(process.env.EMAIL_PASS).replace(/\s+/g, '');
      console.log(`🔐 Gmail credentials found for: ${process.env.EMAIL_USER}`);
      console.log(`🔑 App password length (after normalize): ${normalizedPass.length} chars`);
      
      // Try port 465 (SSL) first if GMAIL_USE_SSL=true, otherwise 587 (TLS)
      const useSSL = String(process.env.GMAIL_USE_SSL || 'false').toLowerCase() === 'true';
      const port = useSSL ? 465 : 587;
      
      console.log(`🔌 Attempting Gmail SMTP via port ${port} (SSL: ${useSSL})`);
      
      // Gmail with App Password - explicit SMTP config to handle timeouts better
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: port,
        secure: useSSL, // true for 465, false for 587 (use STARTTLS)
        auth: { 
          user: process.env.EMAIL_USER, 
          pass: normalizedPass 
        },
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 8000,
        socketTimeout: 20000,
        pool: true, // use pooled connections
        maxConnections: 3,
        maxMessages: 10,
        logger: false, // disable nodemailer's own logging
        debug: false
      });
      configured = true;
      mailerInfo.method = 'GMAIL_SMTP_EXPLICIT';
      mailerInfo.host = 'smtp.gmail.com';
      mailerInfo.port = port;
      mailerInfo.secure = useSSL;
      mailerInfo.from = process.env.EMAIL_USER;
      console.log(`✅ Transporter configured via Gmail SMTP (smtp.gmail.com:${port})`);
      return;
    }
    console.warn('⚠️ No email credentials found in environment');
    configured = false;
    mailerInfo.method = 'none';
  } catch (e) {
    console.error('❌ Mailer setup error:', e.message);
    configured = false;
    mailerInfo.method = 'error';
  }
}

buildTransporter();

async function verifyTransporter() {
  // SendGrid path: treat API key presence as configured
  if (mailerInfo.method === 'SENDGRID' && sgMail) {
    return true;
  }
  // Resend path
  if (mailerInfo.method === 'RESEND' && resendClient) {
    return true;
  }
  if (!transporter) return false;
  try {
    console.log('🔍 Verifying email transporter...');
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');
    return true;
  } catch (e) {
    console.warn('❌ Mailer verify failed:', e.message);
    mailerInfo.lastError = e && e.message ? e.message : String(e);
    return false;
  }
}

// Fire-and-forget email sender. Logs failures but never throws to callers.
function sendEmailAsync(to, subject, html, options = {}) {
  // Resend path
  if (mailerInfo.method === 'RESEND' && resendClient) {
    const from = options.from || process.env.RESEND_FROM || process.env.MAIL_FROM || process.env.EMAIL_USER;
    mailerInfo.from = from || mailerInfo.from;
    console.log('📧 Sending email:', { to, subject, from, via: mailerInfo.method });
    return resendClient.emails
      .send({ from, to, subject, html })
      .then((resp) => {
        console.log('✅ Email sent via Resend:', { to, id: resp && resp.id });
        return true;
      })
      .catch(err => {
        const m = (err && err.message) || String(err);
        console.error('❌ Email send error (Resend):', m);
        mailerInfo.lastError = m;
        return false;
      });
  }
  // SendGrid path
  if (mailerInfo.method === 'SENDGRID' && sgMail) {
    const from = options.from || process.env.SENDGRID_FROM || process.env.MAIL_FROM || process.env.EMAIL_USER;
    mailerInfo.from = from || mailerInfo.from;
    const msg = { to, from, subject, html };
    console.log('📧 Sending email:', { to, subject, from, via: mailerInfo.method });
    return sgMail
      .send(msg)
      .then(([resp]) => {
        console.log('✅ Email sent via SendGrid:', { to, statusCode: resp && resp.statusCode });
        return true;
      })
      .catch(err => {
        const m = (err && err.response && err.response.body && JSON.stringify(err.response.body)) || (err && err.message) || String(err);
        console.error('❌ Email send error (SendGrid):', m);
        mailerInfo.lastError = m;
        return false;
      });
  }
  // Nodemailer path (SMTP)
  if (!configured || !transporter) {
    console.warn('⚠️ Email not configured; skipping email to', to);
    return Promise.resolve(false);
  }
  const from = options.from || process.env.MAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
  mailerInfo.from = from || mailerInfo.from;
  const mailOptions = { from, to, subject, html };
  console.log('📧 Sending email:', { to, subject, from, via: mailerInfo.method });
  return transporter.sendMail(mailOptions)
    .then((info) => {
      console.log('✅ Email sent successfully:', { to, messageId: info.messageId });
      return true;
    })
    .catch(err => {
      console.error('❌ Email send error:', err && err.message ? err.message : err);
      mailerInfo.lastError = err && err.message ? err.message : String(err);
      return false;
    });
}

module.exports = {
  sendEmailAsync,
  verifyTransporter,
  getMailerInfo: () => ({ ...mailerInfo, configured }),
};
