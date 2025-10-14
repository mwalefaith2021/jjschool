# 🚨 URGENT: Fix Render Environment Variables

## Problem Identified

Your Render deployment has old **Resend** environment variables that are overriding your Gmail configuration:

```
MAIL_FROM=J & J Secondary onboarding@resend.dev
```

This is causing:
1. Emails to use Resend's sender address instead of Gmail
2. Connection timeouts because Resend credentials aren't configured
3. Gmail transport to fail

## ✅ Solution: Update Render Environment Variables

### Step 1: Login to Render Dashboard
Go to: https://dashboard.render.com

### Step 2: Select Your Backend Service
Click on: **jjschoolbackendserver** (or your service name)

### Step 3: Go to Environment Tab
Click on the **"Environment"** tab in the left sidebar

### Step 4: Remove Old Resend Variables
**DELETE** these variables if they exist:
- ❌ `MAIL_FROM` (with value containing "resend.dev")
- ❌ `RESEND_API_KEY`
- ❌ Any other Resend-related variables

### Step 5: Verify Gmail Variables Are Set

**KEEP/ADD** these variables:
- ✅ `EMAIL_USER` = `jandjschool.developer@gmail.com`
- ✅ `EMAIL_PASS` = `qhsz wsky sfmn wnqv`

**Optional (for custom sender name):**
- `MAIL_FROM` = `"J & J Secondary School" <jandjschool.developer@gmail.com>`
  
**Note:** Only add MAIL_FROM if you want a custom display name. Otherwise, leave it blank and the system will use EMAIL_USER.

### Step 6: Save and Redeploy

After updating environment variables:
1. Click **"Save Changes"**
2. Render will automatically redeploy
3. Wait for deployment to complete (~2-3 minutes)

### Step 7: Verify the Fix

Once redeployed, check the logs. You should see:

```
✅ Transporter configured via Gmail service
📧 Default sender: "J & J Secondary School" <jandjschool.developer@gmail.com>
```

When sending an email, you should see:

```
📧 Attempting to send email: {
  to: 'applicant@example.com',
  subject: '...',
  from: '"J & J Secondary School" <jandjschool.developer@gmail.com>',
  via: 'GMAIL_SERVICE'
}
✅ Email sent successfully
```

## 🔍 How to Access Render Environment Variables

### Method 1: Via Render Dashboard
1. Go to https://dashboard.render.com
2. Click your service name
3. Click "Environment" in left sidebar
4. See all environment variables
5. Click "Edit" to modify or delete

### Method 2: Via Render CLI (if installed)
```bash
render env list --service jjschoolbackendserver
```

## 📋 Complete Environment Variable Checklist

Your Render service should have these variables:

```env
# Server
PORT=3000  (optional, Render sets this automatically)

# Email (Gmail)
EMAIL_USER=jandjschool.developer@gmail.com
EMAIL_PASS=qhsz wsky sfmn wnqv

# Database
MONGODB_URL=mongodb+srv://mwalefaith:Faith200203@jjsec.jyx5jvn.mongodb.net/?retryWrites=true&w=majority&appName=JJSEC

# CORS
ALLOWED_ORIGINS=https://jjsecondaryschool.netlify.app

# Optional
MAIL_FROM="J & J Secondary School" <jandjschool.developer@gmail.com>
JWT_SECRET=your-secret-key-change-in-production
```

## ⚠️ DO NOT HAVE These Variables

```env
❌ RESEND_API_KEY
❌ MAIL_FROM=J & J Secondary onboarding@resend.dev
```

## 🧪 Quick Test After Fix

### 1. Check Email Health
```bash
curl https://jjschoolbackendserver.onrender.com/email-health
```

Expected:
```json
{
  "ok": true,
  "info": {
    "configured": true,
    "method": "GMAIL_SERVICE",
    "from": "\"J & J Secondary School\" <jandjschool.developer@gmail.com>"
  }
}
```

### 2. Send Test Email
```bash
curl -X POST https://jjschoolbackendserver.onrender.com/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

### 3. Submit Test Application
1. Go to your frontend
2. Submit an application with your personal email
3. Check your inbox for confirmation email from jandjschool.developer@gmail.com

## 🎯 Expected Log Output (After Fix)

```
🔧 Building email transporter...
🔐 Gmail credentials found for: jandjschool.developer@gmail.com
🔑 App password length (after normalize): 16 chars
✅ Transporter configured via Gmail service
📧 Default sender: "J & J Secondary School" <jandjschool.developer@gmail.com>

[When email is sent]
📧 Attempting to send email: {
  to: 'moseskatongo@outlook.com',
  subject: 'Application Received - 12',
  from: '"J & J Secondary School" <jandjschool.developer@gmail.com>',
  via: 'GMAIL_SERVICE'
}
✅ Email sent successfully (attempt 1/2): {
  to: 'moseskatongo@outlook.com',
  messageId: '<...@gmail.com>',
  response: '250 2.0.0 OK ...'
}
```

## 🚨 Common Mistakes to Avoid

1. ❌ Don't keep both Resend and Gmail variables
2. ❌ Don't use `MAIL_FROM` with resend.dev domain
3. ❌ Don't forget to save changes in Render
4. ❌ Don't skip the redeploy step

## ✅ Success Indicators

- [x] No "resend.dev" in sender address
- [x] `from:` shows Gmail address in logs
- [x] No connection timeout errors
- [x] Emails arrive in inbox within 1-2 minutes
- [x] `/email-health` returns `ok: true`

---

**Last Updated:** October 14, 2025  
**Issue:** Render using old Resend configuration instead of Gmail
