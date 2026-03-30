#!/usr/bin/env node
/**
 * Post-build script: injects PWA meta tags into dist/index.html
 * and copies public/ files into dist/.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const indexPath = path.join(distDir, 'index.html');

// --- Copy public/ → dist/ ---
for (const file of fs.readdirSync(publicDir)) {
  fs.copyFileSync(path.join(publicDir, file), path.join(distDir, file));
  console.log(`Copied public/${file} → dist/${file}`);
}

// --- Patch index.html ---
let html = fs.readFileSync(indexPath, 'utf8');

const pwaTags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#0d0d12" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Kavita Reader" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />`;

const swScript = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  </script>`;

// Inject PWA tags before </head>
html = html.replace('</head>', `${pwaTags}\n  </head>`);

// Inject SW registration before </body>
html = html.replace('</body>', `${swScript}\n</body>`);

fs.writeFileSync(indexPath, html);
console.log('Patched dist/index.html with PWA meta tags and SW registration');
