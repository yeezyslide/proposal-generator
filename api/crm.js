// Notion CRM API endpoint
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const CRM_DATABASE_ID = '1ff74c26-672f-8081-91b3-f71f280e06c8';

// Simple auth check
function checkAuth(req) {
  const token = req.headers['x-auth-token'];
  const validToken = process.env.AUTH_TOKEN || 'wenlaunch2024';
  return token === validToken;
}

async function notionFetch(endpoint, options = {}) {
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return res.json();
}

// Parse Notion page to clean object
function parseNotionPage(page) {
  const props = page.properties;
  return {
    id: page.id,
    name: props.Name?.title?.[0]?.plain_text || '',
    company: props.Company?.rich_text?.[0]?.plain_text || '',
    email: props.Email?.email || '',
    status: props.Status?.status?.name || 'Contacted',
    dealValue: props['Deal Value']?.rich_text?.[0]?.plain_text || '',
    leadSource: props['Lead Source']?.select?.name || '',
    discoveryCall: props['Discovery Call']?.date?.start || '',
    summary: props.Summary?.rich_text?.[0]?.plain_text || '',
    communication: props.Communication?.rich_text?.[0]?.plain_text || '',
    createdTime: page.created_time,
    lastEdited: page.last_edited_time
  };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - Fetch all CRM entries
    if (req.method === 'GET') {
      const data = await notionFetch(`/databases/${CRM_DATABASE_ID}/query`, {
        method: 'POST',
        body: JSON.stringify({
          sorts: [{ property: 'Name', direction: 'ascending' }],
          page_size: 100
        })
      });

      const clients = data.results.map(parseNotionPage);
      
      // Get status options for kanban columns
      const dbInfo = await notionFetch(`/databases/${CRM_DATABASE_ID}`);
      const statusOptions = dbInfo.properties?.Status?.status?.options || [];
      const leadSourceOptions = dbInfo.properties?.['Lead Source']?.select?.options || [];

      return res.status(200).json({
        clients,
        statusOptions: statusOptions.map(s => ({ name: s.name, color: s.color })),
        leadSourceOptions: leadSourceOptions.map(s => ({ name: s.name, color: s.color }))
      });
    }

    // POST - Create new CRM entry
    if (req.method === 'POST') {
      const { name, company, email, status, dealValue, leadSource, summary } = req.body;

      const properties = {
        Name: { title: [{ text: { content: name || '' } }] },
        Company: { rich_text: [{ text: { content: company || '' } }] },
        Status: { status: { name: status || 'Contacted' } }
      };

      if (email) properties.Email = { email };
      if (dealValue) properties['Deal Value'] = { rich_text: [{ text: { content: dealValue } }] };
      if (leadSource) properties['Lead Source'] = { select: { name: leadSource } };
      if (summary) properties.Summary = { rich_text: [{ text: { content: summary } }] };

      const data = await notionFetch('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: CRM_DATABASE_ID },
          properties
        })
      });

      return res.status(201).json(parseNotionPage(data));
    }

    // PATCH - Update CRM entry
    if (req.method === 'PATCH') {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing page ID' });
      }

      const properties = {};

      if (updates.name !== undefined) {
        properties.Name = { title: [{ text: { content: updates.name } }] };
      }
      if (updates.company !== undefined) {
        properties.Company = { rich_text: [{ text: { content: updates.company } }] };
      }
      if (updates.email !== undefined) {
        properties.Email = updates.email ? { email: updates.email } : { email: null };
      }
      if (updates.status !== undefined) {
        properties.Status = { status: { name: updates.status } };
      }
      if (updates.dealValue !== undefined) {
        properties['Deal Value'] = { rich_text: [{ text: { content: updates.dealValue } }] };
      }
      if (updates.leadSource !== undefined) {
        properties['Lead Source'] = updates.leadSource ? { select: { name: updates.leadSource } } : { select: null };
      }
      if (updates.summary !== undefined) {
        properties.Summary = { rich_text: [{ text: { content: updates.summary } }] };
      }
      if (updates.communication !== undefined) {
        properties.Communication = { rich_text: [{ text: { content: updates.communication } }] };
      }
      if (updates.discoveryCall !== undefined) {
        properties['Discovery Call'] = updates.discoveryCall ? { date: { start: updates.discoveryCall } } : { date: null };
      }

      const data = await notionFetch(`/pages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties })
      });

      return res.status(200).json(parseNotionPage(data));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('CRM API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
