const nodemailer = require('nodemailer');
const twilio = require('twilio');
const fetch = require('node-fetch');

let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

let smsClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  smsClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// All three helpers below swallow their own errors and log instead of
// throwing — a broken SMTP/Twilio/n8n config should never break a request.

async function sendEmail({ to, subject, text }) {
  if (!mailer || !to) return;
  try {
    await mailer.sendMail({ from: process.env.SMTP_USER, to, subject, text });
  } catch (e) {
    console.error('sendEmail failed:', e.message);
  }
}

async function sendSms(body) {
  if (!smsClient || !process.env.ADMIN_PHONE || !process.env.TWILIO_PHONE_NUMBER) return;
  try {
    await smsClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.ADMIN_PHONE
    });
  } catch (e) {
    console.error('sendSms failed:', e.message);
  }
}

async function triggerN8n(event, payload) {
  if (!process.env.N8N_WEBHOOK_URL) return;
  try {
    await fetch(`${process.env.N8N_WEBHOOK_URL.replace(/\/$/, '')}/webhook/${event}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('triggerN8n failed:', e.message);
  }
}

module.exports = { sendEmail, sendSms, triggerN8n };
