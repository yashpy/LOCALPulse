const express = require('express');
const router = express.Router();
const { sendBulkSMS } = require('../services/twilio');
const { generateSmsPromo } = require('../services/openai');
const axios = require('axios');

/**
 * POST /api/automation/sms-promo
 * Generate + send an AI SMS promotion to opted-in customers.
 * Body: { businessName, businessType, phoneNumbers, slowPeriod }
 */
router.post('/sms-promo', async (req, res, next) => {
  try {
    const { businessName, businessType, phoneNumbers, slowPeriod } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'phoneNumbers array is required' });
    }

    // Generate AI promo message
    const message = await generateSmsPromo({ businessName, businessType, slowPeriod });

    // Send to all opted-in numbers
    const result = await sendBulkSMS(phoneNumbers, message);

    res.json({
      success: true,
      message,
      stats: result,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/automation/trigger-n8n
 * Trigger an n8n workflow webhook.
 * Body: { workflowName, payload }
 */
router.post('/trigger-n8n', async (req, res, next) => {
  try {
    const { workflowName, payload } = req.body;

    const webhookUrl = `${process.env.N8N_WEBHOOK_URL}/webhook/${workflowName}`;

    const response = await axios.post(webhookUrl, payload || {});

    res.json({
      success: true,
      workflowName,
      n8nResponse: response.data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/automation/status
 * Check which automations are active for a business.
 */
router.get('/status', async (req, res) => {
  // In production, this would query Supabase for per-business automation settings
  res.json({
    automations: [
      { id: 'review-responder', name: 'Auto Review Responder', active: true, lastRun: new Date().toISOString() },
      { id: 'weekly-digest', name: 'Weekly Insights Email', active: true, lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'slow-hours-sms', name: 'Slow Hours SMS Promo', active: false, lastRun: null },
    ],
  });
});

module.exports = router;
