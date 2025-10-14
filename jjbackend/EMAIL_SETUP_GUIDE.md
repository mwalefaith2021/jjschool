# Email Configuration Guide - J & J Secondary School

## ✅ Current Configuration

### Gmail Account Setup
- **Email:** jandjschool.developer@gmail.com
- **App Password:** qhsz wsky sfmn wnqv (stored in `.env`)
- **Method:** Gmail Service (via Nodemailer)

## 🔧 What Was Updated

### 1. Enhanced Mailer Module (`modules/mailer.js`)
- ✅ Automatic space removal from Gmail App Password
- ✅ Retry logic (2 attempts) for failed sends
- ✅ Better error logging with emoji indicators
- ✅ Connection pooling for improved performance
- ✅ Email validation before sending
- ✅ Professional HTML email templates
- ✅ Plain text alternatives for better deliverability

### 2. Updated Email Templates
All emails now use professional branded templates with:
- School header with gradient background
- Structured content sections
- Highlighted important information
- Consistent footer with contact details
- Mobile-responsive HTML

### 3. Email Flows That Send to Applicants

#### Application Submission (`POST /api/submit-application`)
**Recipient:** Applicant's email from form (`req.body.email`)
**Subject:** Application Received - {ApplicationNumber}
**Content:**
- Confirmation of receipt
- Application number
- Date submitted
- Applying for which form
- Next steps information

#### Application Approved (`PUT /api/applications/:id/status` with status='accepted')
**Recipient:** `application.contactInfo.email`
**Subject:** 🎉 Application Approved - {ApplicationNumber}
**Content:**
- Congratulations message
- Application details
- Temporary OTP for verification
- Suggested username
- Next steps for account activation

#### Application Rejected (`PUT /api/applications/:id/status` with status='rejected')
**Recipient:** `application.contactInfo.email`
**Subject:** Application Decision - {ApplicationNumber}
**Content:**
- Professional rejection message
- Admin notes if provided
- Encouragement to reapply

#### Application Status Update (`PUT /api/applications/:id/status` with other status)
**Recipient:** `application.contactInfo.email`
**Subject:** Application Update - {ApplicationNumber}
**Content:**
- Status change notification
- Updated timestamp

#### Student Account Created (`POST /api/pending-signups/:id/approve`)
**Recipient:** `signup.email`
**Subject:** 🎓 Your J & J Student Account - Login Credentials
**Content:**
- Username
- Temporary password
- Security instructions
- How to change password
- Portal access instructions

#### Account Request Rejected (`POST /api/pending-signups/:id/reject`)
**Recipient:** `signup.email`
**Subject:** Account Request Update
**Content:**
- Rejection notification
- Reason if provided
- Contact information

#### Password Reset (`POST /api/users/:id/reset-password`)
**Recipient:** `user.email`
**Subject:** 🔐 Password Reset - J & J Student Portal
**Content:**
- New temporary password (OTP)
- Username reminder
- Security steps
- Password requirements

## 🧪 Testing Guide

### Step 1: Restart Your Backend Server
```bash
# If running locally
cd jjbackend
npm start

# If on Render.com or other hosting
# Push changes and trigger redeploy
```

### Step 2: Check Server Logs for Email Configuration
Look for these lines on startup:
```
🔧 Building email transporter...
🔐 Gmail credentials found for: jandjschool.developer@gmail.com
🔑 App password length (after normalize): 16 chars
✅ Transporter configured via Gmail service
📧 Default sender: jandjschool.developer@gmail.com
```

### Step 3: Verify Email Health
```bash
curl https://your-backend-url.com/email-health
```

Expected response:
```json
{
  "ok": true,
  "info": {
    "configured": true,
    "method": "GMAIL_SERVICE",
    "from": "jandjschool.developer@gmail.com",
    "lastError": null
  }
}
```

### Step 4: Send Test Email
```bash
curl -X POST https://your-backend-url.com/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-personal-email@example.com"}'
```

Check your inbox (and spam folder) for the test email.

### Step 5: Test Real Application Flow

1. **Submit an Application:**
   - Go to frontend admissions form
   - Fill out with a real email address you can check
   - Submit the form
   - Check server logs for: `📧 Attempting to send email:` and `✅ Email sent successfully:`
   - Check the applicant's email inbox

2. **Approve an Application (Admin Dashboard):**
   - Login as admin
   - Go to Applications section
   - Find a pending application
   - Click Approve
   - Check server logs for email send confirmation
   - Check the applicant's email for approval notification

3. **Approve Pending Signup (Admin Dashboard):**
   - Go to Pending Signups section
   - Approve a signup
   - Check the email for account credentials

## 📊 Email Send Logs

When an email is sent, you'll see these logs:

### Success:
```
📧 Attempting to send email: { to: 'student@example.com', subject: '...', from: '...', via: 'GMAIL_SERVICE' }
✅ Email sent successfully (attempt 1/2): { to: 'student@example.com', messageId: '<...@gmail.com>', response: '250 ...' }
```

### Failure:
```
📧 Attempting to send email: { to: 'student@example.com', subject: '...', from: '...', via: 'GMAIL_SERVICE' }
❌ Email send error (attempt 1/2): { to: 'student@example.com', error: 'Invalid login', code: 'EAUTH' }
🚫 Authentication error - stopping retry attempts
```

## 🐛 Troubleshooting

### Issue: "Invalid login" or "Username and Password not accepted"

**Solution:**
1. Verify 2-Step Verification is enabled on jandjschool.developer@gmail.com
2. Generate a new App Password:
   - Go to https://myaccount.google.com/security
   - Search "App passwords"
   - Create new → Mail → Other (Custom name)
   - Copy the 16-character password (spaces are OK)
3. Update `.env` with new password
4. Restart server

### Issue: Emails not in inbox

**Check:**
1. Spam/Junk folder
2. Gmail Sent folder for jandjschool.developer@gmail.com
3. Server logs show `✅ Email sent successfully` with messageId
4. Correct email address in application form

### Issue: "Email not configured"

**Solution:**
1. Verify `.env` file exists in `jjbackend/` folder
2. Check `EMAIL_USER` and `EMAIL_PASS` are set
3. Ensure `require('dotenv').config()` is at top of `server.js`
4. Restart server completely

### Issue: Emails delayed or slow

**Solution:**
- This is normal with Gmail's rate limiting
- The mailer uses connection pooling (5 max connections)
- Rate limit: 5 emails per second
- Retry logic handles temporary failures

## 📧 Email Recipient Summary

| Trigger | Recipient Email Source | Variable Name |
|---------|----------------------|---------------|
| Application submitted | From form | `req.body.email` |
| Application approved/rejected | From saved application | `application.contactInfo.email` |
| Signup approved | From pending signup | `signup.email` |
| Signup rejected | From pending signup | `signup.email` |
| Password reset | From user record | `user.email` |

**All emails go to the addresses provided by applicants during the application process.**

## 🔒 Security Notes

1. **Never commit `.env` file to git**
2. Keep App Password secure
3. Gmail App Passwords expire if not used for 6 months
4. Monitor Gmail's "Security" page for suspicious activity
5. Consider using a dedicated school email domain in production

## 📝 Production Deployment Checklist

- [ ] `.env` file configured on hosting platform (Render, Heroku, etc.)
- [ ] `EMAIL_USER` set to jandjschool.developer@gmail.com
- [ ] `EMAIL_PASS` set to valid Gmail App Password
- [ ] Server restarted after environment changes
- [ ] `/email-health` returns `ok: true`
- [ ] Test email sent and received
- [ ] Test application submission → email received
- [ ] Test application approval → email received
- [ ] Monitor logs for email send confirmations

## 🎉 Expected Behavior

When everything is working correctly:

1. **User submits application** → Receives confirmation email immediately
2. **Admin approves application** → Applicant receives approval email with OTP
3. **Admin approves signup** → Student receives login credentials
4. **Admin resets password** → Student receives new temporary password
5. **All emails** have professional formatting and school branding
6. **Server logs** show green checkmarks (✅) for successful sends
7. **Email health endpoint** returns `ok: true`

---

## 🆘 Need Help?

If emails still aren't working after following this guide:

1. Check server startup logs for the 🔧/🔐/✅ messages
2. Run `/email-health` endpoint and share the response
3. Check a recent email send log (after submitting an application)
4. Verify the Gmail account can send emails manually
5. Check Gmail quota (you can send ~500 emails/day with free Gmail)

Last Updated: October 14, 2025
