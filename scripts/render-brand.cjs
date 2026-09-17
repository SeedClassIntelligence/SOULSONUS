const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), 'brand');
/**
 * Whatever Chromium this machine has. Playwright resolves its own download on
 * a normal checkout; SOULSONUS_CHROME is the override for a container that
 * ships a browser at a fixed path with a different build number, where
 * Playwright's resolution points at a directory that does not exist.
 */
const CHROME = process.env.SOULSONUS_CHROME || undefined;
const MONO = `ui-monospace, 'DejaVu Sans Mono', 'Liberation Mono', Menlo, Consolas, monospace`;

const jobs = [
  { svg: 'soulsonus-mark.svg',              w: 512, h: 512, sizes: [1024, 512, 256, 128, 64, 32] },
  { svg: 'soulsonus-wordmark.svg',          w: 700, h: 170, sizes: [2100, 1400, 700] },
  { svg: 'soulsonus-wordmark-two-tone.svg', w: 700, h: 170, sizes: [2100, 1400, 700] },
  { svg: 'soulsonus-lockup.svg',            w: 940, h: 300, sizes: [2820, 1880, 940] },
];

const palette = JSON.parse(fs.readFileSync(path.join(OUT, 'palette.json'), 'utf8'));

const swatchRow = (title, group) => `
  <section>
    <h2>${title}</h2>
    <div class="row">
      ${Object.entries(group).map(([token, v]) => `
        <div class="sw">
          <div class="chip" style="background:${v.hex}"></div>
          <div class="tok">${token}</div>
          <div class="hex">${v.hex}</div>
          <div class="role">${v.role}</div>
        </div>`).join('')}
    </div>
  </section>`;

const paletteHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#020617;color:#cbd5e1;font-family:${MONO};padding:48px 56px;width:1600px}
  h1{font-size:30px;font-weight:900;letter-spacing:6px;color:#f1f5f9;margin-bottom:6px}
  h1 em{font-style:normal;color:#f59e0b}
  .sub{font-size:13px;color:#64748b;letter-spacing:2px;margin-bottom:34px}
  h2{font-size:12px;font-weight:900;letter-spacing:4px;color:#475569;margin:30px 0 14px;
     border-top:1px solid #1e293b;padding-top:12px}
  .row{display:flex;flex-wrap:wrap;gap:14px}
  .sw{width:174px}
  .chip{height:80px;border-radius:12px;border:1px solid #1e293b}
  .tok{font-size:12px;font-weight:700;color:#e2e8f0;margin-top:9px}
  .hex{font-size:12px;color:#f59e0b;letter-spacing:1px}
  .role{font-size:10px;line-height:1.45;color:#64748b;margin-top:5px}
  .grads{display:flex;flex-wrap:wrap;gap:14px}
  .g{width:365px}
  .gbar{height:56px;border-radius:12px;border:1px solid #1e293b}
  .gname{font-size:11px;font-weight:700;color:#e2e8f0;margin-top:8px}
  .gval{font-size:10px;color:#64748b}
  footer{margin-top:34px;border-top:1px solid #1e293b;padding-top:12px;font-size:10px;color:#475569}
</style></head><body>
  <h1>SOUL<em>SONUS</em> &nbsp;·&nbsp; COLOR</h1>
  <div class="sub">MEASURED FROM THE SOURCE — COUNTS ARE OCCURRENCES ACROSS src/</div>
  ${swatchRow('CORE — THE STUDIO FLOOR', palette.core)}
  ${swatchRow('SIGNATURE — THE CREATOR’S OWN ACTIONS', palette.signature)}
  ${swatchRow('SYSTEMS — WHAT A SURFACE BELONGS TO', palette.systems)}
  <section>
    <h2>GRADIENTS</h2>
    <div class="grads">
      <div class="g"><div class="gbar" style="background:linear-gradient(to top right, ${palette.gradients.mark.join(', ')})"></div>
        <div class="gname">MARK</div><div class="gval">${palette.gradients.mark.join(' → ')}</div></div>
      <div class="g"><div class="gbar" style="background:linear-gradient(to right, ${palette.gradients.wordmark.join(', ')})"></div>
        <div class="gname">WORDMARK</div><div class="gval">${palette.gradients.wordmark.join(' → ')}</div></div>
      <div class="g"><div class="gbar" style="background:linear-gradient(to right, ${palette.gradients.activeControl.join(', ')})"></div>
        <div class="gname">ACTIVE CONTROL</div><div class="gval">${palette.gradients.activeControl.join(' → ')}</div></div>
      <div class="g"><div class="gbar" style="background:linear-gradient(to right, ${palette.gradients.wordmarkTwoTone.soul} 0 45%, ${palette.gradients.wordmarkTwoTone.sonus} 45% 100%)"></div>
        <div class="gname">WORDMARK, TWO TONE</div><div class="gval">SOUL ${palette.gradients.wordmarkTwoTone.soul} · SONUS ${palette.gradients.wordmarkTwoTone.sonus}</div></div>
    </div>
  </section>
  <footer>EVERY SURFACE SITS ON slate-950. AMBER IS THE CREATOR. ROSE IS THE ONLY COLOR THAT MEANS SOMETHING WENT WRONG.</footer>
</body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });

  for (const job of jobs) {
    const svg = fs.readFileSync(path.join(OUT, job.svg), 'utf8');
    const base = job.svg.replace(/\.svg$/, '');
    for (const size of job.sizes) {
      for (const onDark of [false, true]) {
        // Only the largest and the display size get an on-dark twin.
        if (onDark && size !== job.sizes[1] && size !== job.sizes[0]) continue;
        const page = await browser.newPage({
          viewport: { width: job.w, height: job.h },
          deviceScaleFactor: size / job.w,
        });
        await page.setContent(
          `<!doctype html><html><head><style>
             html,body{margin:0;padding:0;background:${onDark ? '#020617' : 'transparent'};}
             svg{display:block;width:${job.w}px;height:${job.h}px;}
           </style></head><body>${svg}</body></html>`,
          { waitUntil: 'load' }
        );
        const out = path.join(OUT, `${base}-${size}${onDark ? '-on-dark' : ''}.png`);
        await page.screenshot({ path: out, omitBackground: !onDark });
        await page.close();
        console.log(path.basename(out));
      }
    }
  }

  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
  await page.setContent(paletteHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(OUT, 'soulsonus-palette.png'), fullPage: true });
  await page.close();
  console.log('soulsonus-palette.png');

  await browser.close();
})();
