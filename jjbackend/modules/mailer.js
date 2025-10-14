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
    console.log('🔧 Building email transporter...');
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
      
      // Gmail with App Password - optimized configuration
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { 
          user: process.env.EMAIL_USER, 
          pass: normalizedPass 
        },
        // Additional Gmail-specific settings for better reliability
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
      });
      configured = true;
      mailerInfo.method = 'GMAIL_SERVICE';
      mailerInfo.from = process.env.EMAIL_USER;
      console.log('✅ Transporter configured via Gmail service');
      console.log(`📧 Default sender: ${process.env.EMAIL_USER}`);
      return;
    }
    console.warn('⚠️ No email credentials found in environment');
    configured = false;
    mailerInfo.method = 'none';
  } catch (e) {
    console.error('❌ Mailer setup error:', e.message);
    configured = false;
    mailerInfo.method = 'error';
    mailerInfo.lastError = e.message;
  }
}

buildTransporter();

async function verifyTransporter() {
  if (!transporter) {
    console.warn('⚠️ No transporter configured for verification');
    return false;
  }
  try {
    console.log('🔍 Verifying email transporter...');
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');
    mailerInfo.lastError = null;
    return true;
  } catch (e) {
    const errorMsg = e && e.message ? e.message : String(e);
    console.warn('❌ Mailer verify failed:', errorMsg);
    mailerInfo.lastError = errorMsg;
    return false;
  }
}

// Helper function to create consistent email templates
function createEmailTemplate(content, title = 'J & J Secondary School') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #165022 0%, #2d5016 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #2d5016; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .highlight { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>J & J Secondary School</h1>
    <p style="margin: 0; opacity: 0.9;">Excellence in Education</p>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p><strong>J & J Secondary School</strong></p>
    <p>Admissions Office | jandjschool.developer@gmail.com</p>
    <p style="font-size: 0.85em; color: #999;">This is an automated message. Please do not reply directly to this email.</p>
  </div>
</body>
</html>
  `.trim();
}

// Fire-and-forget email sender with retry logic. Logs failures but never throws to callers.
async function sendEmailAsync(to, subject, html, options = {}) {
  if (!configured || !transporter) {
    console.warn('⚠️ Email not configured; skipping email to', to);
    return Promise.resolve(false);
  }

  // Validate recipient email
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.error('❌ Invalid recipient email address:', to);
    return Promise.resolve(false);
  }

  const from = options.from || process.env.MAIL_FROM || `"J & J Secondary School" <${process.env.EMAIL_USER}>` || process.env.EMAIL_USER;
  mailerInfo.from = from || mailerInfo.from;
  
  const mailOptions = { 
    from, 
    to: to.trim(), 
    subject, 
    html,
    // Add text alternative for better deliverability
    text: html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
  };
  
  console.log('📧 Attempting to send email:', { 
    to: to.trim(), 
    subject, 
    from, 
    via: mailerInfo.method 
  });

  // Retry logic: try up to 2 times
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully (attempt ${attempt}/${maxRetries}):`, { 
        to: to.trim(), 
        messageId: info.messageId,
        response: info.response 
      });
      mailerInfo.lastError = null; // Clear any previous errors
      return true;
    } catch (err) {
      const errorMsg = err && err.message ? err.message : String(err);
      console.error(`❌ Email send error (attempt ${attempt}/${maxRetries}):`, {
        to: to.trim(),
        error: errorMsg,
        code: err.code,
        command: err.command
      });
      mailerInfo.lastError = errorMsg;
      
      // Don't retry on authentication or configuration errors
      if (errorMsg.includes('Invalid login') || 
          errorMsg.includes('Username and Password not accepted') ||
          errorMsg.includes('AUTH')) {
        console.error('🚫 Authentication error - stopping retry attempts');
        return false;
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }
  }
  
  return false;
}

module.exports = {
  sendEmailAsync,
  verifyTransporter,
  getMailerInfo: () => ({ ...mailerInfo, configured }),
  createEmailTemplate,
};
