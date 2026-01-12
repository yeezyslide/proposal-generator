import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { mdToPdf } from 'md-to-pdf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD = '1234';

// Simple session storage (in production, use a proper session store)
const sessions = new Set();

app.use(express.json({ limit: '10mb' }));

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (token && sessions.has(token)) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Check auth status
app.get('/api/auth-check', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token && sessions.has(token)) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Serve static files (login page accessible without auth)
app.use(express.static(path.join(__dirname, 'public')));

// Ensure output directory exists
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Load logo as base64
function getLogoBase64() {
  const logoPath = path.join(__dirname, 'logo.jpg');
  if (fs.existsSync(logoPath)) {
    return fs.readFileSync(logoPath).toString('base64');
  }
  return '';
}

// Analyze transcript with Claude (protected)
app.post('/api/analyze', requireAuth, async (req, res) => {
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
});

// Generate PDF (protected)
app.post('/api/generate-pdf', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const logoBase64 = getLogoBase64();

    // Build markdown
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Logo HTML for markdown
    const logoMd = logoBase64
      ? `<img src="data:image/jpeg;base64,${logoBase64}" style="max-width: 180px; max-height: 80px; margin-bottom: 20px;" />\n\n`
      : '';

    let md = `${logoMd}# Web Design Proposal

**For:** ${data.client_name}
**Date:** ${date}
**From:** Wenlaunch Studios

---

## Project Summary

${data.project_summary}

---

## Deliverables

`;

    for (const item of data.deliverables || []) {
      md += `### ${item.name}\n${item.description}\n\n`;
    }

    md += `---

## Project Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
`;

    for (const phase of data.timeline || []) {
      md += `| ${phase.phase} | ${phase.duration} | ${phase.description} |\n`;
    }

    md += `| **Total** | **${data.timeline_total || '0 days'}** | |

*Please note: We operate in a creative capacity, and project timelines are dependent on the client's cooperation, timely responses, and clear direction on project requirements. Delays in providing feedback, content, or assets may extend the timeline accordingly.*

---

## What We Need From You

`;

    for (const need of data.client_needs || []) {
      md += `- [ ] ${need}\n`;
    }

    if (data.technical_requirements) {
      md += `
---

## Technical Requirements

`;
      if (data.technical_requirements.cms) {
        md += `**CMS:** ${data.technical_requirements.cms}\n\n`;
      }
      if (data.technical_requirements.integrations?.length) {
        md += `**Integrations:**\n`;
        for (const int of data.technical_requirements.integrations) {
          md += `- ${int}\n`;
        }
        md += '\n';
      }
      if (data.technical_requirements.features?.length) {
        md += `**Key Features:**\n`;
        for (const feat of data.technical_requirements.features) {
          md += `- ${feat}\n`;
        }
      }
    }

    // Calculate total investment
    let totalInvestment = 0;
    for (const m of data.milestones || []) {
      totalInvestment += parseFloat(m.amount) || 0;
    }

    md += `
---

## Investment

| Milestone | Amount |
|-----------|--------|
`;

    for (const m of data.milestones || []) {
      const amount = parseFloat(m.amount) || 0;
      md += `| ${m.name} | $${amount.toLocaleString()} |\n`;
    }

    md += `
**Total Investment: $${totalInvestment.toLocaleString()}**

---

## Terms & Conditions

${data.terms || `- All content and assets must be provided by client before design phase begins
- Revisions are included within each phase; additional rounds may incur extra fees
- Timeline begins upon receipt of deposit and required materials
- Final files delivered upon receipt of final payment`}

---

**Wenlaunch Studios**
${data.business_email || ''}${data.business_phone ? `  \n${data.business_phone}` : ''}
`;

    // Save markdown temporarily
    const timestamp = Date.now();
    const safeName = (data.client_name || 'proposal').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const mdPath = path.join(outputDir, `proposal-${safeName}-${timestamp}.md`);
    const pdfPath = path.join(outputDir, `proposal-${safeName}-${timestamp}.pdf`);

    fs.writeFileSync(mdPath, md);

    // Generate PDF
    await mdToPdf(
      { path: mdPath },
      {
        dest: pdfPath,
        pdf_options: {
          format: 'Letter',
          margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
          printBackground: true
        },
        css: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #222;
          }
          img { max-width: 180px; max-height: 80px; margin-bottom: 20px; }
          h1 { color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 0; }
          h2 { color: #000; margin-top: 30px; }
          h3 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
          th { background-color: #000; color: white; }
          tr:nth-child(even) { background-color: #f5f5f5; }
          hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
          ul { padding-left: 20px; }
          li { margin: 8px 0; }
          em { font-size: 0.9em; color: #555; }
          strong { color: #000; }
        `
      }
    );

    // Send PDF file
    res.download(pdfPath, `proposal-${safeName}.pdf`);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settings endpoints
const settingsPath = path.join(__dirname, 'settings.json');

app.get('/api/settings', requireAuth, (req, res) => {
  if (fs.existsSync(settingsPath)) {
    res.json(JSON.parse(fs.readFileSync(settingsPath, 'utf-8')));
  } else {
    res.json({});
  }
});

app.post('/api/settings', requireAuth, (req, res) => {
  fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`\n  Proposal Generator running at http://localhost:${PORT}\n`);
});
