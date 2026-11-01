// Baut die App: node tools/build.mjs
//   dist/skat-lernen.html  – Seite für claude.ai-Artifacts (ohne <html>/<head>-Gerüst)
//   docs/                  – eigenständige Web-App für GitHub Pages (PWA, offline)
import fs from 'fs';
import crypto from 'crypto';
const root = new URL('../', import.meta.url);
const rd = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const JS = ['engine', 'model', 'ai', 'bot', 'content', 'drills', 'app'].map((f) => rd('src/' + f + '.js')).join('\n');
const CSS = rd('src/styles.css');
const SHELL = rd('src/shell.html');
if (/<\/script/i.test(JS)) throw new Error('</script> im JS');
const FONTS = 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Young+Serif&display=swap';
const TITLE = 'Skat lernen';
const version = crypto.createHash('sha1').update(JS + CSS + SHELL).digest('hex').slice(0, 10);

fs.mkdirSync(new URL('dist/', root), { recursive: true });
fs.mkdirSync(new URL('docs/', root), { recursive: true });

// --- Artifact ---
const artifact = `<title>${TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
${CSS}
</style>
${SHELL}
<script>
${JS}
</script>
`;
fs.writeFileSync(new URL('dist/skat-lernen.html', root), artifact);

// --- GitHub Pages / PWA ---
const RESET = `:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}`;
const SW_REG = `if('serviceWorker' in navigator && location.protocol==='https:'){addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}`;
const page = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="Skat lernen vom Einsteiger zum ernstzunehmenden Spieler: Lektionen, Übungen und Übungsspiele gegen den Computer.">
<meta name="theme-color" content="#1c5a45">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Skat">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${RESET}
${CSS}
</style>
</head>
<body>
${SHELL}
<script>
${JS}
${SW_REG}
</script>
</body>
</html>
`;
fs.writeFileSync(new URL('docs/index.html', root), page);
fs.writeFileSync(new URL('docs/manifest.webmanifest', root), JSON.stringify({
  name: 'Skat lernen', short_name: 'Skat', lang: 'de', start_url: './', scope: './', display: 'standalone',
  background_color: '#f2f5f3', theme_color: '#1c5a45',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
}, null, 2));
fs.writeFileSync(new URL('docs/sw.js', root), `// Offline-Cache für Skat lernen (${version})
const CACHE = 'skat-${version}';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !font) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })));
});
`);
console.log('Build', version, '· Artifact', (artifact.length / 1024).toFixed(0) + ' KB · Pages', (page.length / 1024).toFixed(0) + ' KB');
