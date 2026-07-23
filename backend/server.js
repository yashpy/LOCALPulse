require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/businesses');

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);

// Basic error handler so a bad/missing key or DB error never crashes the
// process — it just returns a JSON error.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve the simple frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LOCALPulse backend running on http://localhost:${PORT}`);
});

module.exports = app;
