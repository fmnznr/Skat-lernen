// Erzeugt docs/icon-*.png: node tools/icons.cjs
const { chromium } = require('playwright');
const path = require('path');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="f" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#24705a"/><stop offset="1" stop-color="#174a39"/></radialGradient></defs>
<rect width="512" height="512" fill="url(#f)"/>
<g transform="translate(256 270) rotate(10)"><rect x="-105" y="-150" width="210" height="300" rx="22" fill="#fffefb" stroke="#d9d6cc" stroke-width="3" transform="translate(40 -10)"/>
<text x="-20" y="-80" font-family="Georgia, serif" font-size="70" font-weight="700" fill="#c42229">A</text></g>
<g transform="translate(236 270) rotate(-8)"><rect x="-105" y="-150" width="210" height="300" rx="22" fill="#fffefb" stroke="#d9d6cc" stroke-width="3"/>
<text x="-88" y="-82" font-family="Helvetica, Arial, sans-serif" font-size="62" font-weight="700" fill="#5b391b">U</text>
<g transform="translate(-90 -70) scale(2)"><path d="M12 1.3v3.2" stroke="#4a2c10" stroke-width="1.6" stroke-linecap="round"/><path d="M6.7 10.6c0 6.3 2.6 11.3 5.3 12 2.7-.7 5.3-5.7 5.3-12z" fill="#b8762f"/><path d="M9.3 13c.3 2.8 1 5 2 6.6" stroke="#e2ae72" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M4.9 11.3c0-4.4 3.1-7.4 7.1-7.4s7.1 3 7.1 7.4c0 .6-.4 1-1 1H5.9c-.6 0-1-.4-1-1z" fill="#6b4220"/><path d="M7.3 9.3h9.4M6.4 11h11.2M9 6.8l1.4 4.6M12 5.6v5.8M15 6.8l-1.4 4.6" stroke="#4a2c10" stroke-width=".7" opacity=".7"/></g>
<g transform="translate(-58 -46) scale(6.2)"><path d="M12 1.3v3.2" stroke="#4a2c10" stroke-width="1.6" stroke-linecap="round"/><path d="M6.7 10.6c0 6.3 2.6 11.3 5.3 12 2.7-.7 5.3-5.7 5.3-12z" fill="#b8762f"/><path d="M9.3 13c.3 2.8 1 5 2 6.6" stroke="#e2ae72" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M4.9 11.3c0-4.4 3.1-7.4 7.1-7.4s7.1 3 7.1 7.4c0 .6-.4 1-1 1H5.9c-.6 0-1-.4-1-1z" fill="#6b4220"/><path d="M7.3 9.3h9.4M6.4 11h11.2M9 6.8l1.4 4.6M12 5.6v5.8M15 6.8l-1.4 4.6" stroke="#4a2c10" stroke-width=".7" opacity=".7"/></g>
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
