import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mdToPdf } from 'md-to-pdf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function calculateTotalDuration(timeline) {
  let totalWeeks = 0;
  for (const phase of timeline) {
    const match = phase.duration.match(/(\d+)/);
    if (match) {
      totalWeeks += parseInt(match[1]);
    }
  }
  return totalWeeks;
}

export function generateMarkdown(data, settings = {}) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const businessName = settings.businessName || 'Your Design Studio';
  const businessEmail = settings.businessEmail || 'hello@example.com';
  const businessPhone = settings.businessPhone || '';
  const projectTotal = data.project_total || 0;

  let md = `# Web Design Proposal

**For:** ${data.client_name}
**Date:** ${date}
**From:** ${businessName}

---

## Project Summary

${data.project_summary}

---

## Deliverables

`;

  for (const item of data.deliverables) {
    md += `### ${item.name}\n${item.description}\n\n`;
  }

  // Calculate total duration
  const totalWeeks = calculateTotalDuration(data.timeline);

  md += `---

## Project Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
`;

  for (const phase of data.timeline) {
    md += `| ${phase.phase} | ${phase.duration} | ${phase.description} |\n`;
  }

  md += `| **Total** | **${totalWeeks} weeks** | |

*Please note: We operate in a creative capacity, and project timelines are dependent on the client's cooperation, timely responses, and clear direction on project requirements. Delays in providing feedback, content, or assets may extend the timeline accordingly.*

---

## What We Need From You

`;

  for (const need of data.client_needs) {
    md += `- [ ] ${need}\n`;
  }

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

  md += `
---

## Investment

| Milestone | Percentage | Amount |
|-----------|------------|--------|
`;

  for (const milestone of data.payment_milestones) {
    const amount = Math.round((milestone.percentage / 100) * projectTotal);
    md += `| ${milestone.milestone} | ${milestone.percentage}% | ${formatCurrency(amount)} |\n`;
  }

  md += `
**Total Investment: ${formatCurrency(projectTotal)}**

---

## Terms & Conditions

- All content and assets must be provided by client before design phase begins
- Revisions are included within each phase; additional rounds may incur extra fees
- Timeline begins upon receipt of deposit and required materials
- Final files delivered upon receipt of final payment

---

**${businessName}**
${businessEmail}${businessPhone ? `  \n${businessPhone}` : ''}
`;

  return md;
}

export function saveMarkdown(markdown, outputPath) {
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  return outputPath;
}

export async function convertToPdf(markdownPath, pdfPath, settings = {}) {
  // Load logo as base64
  const logoPath = path.join(__dirname, 'logo.jpg');
  let logoBase64 = '';
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
  }

  const logoHtml = logoBase64
    ? `<img src="data:image/jpeg;base64,${logoBase64}" style="max-width: 180px; max-height: 80px; margin-bottom: 20px;" />`
    : '';

  const pdf = await mdToPdf(
    { path: markdownPath },
    {
      dest: pdfPath,
      pdf_options: {
        format: 'Letter',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        }
      },
      stylesheet: [],
      body_class: [],
      css: `
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #222;
        }
        h1 {
          color: #000;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        h2 {
          color: #000;
          margin-top: 30px;
        }
        h3 {
          color: #333;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #000;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f5f5f5;
        }
        hr {
          border: none;
          border-top: 1px solid #ddd;
          margin: 30px 0;
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin: 8px 0;
        }
        em {
          font-size: 0.9em;
          color: #555;
        }
        strong {
          color: #000;
        }
      `,
      document_title: 'Web Design Proposal',
      launch_options: {},
      md_file_encoding: 'utf-8',
      marked_options: {},
      pdf_options: {
        format: 'Letter',
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
        printBackground: true
      },
      basedir: __dirname,
      html_wrapper: (body) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #222;
              max-width: 100%;
              padding: 0;
              margin: 0;
            }
            .logo-header {
              margin-bottom: 30px;
            }
            h1 {
              color: #000;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-top: 0;
            }
            h2 {
              color: #000;
              margin-top: 30px;
            }
            h3 {
              color: #333;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #000;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #f5f5f5;
            }
            hr {
              border: none;
              border-top: 1px solid #ddd;
              margin: 30px 0;
            }
            ul {
              padding-left: 20px;
            }
            li {
              margin: 8px 0;
            }
            em {
              font-size: 0.9em;
              color: #555;
            }
            strong {
              color: #000;
            }
          </style>
        </head>
        <body>
          <div class="logo-header">${logoHtml}</div>
          ${body}
        </body>
        </html>
      `
    }
  );

  return pdfPath;
}
