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
  lastVerifiedAt: null,
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
      
      // Gmail with App Password - explicit SMTP configuration
      const gmailPort = Number(process.env.GMAIL_SMTP_PORT || 465); // 465 (SSL) preferred; 587 (STARTTLS) alternative
      const gmailSecure = String(process.env.GMAIL_SMTP_SECURE || (gmailPort === 465 ? 'true' : 'false')).toLowerCase() === 'true';

      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: gmailPort,
        secure: gmailSecure, // true for 465, false for 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: normalizedPass
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        // Timeouts to fail fast on blocked egress
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
        tls: {
          // Ensure correct SNI and allow modern TLS
          servername: 'smtp.gmail.com'
        }
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
    mailerInfo.lastVerifiedAt = new Date().toISOString();
    return true;
  } catch (e) {
    const errorMsg = e && e.message ? e.message : String(e);
    console.warn('❌ Mailer verify failed:', errorMsg);
    mailerInfo.lastError = errorMsg;
    // If Gmail is configured and verify timed out, try fallback port (465 <-> 587) once
    try {
      const isGmail = mailerInfo.method === 'GMAIL_SERVICE' || (transporter?.options?.host === 'smtp.gmail.com');
      if (isGmail && /timed?\s*out/i.test(errorMsg)) {
        const currentPort = transporter.options.port;
        const fallbackPort = currentPort === 465 ? 587 : 465;
        const fallbackSecure = fallbackPort === 465;
        console.warn(`🔁 Gmail verify timeout on port ${currentPort}. Retrying with port ${fallbackPort} (secure=${fallbackSecure})...`);
        transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: fallbackPort,
          secure: fallbackSecure,
          auth: transporter.options.auth,
          pool: transporter.options.pool,
          maxConnections: transporter.options.maxConnections,
          maxMessages: transporter.options.maxMessages,
          rateDelta: transporter.options.rateDelta,
          rateLimit: transporter.options.rateLimit,
          connectionTimeout: transporter.options.connectionTimeout,
          greetingTimeout: transporter.options.greetingTimeout,
          socketTimeout: transporter.options.socketTimeout,
          tls: { servername: 'smtp.gmail.com' }
        });
        await transporter.verify();
        console.log('✅ Email transporter verified successfully on fallback port', fallbackPort);
        mailerInfo.lastError = null;
        mailerInfo.lastVerifiedAt = new Date().toISOString();
        return true;
      }
    } catch (fallbackErr) {
      console.warn('❌ Fallback verify failed:', fallbackErr?.message || String(fallbackErr));
      mailerInfo.lastError = fallbackErr?.message || String(fallbackErr);
    }
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

  // Determine a safe 'from' address. Prefer explicit option, then MAIL_FROM,
  // then the authenticated user on the transport. Avoid constructing
  // "<undefined>" which causes SMTP rejections.
  const transportAuthUser = (transporter && transporter.options && transporter.options.auth && transporter.options.auth.user) || process.env.EMAIL_USER || process.env.SMTP_USER;
  const computedFrom = options.from 
    || process.env.MAIL_FROM 
    || (transportAuthUser ? `"J & J Secondary School" <${transportAuthUser}>` : undefined);
  if (!computedFrom) {
    console.error('❌ No valid FROM address could be determined. Set MAIL_FROM or EMAIL_USER/SMTP_USER.');
    return Promise.resolve(false);
  }
  const from = computedFrom;
  mailerInfo.from = from;
  
  // Proactively verify the transporter if we haven't done so or last verify failed
  if (!mailerInfo.lastVerifiedAt || mailerInfo.lastError) {
    const ok = await verifyTransporter();
    if (!ok) {
      console.error('❌ Email transport not ready; aborting send. Last error:', mailerInfo.lastError);
      return false;
    }
  }
  
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
          errorMsg.includes('AUTH') ||
          errorMsg.includes('Bad sender address syntax') ||
          errorMsg.includes('Sender address rejected')) {
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
