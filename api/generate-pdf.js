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
    const data = req.body;

    // Build markdown
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let md = `# Web Design Proposal

**Client:** ${data.client_name}
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
      md += `- ${need}\n`;
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

    // Return markdown for client-side PDF generation
    res.json({
      markdown: md,
      client_name: data.client_name || 'proposal'
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
}
