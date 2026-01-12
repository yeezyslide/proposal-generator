const SECRET = 'proposal-gen-secret-key';

export function verifyToken(token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [timestamp, secret] = decoded.split(':');
    if (secret !== SECRET) return false;
    // Token valid for 24 hours
    const age = Date.now() - parseInt(timestamp);
    return age < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function handler(req, res) {
  const token = req.headers['x-auth-token'];
  res.json({ authenticated: verifyToken(token) });
}
