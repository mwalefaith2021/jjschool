const { google } = require('googleapis');
const GmailScopes = ['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.readonly'];

let oauth2Client = null;
let configured = false;
let mailerInfo = {
  configured: false,
  method: 'GMAIL_API',
  from: null,
  lastError: null,
  lastVerifiedAt: null,
  tokenExpiresAt: null,
};

function initGmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_SENDER) {
    console.warn('⚠️ Missing Gmail API env vars (GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN/GMAIL_SENDER). Email disabled.');
    configured = false;
    mailerInfo.configured = false;
    return;
  }
  oauth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  configured = true;
  mailerInfo.configured = true;
  mailerInfo.from = GMAIL_SENDER;
  console.log('✅ Gmail API mailer initialized (OAuth2)');
}

initGmailClient();

async function getAccessToken() {
  if (!oauth2Client) return null;
  try {
    const { token, res } = await oauth2Client.getAccessToken();
    if (res?.data?.expires_in) {
      mailerInfo.tokenExpiresAt = new Date(Date.now() + (res.data.expires_in * 1000)).toISOString();
    }
    return token;
  } catch (e) {
    mailerInfo.lastError = e.message;
    console.error('❌ Failed to obtain Gmail access token:', e.message);
    return null;
  }
}

async function verifyTransporter() { // name retained for compatibility
  if (!configured) return false;
  try {
    console.log('🔍 Verifying Gmail API credentials...');
    const token = await getAccessToken();
    if (!token) return false;
    // Verify granted scopes on the access token
    let scopes = [];
    try {
      const info = await oauth2Client.getTokenInfo(token);
      // getTokenInfo returns either a space-delimited string or an array depending on lib version
      const scopeStr = Array.isArray(info.scopes) ? info.scopes.join(' ') : (info.scope || '');
      scopes = Array.isArray(info.scopes) ? info.scopes : scopeStr.split(/\s+/).filter(Boolean);
    } catch (e) {
      // If token info fails, surface the error but continue to try a minimal API if possible
      console.warn('⚠️ Could not retrieve token info to check scopes:', e.message);
    }

    const hasSendScope = scopes.length === 0 || scopes.includes('https://www.googleapis.com/auth/gmail.send');
    if (!hasSendScope) {
      const msg = 'Access token/refresh token missing required gmail.send scope';
      mailerInfo.lastError = msg;
      console.error('❌ Gmail API verify failed:', msg);
      return false;
    }

    // Optionally fetch profile only if gmail.readonly is present, but do not fail if it's missing
    if (scopes.includes('https://www.googleapis.com/auth/gmail.readonly')) {
      try {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        mailerInfo.from = process.env.GMAIL_SENDER || profile.data.emailAddress || mailerInfo.from;
        console.log('✅ Gmail API verified for:', profile.data.emailAddress);
      } catch (e) {
        console.warn('⚠️ Gmail profile fetch skipped/failed (read scope not granted or API error):', e.message);
      }
    }

    mailerInfo.lastVerifiedAt = new Date().toISOString();
    mailerInfo.lastError = null;
    return true;
  } catch (e) {
    mailerInfo.lastError = e.message;
    console.error('❌ Gmail API verify failed:', e.message);
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

// Build raw RFC 2822 email and send through Gmail API
function buildMime({ from, to, subject, html, text, attachments = [] }) {
  const boundary = '----=_Part_JJSchool_' + Date.now();
  const mixedBoundary = '----=_Mixed_JJSchool_' + (Date.now() + 1);
  const safeSubject = subject.replace(/\r|\n/g, ' ').trim();
  const plain = (text || html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g,' ')).trim();

  // RFC 2047 encode non-ASCII in Subject using UTF-8 Base64
  function encodeHeaderUTF8(val) {
    if (/^[\x00-\x7F]*$/.test(val)) return val; // ASCII only
    const b64 = Buffer.from(val, 'utf8').toString('base64');
    return `=?UTF-8?B?${b64}?=`;
  }

  // Wrap base64 content at 76 chars per line per MIME recommendations
  function wrapBase64(b64) {
    return b64.replace(/.{1,76}/g, m => m + '\r\n').trim() + '\r\n';
  }

  const encodedSubject = encodeHeaderUTF8(safeSubject);
  const plainB64 = wrapBase64(Buffer.from(plain, 'utf8').toString('base64'));
  const htmlB64 = wrapBase64(Buffer.from(html, 'utf8').toString('base64'));

  function detectMimeType(filename) {
    const ext = (filename || '').toLowerCase().split('.').pop();
    const map = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      csv: 'text/csv',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return map[ext] || 'application/octet-stream';
  }

  if (!attachments || attachments.length === 0) {
    return [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      plainB64,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      htmlB64,
      `--${boundary}--`,
      ''
    ].join('\r\n');
  }

  // Build multipart/mixed with inner multipart/alternative and attachments
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    plainB64,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64,
    `--${boundary}--`
  ];

  for (const att of attachments) {
    if (!att || !att.content) continue;
    const filename = att.filename || 'attachment';
    const ctype = att.contentType || detectMimeType(filename);
    const contentBuf = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
    const contentB64 = wrapBase64(contentBuf.toString('base64'));
    lines.push(
      `--${mixedBoundary}`,
      `Content-Type: ${ctype}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      contentB64.trim(),
      ''
    );
  }

  lines.push(`--${mixedBoundary}--`, '');
  return lines.join('\r\n');
}

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function sendEmailAsync(to, subject, html, options = {}) {
  if (!configured) {
    console.warn('⚠️ Gmail API not configured; skipping email to', to);
    return false;
  }
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.error('❌ Invalid recipient email:', to);
    return false;
  }
  if (!mailerInfo.lastVerifiedAt || mailerInfo.lastError) {
    const ok = await verifyTransporter();
    if (!ok) {
      console.error('❌ Gmail API not verified; aborting send. Last error:', mailerInfo.lastError);
      return false;
    }
  }
  const from = options.from || process.env.GMAIL_SENDER || mailerInfo.from;
  if (!from) {
    console.error('❌ No FROM address (set GMAIL_SENDER).');
    return false;
  }
  mailerInfo.from = from;
  console.log('📧 (Gmail API) Sending email:', { to: to.trim(), subject, from });
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const raw = base64UrlEncode(buildMime({ 
      from, 
      to: to.trim(), 
      subject, 
      html, 
      text: options.text, 
      attachments: options.attachments || [] 
    }));
    const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    console.log('✅ Gmail API email sent:', { id: res.data.id, threadId: res.data.threadId });
    mailerInfo.lastError = null;
    return true;
  } catch (e) {
    mailerInfo.lastError = e.message;
    console.error('❌ Gmail API send failed:', e.message);
    return false;
  }
}

module.exports = {
  sendEmailAsync,
  verifyTransporter,
  getMailerInfo: () => ({ ...mailerInfo, configured }),
  createEmailTemplate,
};
