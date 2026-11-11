const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') return response.writeHead(204).end();
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!/^(?:index\.html|world\.js|paint\.js|game\.js|style\.css|assets\/[a-z-]+\.png)$/.test(file)) {
    return response.writeHead(404).end();
  }
  fs.readFile(path.join(__dirname, file), (error, content) => {
    if (error) return response.writeHead(404).end();
    response.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
    response.end(content);
  });
});
server.listen(4181, '127.0.0.1', () => console.log('http://127.0.0.1:4181/'));
