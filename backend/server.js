// Local dev entry point: node server.js
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LOCALPulse backend running on http://localhost:${PORT}`);
});
