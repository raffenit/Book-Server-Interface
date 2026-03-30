#!/usr/bin/env node
/**
 * Dev proxy server — serves dist/ and proxies /api/* to your Kavita instance.
 * Avoids CORS entirely: the browser only talks to localhost.
 *
 * Usage:
 *   node scripts/preview-server.js http://100.x.x.x:5000
 *   KAVITA_URL=http://100.x.x.x:5000 node scripts/preview-server.js
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3000;

let kavitaUrl = process.argv[2] || process.env.KAVITA_URL || '';
if (!kavitaUrl) {
  console.error('\nUsage: node scripts/preview-server.js <kavita-url>');
  console.error('  e.g. node scripts/preview-server.js http://100.104.199.67:5000\n');
  process.exit(1);
}
if (!/^https?:\/\//i.test(kavitaUrl)) kavitaUrl = 'http://' + kavitaUrl;
const target = new URL(kavitaUrl.replace(/\/$/, ''));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Patch index.html once to inject proxy config
let indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const injection = `<script>window.__KAVITA_PROXY__=true;window.__KAVITA_URL__=${JSON.stringify(kavitaUrl)};</script>`;
indexHtml = indexHtml.replace('<head>', '<head>\n  ' + injection);

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  const filePath = path.join(DIST, urlPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback — serve patched index.html
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(indexHtml);
  }
}

function proxyRequest(req, res) {
  const isImageRequest = req.url.includes('/api/image/');
  const options = {
    hostname: target.hostname,
    port: Number(target.port) || (target.protocol === 'https:' ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: target.host },
  };
  delete options.headers['accept-encoding']; // avoid compressed responses we'd need to decompress
  // Force Kavita not to serve cached images
  if (isImageRequest) {
    options.headers['cache-control'] = 'no-cache';
    options.headers['pragma'] = 'no-cache';
  }

  const transport = target.protocol === 'https:' ? https : http;
  const proxyReq = transport.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    // Strip cache headers for images so the browser always re-fetches
    if (isImageRequest) {
      headers['cache-control'] = 'no-store, no-cache, must-revalidate';
      headers['pragma'] = 'no-cache';
      delete headers['etag'];
      delete headers['last-modified'];
    }
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    console.error('[proxy]', err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    }
  });
  req.pipe(proxyReq);
}

// Fetch a URL, following redirects, and return a full data URL
function fetchDataUrl(imageUrl, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const mod = imageUrl.startsWith('https') ? https : http;
    const req = mod.get(imageUrl, { headers: { 'User-Agent': 'KavitaReader/1.0' } }, (res) => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location) {
        console.log(`[cover-proxy] redirect ${res.statusCode} → ${res.headers.location}`);
        res.resume(); // drain
        resolve(fetchDataUrl(res.headers.location, redirectCount + 1));
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`Image fetch returned ${res.statusCode}`));
        return;
      }
      const contentType = res.headers['content-type'] || 'image/jpeg';
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const b64 = Buffer.concat(chunks).toString('base64');
        resolve(`data:${contentType};base64,${b64}`);
      });
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

// POST /cover-proxy — fetch image server-side, upload to Kavita
function handleCoverProxy(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { seriesId, imageUrl, token } = JSON.parse(body);
      console.log(`[cover-proxy] seriesId=${seriesId} imageUrl=${imageUrl}`);

      const dataUrl = await fetchDataUrl(imageUrl);
      const mimeSnip = dataUrl.substring(0, 40);
      const totalKB = Math.round(Buffer.byteLength(dataUrl) / 1024);
      console.log(`[cover-proxy] fetched image: ${mimeSnip}… (${totalKB} KB)`);

      const payload = JSON.stringify({ id: seriesId, url: dataUrl });
      const payloadKB = Math.round(Buffer.byteLength(payload) / 1024);
      console.log(`[cover-proxy] sending to Kavita: ${payloadKB} KB payload`);

      const options = {
        hostname: target.hostname,
        port: Number(target.port) || (target.protocol === 'https:' ? 443 : 80),
        path: '/api/Upload/series',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const transport = target.protocol === 'https:' ? https : http;
      const proxyReq = transport.request(options, (proxyRes) => {
        let respBody = '';
        proxyRes.on('data', c => { respBody += c; });
        proxyRes.on('end', () => {
          console.log(`[cover-proxy] Kavita responded: ${proxyRes.statusCode} — ${respBody.substring(0, 200)}`);
          const ok = proxyRes.statusCode >= 200 && proxyRes.statusCode < 300;
          res.writeHead(ok ? 200 : proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: proxyRes.statusCode,
            ok,
            body: respBody,
          }));
        });
      });
      proxyReq.on('error', (err) => {
        console.error('[cover-proxy] request error:', err.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: err.message }));
      });
      proxyReq.write(payload);
      proxyReq.end();
    } catch (e) {
      console.error('[cover-proxy] exception:', e.message);
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// GET /openlibrary-proxy?url=... — fetch any openlibrary URL server-side, following redirects
function handleOpenLibraryProxy(req, res, targetUrl, redirectCount = 0) {
  if (!targetUrl) {
    const parsed = new URL(req.url, 'http://localhost');
    targetUrl = parsed.searchParams.get('url');
  }
  if (!targetUrl || !targetUrl.startsWith('https://')) {
    res.writeHead(400); res.end(JSON.stringify({ error: 'Missing or invalid url param' })); return;
  }
  if (redirectCount > 5) { res.writeHead(502); res.end(JSON.stringify({ error: 'Too many redirects' })); return; }
  console.log(`[ol-proxy] fetching: ${targetUrl}`);
  https.get(targetUrl, { headers: { 'User-Agent': 'KavitaReader/1.0' } }, (upstream) => {
    if ((upstream.statusCode === 301 || upstream.statusCode === 302 || upstream.statusCode === 307 || upstream.statusCode === 308) && upstream.headers.location) {
      console.log(`[ol-proxy] redirect → ${upstream.headers.location}`);
      upstream.resume();
      handleOpenLibraryProxy(req, res, upstream.headers.location, redirectCount + 1);
      return;
    }
    const ct = upstream.headers['content-type'] || 'application/octet-stream';
    res.writeHead(upstream.statusCode, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
    upstream.pipe(res);
  }).on('error', (err) => {
    console.error('[ol-proxy] error:', err.message);
    if (!res.headersSent) { res.writeHead(502); res.end(JSON.stringify({ error: err.message })); }
  });
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url === '/cover-proxy' && req.method === 'POST') {
    handleCoverProxy(req, res);
  } else if (req.url.startsWith('/openlibrary-proxy')) {
    handleOpenLibraryProxy(req, res, null);
  } else if (req.url.startsWith('/api/')) {
    proxyRequest(req, res);
  } else {
    serveStatic(req, res);
  }
}).listen(PORT, () => {
  console.log(`\n  Preview:  http://localhost:${PORT}`);
  console.log(`  Proxying: /api/* → ${kavitaUrl}\n`);
});
