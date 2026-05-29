/**
 * Simple API key authentication middleware.
 * Pass your key as: Authorization: Bearer YOUR_KEY
 * or as query param: ?api_key=YOUR_KEY
 */
const requireApiKey = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const queryKey = req.query.api_key;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryKey;

  if (!token || token !== process.env.APP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing API key' });
  }

  next();
};

module.exports = { requireApiKey };
