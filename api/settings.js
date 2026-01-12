import { verifyToken } from './auth-check.js';

// Note: In serverless, we can't persist data without a database
// Settings are now stored client-side in localStorage

export default function handler(req, res) {
  const token = req.headers['x-auth-token'];
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Return empty - settings stored client-side
    res.json({});
  } else if (req.method === 'POST') {
    // Acknowledge but don't persist - client stores in localStorage
    res.json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
