const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send an SMS message to a single number.
 * @param {string} to - Phone number e.g. "+14805551234"
 * @param {string} message - SMS body (keep under 160 chars)
 * @returns {object} Twilio message SID
 */
async function sendSMS(to, message) {
  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });

  console.log(`📱 SMS sent to ${to} — SID: ${result.sid}`);
  return { sid: result.sid, status: result.status };
}

/**
 * Send a bulk SMS promotion to a list of opted-in customers.
 * @param {string[]} phoneNumbers - Array of opted-in customer numbers
 * @param {string} message - Promo SMS text
 * @returns {object[]} Array of send results
 */
async function sendBulkSMS(phoneNumbers, message) {
  const results = await Promise.allSettled(
    phoneNumbers.map((num) => sendSMS(num, message))
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`📊 Bulk SMS: ${sent} sent, ${failed} failed`);
  return { sent, failed, total: phoneNumbers.length };
}

module.exports = { sendSMS, sendBulkSMS };
