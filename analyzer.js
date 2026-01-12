import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function analyzeTranscript(transcript, notes = '') {
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
  },
  "payment_milestones": [
    { "milestone": "Upon agreement", "percentage": 30 },
    { "milestone": "Upon design approval", "percentage": 40 },
    { "milestone": "Upon completion", "percentage": 30 }
  ]
}

Transcript:
${transcript}

${notes ? `Additional Notes:\n${notes}` : ''}

Respond with valid JSON only.`
    }]
  });

  const text = message.content[0].text;

  // Try to parse JSON, handle potential markdown code blocks
  let jsonText = text;
  if (text.includes('```')) {
    jsonText = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  return JSON.parse(jsonText);
}
