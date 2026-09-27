// server.js - Local preview server for ProSmart Dashboard
import http from 'http';
import fs from 'fs';
import path from 'path';
import handler from './api/tuya.js';

const PORT = 3000;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  if (url.pathname === '/api/tuya') {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
      return res;
    };

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try { req.body = body ? JSON.parse(body) : {}; } catch(e) { req.body = {}; }
      try {
        await handler(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  let filePath = url.pathname === '/' ? './index.html' : '.' + url.pathname;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream('./index.html').pipe(res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ProSmart Dashboard live on http://0.0.0.0:${PORT}`);
});
