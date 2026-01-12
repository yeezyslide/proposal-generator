const PASSWORD = '1234';
const SECRET = 'proposal-gen-secret-key';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  if (password === PASSWORD) {
    // Create a simple token (timestamp + hash)
    const timestamp = Date.now();
    const token = Buffer.from(`${timestamp}:${SECRET}`).toString('base64');
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
}
