// Erzeugt docs/icon-*.png: node tools/icons.cjs
const { chromium } = require('playwright');
const path = require('path');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="f" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#24705a"/><stop offset="1" stop-color="#174a39"/></radialGradient></defs>
<rect width="512" height="512" fill="url(#f)"/>
<g transform="translate(256 270) rotate(10)"><rect x="-105" y="-150" width="210" height="300" rx="22" fill="#fffefb" stroke="#d9d6cc" stroke-width="3" transform="translate(40 -10)"/>
<text x="-20" y="-80" font-family="Georgia, serif" font-size="70" font-weight="700" fill="#d0262d">A</text></g>
<g transform="translate(236 270) rotate(-8)"><rect x="-105" y="-150" width="210" height="300" rx="22" fill="#fffefb" stroke="#d9d6cc" stroke-width="3"/>
<text x="-88" y="-82" font-family="Helvetica, Arial, sans-serif" font-size="62" font-weight="700" fill="#1d1d1b">B</text>
<text x="-86" y="-30" font-family="Arial, sans-serif" font-size="50" fill="#1d1d1b">♣</text>
<text x="10" y="70" text-anchor="middle" font-family="Georgia, serif" font-size="150" fill="#1d1d1b">♣</text>
<rect x="-95" y="-140" width="190" height="280" rx="16" fill="none" stroke="#b8861c" stroke-width="5"/></g>
</svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const s of [512, 192, 180]) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body></html>`);
    await p.screenshot({ path: path.resolve(__dirname, '../docs/icon-' + s + '.png'), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
  console.log('Icons geschrieben');
})();
