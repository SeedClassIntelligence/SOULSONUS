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

/**
 * Arms a modality and records for a while, through the controls a creator uses.
 *
 * The capture row used to be one button per modality ("BEATBOX (MOUTH)"); it is
 * now a row of modality tabs and one record control, and several tests still
 * addressed the old names and timed out before they measured anything. The
 * sequence lives here so the next rename is one edit rather than five.
 *
 * `tab` is the tab's own label: 'Oral Beatbox', 'Clap / Tap', 'Hum / Voice',
 * 'Mimic', 'Sing', 'MIDI Keys'.
 */
async function recordTake(page, tab, seconds, { play = false } = {}) {
  await page.getByRole('button', { name: tab }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '\u25cf RECORD LOOP' }).first().click();
  if (play) {
    await page.locator('button[title="Play (Space)"]').first().click().catch(() => {});
  }
  await page.waitForTimeout(seconds * 1000);
  await page.getByRole('button', { name: /STOP RECORDING/ }).first().click();
  // Longer than the history grouping window, so the next edit cannot join
  // this take's entry.
  await page.waitForTimeout(2600);
}

/**
 * The rooms, by which room they are.
 *
 * Every label carries a number in front of it and the numbering has changed
 * twice -- Create and Build were fused, then the rest were renumbered. Each
 * time, every check that clicked "4. MIX" stopped clicking anything and timed
 * out thirty seconds later, which reads as a broken app rather than a moved
 * button. The nav carries `data-testid="room-<ID>"` now, and this is the only
 * place that knows about it.
 */
async function goToRoom(page, room, { settle = 1400 } = {}) {
  await page.locator(`[data-testid="room-${room}"]`).first().click({ force: true });
  await page.waitForTimeout(settle);
}

/**
 * The specialist utilities rail, by what each entry opens.
 *
 * Keyed on the `title` the app gives each control, which describes the action
 * and has been stable across two rounds of relabelling that broke every test
 * matching on the visible label (the emoji prefixes are gone: it is
 * 'WORKSTATION' now, not '🎛️ TRACK WORKSTATION').
 */
const UTILITY_TITLE = {
  PIANO: 'Open Interactive Virtual Piano Keyboard',
  INSTRUMENT: 'Open Performance Instrument',
  SIGNATURE: 'Open Creator Training & My Sounds Studio',
  SOURCING: 'Sound Sourcing Vault',
  COLLAB: 'Open Real-Time Collaboration',
  NATIVE_BRAIN: 'Open Native Studio Brain',
  WORKSTATION: 'Open Track Workstation',
  SONGWRITING: 'Open Songwriting Suite',
  MIDI_HARDWARE: 'Open External MIDI Controllers & Hardware Synths',
  INSPECTOR: 'Open Quick Production Inspector Drawer',
  CALIBRATION: 'Open Calibration Drawer',
  RADAR: 'Open Radial Radar Drawer',
  IMPORT_AUDIO: 'Import audio or separate mix into stems',
  PIPELINE: 'Open SoulFlow Governance Pipeline',
  SAY_IT: 'Speak or type a command, or just say what you want in your own words',
  VOCAL_TO_LYRIC:
    'Read a sung or hummed take as a lyric seed and fit words to its cadence',
};

async function openUtility(page, key, { settle = 1200 } = {}) {
  const title = UTILITY_TITLE[key];
  if (!title) throw new Error(`No utility called ${key}. Known: ${Object.keys(UTILITY_TITLE).join(', ')}`);
  await page.locator(`button[title="${title}"]`).first().click({ force: true });
  await page.waitForTimeout(settle);
}

/**
 * The capture row, by modality rather than by button.
 *
 * It used to be one button per modality ("🎤 BEATBOX (MOUTH)") that armed the
 * microphone and started recording in a single press. It is a row of modality
 * tabs and one record control now, and the two are deliberately separate --
 * choosing what you are about to perform is not the same act as starting to
 * perform it. Tests that still pressed the old button waited thirty seconds
 * for a control that no longer exists and then reported the studio broken.
 */
const MODALITY_TAB = {
  BEATBOX: 'capture-beatbox',
  MOUTH: 'capture-beatbox',
  CLAP_TAP: 'capture-clap_tap',
  BODY: 'capture-clap_tap',
  HUM_VOICE: 'capture-hum_voice',
  VOICE: 'capture-hum_voice',
  MIMIC: 'capture-mimic',
  SING: 'capture-sing',
  INSTRUMENT: 'capture-instrument',
};

/** Chooses a modality and starts recording. Leaves the microphone open. */
async function armCapture(page, modality = 'BEATBOX', { settle = 1200 } = {}) {
  const tab = MODALITY_TAB[modality];
  if (!tab) throw new Error(`No capture modality called ${modality}. Known: ${Object.keys(MODALITY_TAB).join(', ')}`);
  await page.locator(`[data-testid="${tab}"]`).first().click({ force: true });
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '\u25cf RECORD LOOP' }).first().click({ force: true });
  await page.waitForTimeout(settle);
}

/** Ends capture from whichever control is on screen, and keeps the take. */
async function stopCapture(page, { settle = 2600 } = {}) {
  const bench = page.getByRole('button', { name: /STOP RECORDING/ }).first();
  if (await bench.count()) await bench.click({ force: true });
  else await page.locator('#btn-mic-arm').first().click({ force: true });
  await page.waitForTimeout(settle);
}

/**
 * Programs a plain pattern: kick on the beats, snare on 2 and 4, hats on 8ths.
 *
 * The studio used to open on a demo pattern, and a whole family of checks --
 * the bounce, instrument parameters, the sound bank, the kit playing live --
 * pressed play on arrival and measured what came out. The preset is empty by
 * construction now, so those checks were measuring silence and reporting the
 * engine broken. Anything that measures sound has to put a performance in
 * first, and this is the smallest honest one.
 */
async function seedPattern(page, { settle = 1200 } = {}) {
  const wrote = await page.evaluate(`(() => {
    const s = ${READ_SESSION};
    if (!s) return null;
    const by = (instr) => s.tracks.find((t) => t.instrument === instr);
    const put = (track, steps) => {
      if (!track) return 0;
      steps.forEach((i) => s.handleToggleStep(track.id, i));
      return steps.length;
    };
    return {
      kick: put(by('kick'), [0, 4, 8, 12]),
      snare: put(by('snare'), [4, 12]),
      hat: put(by('hihat'), [0, 2, 4, 6, 8, 10, 12, 14]),
    };
  })()`);
  await page.waitForTimeout(settle);
  return wrote;
}

/**
 * Writes a short melodic phrase, for the checks that need pitched material.
 *
 * Same reason as `seedPattern`: the melody channel arrives empty, and every
 * check that rendered it was reporting "0 notes" as a broken renderer.
 */
async function seedMelody(page, { trackInstrument = 'melody', settle = 1200 } = {}) {
  const wrote = await page.evaluate(`(() => {
    const s = ${READ_SESSION};
    if (!s) return null;
    const track = s.tracks.find((t) => t.instrument === ${JSON.stringify('%INSTR%')});
    if (!track) return null;
    const phrase = [
      [0, 60], [480, 62], [960, 64], [1440, 67],
      [1920, 64], [2400, 62], [2880, 60], [3360, 55],
    ];
    phrase.forEach(([tick, midi]) =>
      s.handleAddNote(track.id, { startTick: tick, durationTicks: 240, midiNote: midi, velocity: 100 })
    );
    return { trackId: track.id, notes: phrase.length };
  })()`.replace('%INSTR%', trackInstrument));
  await page.waitForTimeout(settle);
  return wrote;
}

module.exports = {
  CHROME,
  READ_SESSION,
  launch,
  enterStudio,
  session,
  recordTake,
  armCapture,
  stopCapture,
  MODALITY_TAB,
  seedPattern,
  seedMelody,
  goToRoom,
  openUtility,
  UTILITY_TITLE,
};
