// Express app config, no .listen() here — shared by local dev (server.js)
// and the Vercel serverless entry (api/index.js).
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/businesses');
const chatbotRoutes = require('./routes/chatbot');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/businesses', chatbotRoutes); // adds /:id/chat under the same base path

app.get('/health', (req, res) => res.json({ ok: true }));

// Local dev only — on Vercel the frontend/ folder is served directly as a
// static build, not through Express (see vercel.json).
if (process.env.VERCEL !== '1') {
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
}

module.exports = app;
