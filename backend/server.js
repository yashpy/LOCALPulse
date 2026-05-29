require('dotenv').config();
const express = require('express');
const cors = require('cors');

const reviewsRouter = require('./routes/reviews');
const insightsRouter = require('./routes/insights');
const automationRouter = require('./routes/automation');
const businessesRouter = require('./routes/businesses');
const { requireApiKey } = require('./middleware/auth');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (same-origin, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LocalPulse API', version: '1.0.0' });
});

// ─── Routes (protected by API key) ───────────────────────────────────────────
app.use('/api/businesses', requireApiKey, businessesRouter);
app.use('/api/reviews', requireApiKey, reviewsRouter);
app.use('/api/insights', requireApiKey, insightsRouter);
app.use('/api/automation', requireApiKey, automationRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ─── Local dev: listen on port. Vercel: export as handler. ───────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 LocalPulse API running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: open frontend/index.html in your browser`);
  });
}

module.exports = app;
