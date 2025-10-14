#!/usr/bin/env node
/**
 * Script: generateGmailToken.js
 * Purpose: Launches a local OAuth2 flow to obtain a Gmail API refresh token.
 * Usage:
 *   1. Set env vars (or create a temporary .env) with:
 *        GMAIL_CLIENT_ID=...
 *        GMAIL_CLIENT_SECRET=...
 *        GMAIL_REDIRECT_URI=http://localhost:5173/oauth2/callback   (or http://localhost:3001/callback)
 *      If GMAIL_REDIRECT_URI not provided, we default to http://localhost:3001/callback
 *   2. Run: node scripts/generateGmailToken.js
 *   3. Open the printed authorization URL in a browser, grant access.
 *   4. Copy the full redirected URL and paste it back when prompted.
 *   5. Script prints the refresh token and a snippet to add to your .env.
 */

require('dotenv').config();
const readline = require('readline');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in environment.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forces refresh token each run
  scope: SCOPES
});

console.log('--- Gmail OAuth2 Refresh Token Generator ---');
console.log('Open this URL in your browser and authorize:');
console.log(authUrl + '\n');
console.log('After granting access, you will be redirected. Copy the FULL redirect URL and paste it below.');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste redirect URL: ', async (redirectUrl) => {
  try {
    const urlObj = new URL(redirectUrl.trim());
    const code = urlObj.searchParams.get('code');
    if (!code) {
      console.error('No code param found in the provided URL.');
      process.exit(1);
    }
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\nSuccess! Tokens received.');
    if (!tokens.refresh_token) {
      console.warn('No refresh_token returned. You may have previously granted access. Try adding &prompt=consent or revoke previous grants.');
    }
    console.log('Access Token (short-lived):', tokens.access_token || '(not provided)');
    console.log('Refresh Token (long-lived):', tokens.refresh_token || '(not provided)');
    console.log('\nAdd to your .env:');
    if (tokens.refresh_token) {
      console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
    }
    console.log('\nRequired runtime env vars (example):');
    console.log('GMAIL_CLIENT_ID=' + CLIENT_ID);
    console.log('GMAIL_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GMAIL_REFRESH_TOKEN=<<above refresh token>>');
    console.log('GMAIL_SENDER="Your Name" <youraddress@gmail.com>');
    rl.close();
  } catch (e) {
    console.error('Error exchanging code for tokens:', e.message);
    rl.close();
    process.exit(1);
  }
});
