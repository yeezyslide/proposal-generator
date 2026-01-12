import Anthropic from '@anthropic-ai/sdk';
import { verifyToken } from './auth-check.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers['x-auth-token'];
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { transcript, notes } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set' });
    }

    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are analyzing a client meeting transcript for a web design project.

Extract the following and respond ONLY with valid JSON (no markdown code blocks):

{
  "client_name": "extracted client/company name",
  "project_summary": "2-3 paragraph summary of the project goals and what we'll build",
  "deliverables": [
    { "name": "Deliverable name", "description": "What this includes" }
  ],
  "timeline": [
    { "phase": "Phase name", "duration": "X weeks", "description": "What happens" }
  ],
  "client_needs": ["List of things we need from the client"],
  "technical_requirements": {
    "cms": "CMS platform if mentioned",
    "integrations": ["List of integrations mentioned"],
    "features": ["Key features discussed"]
  }
}

Transcript:
${transcript}

${notes ? `Additional Notes:\n${notes}` : ''}

Respond with valid JSON only.`
      }]
    });

    let jsonText = message.content[0].text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
}
