// Local development server that mimics Vercel's routing:
//   /api/*   -> serverless handlers in /api
//   /guide   -> /api/guide (same rewrite as vercel.json)
//   /*       -> static files in /public, with clean URLs (/success -> success.html)
//
// Usage:  node scripts/dev-server.js   (reads .env if present)

import http from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT || 3000);

// Load .env (very small parser; no dependency).
const envPath = path.join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const rewrites = { '/guide': '/api/guide' };

async function runApi(name, req, res) {
  const file = path.join(root, 'api', `${name}.js`);
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  // Cache-bust so edits are picked up without restarting.
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  try {
    await mod.default(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal error');
  }
}

function serveStatic(urlPath, res) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.join(publicDir, rel);
  if (!file.startsWith(publicDir)) {
    res.writeHead(403); return res.end();
  }
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<h1>404</h1>');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;
  if (rewrites[pathname]) pathname = rewrites[pathname];
  if (pathname.startsWith('/api/')) {
    return runApi(pathname.slice(5).replace(/[^a-z0-9_-]/gi, ''), req, res);
  }
  return serveStatic(pathname, res);
}).listen(port, () => {
  console.log(`Amari Fitness Blueprint dev server → http://localhost:${port}`);
});
