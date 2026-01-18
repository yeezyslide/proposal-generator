// YouTube RSS API endpoint with CORS support
// Fetches YouTube RSS feed and converts to JSON

export default async function handler(req, res) {
  // Set CORS headers to allow requests from Framer
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins, or specify: 'https://doronsupply.framer.ai'
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channelId, format = 'json', max = '1' } = req.query;

  if (!channelId) {
    return res.status(400).json({ error: 'channelId is required' });
  }

  try {
    // Fetch YouTube RSS feed
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(rssUrl);
    
    if (!response.ok) {
      throw new Error(`YouTube RSS returned ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse XML to extract video entries
    const entries = parseYouTubeRSS(xmlText, parseInt(max, 10));

    if (format === 'json') {
      return res.status(200).json({ entries });
    } else {
      return res.status(200).send(xmlText);
    }
  } catch (error) {
    console.error('YouTube RSS error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch YouTube RSS feed' 
    });
  }
}

// Simple XML parser for YouTube RSS feed
function parseYouTubeRSS(xml, maxEntries) {
  const entries = [];
  
  // Match all entry elements
  const entryRegex = /<entry>(.*?)<\/entry>/gs;
  const matches = xml.matchAll(entryRegex);

  for (const match of matches) {
    if (entries.length >= maxEntries) break;

    const entryXml = match[1];
    
    // Extract video ID from yt:videoId
    const videoIdMatch = entryXml.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    if (!videoId) continue;

    // Extract title
    const titleMatch = entryXml.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract link
    const linkMatch = entryXml.match(/<link href="([^"]+)"\s*\/>/);
    const link = linkMatch ? linkMatch[1] : `https://www.youtube.com/watch?v=${videoId}`;

    // Extract published date
    const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
    const published = publishedMatch ? publishedMatch[1] : '';

    // Extract updated date
    const updatedMatch = entryXml.match(/<updated>(.*?)<\/updated>/);
    const updated = updatedMatch ? updatedMatch[1] : '';

    // Generate thumbnail URL
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    entries.push({
      id: videoId,
      title: title,
      link: link,
      thumbnail: thumbnail,
      published: published,
      updated: updated || published,
    });
  }

  return entries;
}

