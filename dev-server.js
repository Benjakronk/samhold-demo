import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = createServer((req, res) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  let filePath = req.url;
  console.log('Request for:', filePath);

  // Default to index.html for root requests
  if (filePath === '/') {
    filePath = '/index.html';
  }

  try {
    const fullPath = join(__dirname, filePath);
    const content = readFileSync(fullPath);

    // Set appropriate content type
    const ext = filePath.split('.').pop();
    const contentTypes = {
      'html': 'text/html',
      'js': 'application/javascript',
      'css': 'text/css',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'json': 'application/json'
    };

    const headers = {
      'Content-Type': contentTypes[ext] || 'text/plain',
      ...corsHeaders
    };

    res.writeHead(200, headers);
    res.end(content);
    console.log('✅ Served:', filePath);
  } catch (error) {
    console.error('❌ Server error:', error.message, '(path:', filePath, ')');
    res.writeHead(404, corsHeaders);
    res.end(`File not found: ${filePath}`);
  }
});

const port = 3001;
server.listen(port, () => {
  console.log(`🚀 Samhold modular development server running at http://localhost:${port}`);
  console.log('🔧 Incremental refactoring environment');
  console.log('📁 Starting with single file, extracting systems one by one');
});

export default server;