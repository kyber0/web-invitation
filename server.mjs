import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { handler } from './lib/handler.mjs';
const root = process.cwd();
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return handler(req, res);
  const path = url.pathname === '/' ? '/index.html' : url.pathname === '/admin' ? '/admin.html' : url.pathname;
  const base = resolve(root, path.startsWith('/resources/') ? 'resources' : 'public');
  const relative = path.startsWith('/resources/') ? path.slice('/resources/'.length) : path.slice(1);
  const target = resolve(base, relative);
  if (!target.startsWith(base + sep) || !mime[extname(target)] || (base.endsWith('resources') && relative !== '1000070477.png')) {
    res.writeHead(404); return res.end('Not found');
  }
  try {
    const data = readFileSync(target);
    res.writeHead(200, { 'Content-Type': mime[extname(target)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, host, () => console.log(`Invitation ready at http://${host}:${port}`));
