#!/usr/bin/env node
/**
 * Minimal local callback receiver for FlickrHub.
 * - Listens on PORT (default 4001)
 * - Accepts POST /callback with JSON body
 * - Writes logs to ./callback.log (appends)
 * - If X-Signature header is present, logs it but does not verify (add secret verify if needed)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4001;
const HOST = process.env.HOST || '127.0.0.1';
const LOG_FILE = path.join(process.cwd(), 'callback.log');

const logLine = (obj) => {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...obj });
  fs.appendFileSync(LOG_FILE, line + '\n');
};

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/callback') {
    res.writeHead(404);
    return res.end('not found');
  }
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1e6) req.socket.destroy(); // safety
  });
  req.on('end', () => {
    let parsed = null;
    try {
      parsed = JSON.parse(body || '{}');
    } catch (err) {
      parsed = { parse_error: err.message, raw: body };
    }
    const signature = req.headers['x-signature'] || null;
    logLine({
      event: 'callback_received',
      path: req.url,
      signature,
      payload: parsed,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Callback server listening on http://${HOST}:${PORT}/callback`);
  console.log(`Logs -> ${LOG_FILE}`);
});
