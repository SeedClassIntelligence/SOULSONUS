// Shared helpers for the SoulSonus live verification harness.
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Injected into the page: walks the React fiber tree to find the
// StudioSessionContext.Provider value so tests can read real session state.
const READ_SESSION = `(() => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
  // root[key] is the HostRoot fiber; its stateNode is the FiberRoot, whose
  // .current always points at the COMMITTED tree. Walking from root[key]
  // directly can land on a stale alternate fiber and return an old context
  // value, which silently reports edits as not having applied.
  const fiberRoot = root[key] && root[key].stateNode;
  const start = (fiberRoot && fiberRoot.current) || root[key];
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const f = stack.pop();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    const v = f.memoizedProps && f.memoizedProps.value;
    if (v && typeof v === 'object' && Array.isArray(v.tracks) && v.dawState) return v;
    if (f.child) stack.push(f.child);
    if (f.sibling) stack.push(f.sibling);
  }
  return null;
})()`;

async function launch(playwright, audioFile) {
  const args = [
    '--no-sandbox',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ];
  if (audioFile) args.push(`--use-file-for-fake-audio-capture=${audioFile}`);
  const browser = await playwright.chromium.launch({ executablePath: CHROME, args });
  const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1600, height: 950 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 200)));
  return { browser, page };
}

async function enterStudio(page) {
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ENTER THE STUDIO' }).first().click();
  await page.waitForTimeout(2500);
}

// Returns a JSON-safe projection of session state (the raw value has functions/cycles).
async function session(page, projector) {
  return page.evaluate(`(() => { const s = ${READ_SESSION}; if (!s) return null; return (${projector})(s); })()`);
}

module.exports = { CHROME, READ_SESSION, launch, enterStudio, session };
