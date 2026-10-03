const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const publicFiles = new Set(['index.html', 'styles.css', 'model.js', 'app.js', 'sw.js', 'icon.svg', 'manifest.webmanifest']);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  // Also allow /golf_score/ to check GitHub Pages project-relative asset paths.
  const name = pathname.replace(/^\/golf_score\//, '/').replace(/^\//, '') || 'index.html';
  if (!publicFiles.has(name)) { response.writeHead(404); response.end('Not found'); return; }
  fs.readFile(path.join(root, name), (error, content) => {
    if (error) { response.writeHead(500); response.end('Could not read file'); return; }
    response.writeHead(200, { 'Content-Type': `${types[path.extname(name)]}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(content);
  });
}).listen(4173, '127.0.0.1', () => console.log('Tap Golf: http://127.0.0.1:4173'));
