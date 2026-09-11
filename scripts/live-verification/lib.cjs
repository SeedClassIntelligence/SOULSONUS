// Shared helpers for the SoulSonus live verification harness.
const fs = require('node:fs');

/**
 * The browser, wherever it is on this machine.
 *
 * This was one hardcoded Linux path. On any other machine every check in this
 * directory failed on its first line with "Executable doesn't exist" -- which
 * reads as a broken harness rather than a browser that lives somewhere else,
 * and is not a thing the creator can be asked to debug. The pinned path is
 * still preferred where it exists; otherwise Playwright uses the browser it
 * installed itself (`npx playwright install chromium`).
 */
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME = process.env.SOULSONUS_CHROME || (fs.existsSync(PINNED) ? PINNED : null);

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
  if (audioFile) {
    if (!fs.existsSync(audioFile)) {
      throw new Error(
        `No test audio at ${audioFile}.\n` +
          `  Generate it first, into a directory this machine has:\n` +
          `    node scripts/live-verification/generate-test-audio.cjs <dir>\n` +
          `    then set SOULSONUS_VERIFY_DIR to that same <dir>.\n` +
          `  Chromium given a path that does not exist opens a microphone that hears\n` +
          `  nothing, and the empty take gets reported as a fault in the studio.`
      );
    }
    args.push(`--use-file-for-fake-audio-capture=${audioFile}`);
  }
  const browser = await playwright.chromium.launch({
    ...(CHROME ? { executablePath: CHROME } : {}),
    args,
  });
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
const WAY_FOR_LABEL = {
  'Oral Beatbox': 'BEATBOX',
  'Clap / Tap': 'CLAP',
  'Hum / Voice': 'HUM',
  Mimic: 'MIMIC',
  Sing: 'SING',
  'MIDI Keys': 'MIDI',
};

async function recordTake(page, tab, seconds, { play = false } = {}) {
  const way = WAY_FOR_LABEL[tab] || tab;
  await page.locator(`[data-testid="${MODALITY_TAB[way] || `capture-${String(way).toLowerCase()}`}"]`)
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);
  await page.locator('[data-testid="record"]').first().click({ force: true });
  if (play) {
    await page.locator('button[title="Play (Space)"]').first().click().catch(() => {});
  }
  await page.waitForTimeout(seconds * 1000);
  await page.locator('[data-testid="record"]').first().click({ force: true });
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
  PATTERN: 'Grid tools — clone, nudge, invert, randomise, clear',
  TAKES: 'Performance take slots — pick which one the next pass lands on',
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
  // The ten words under the microphone. The old row of modality tabs is gone;
  // these are ways of being understood, not modes to enter, and the record
  // control is one button that does not move when you change your mind.
  AUDIO: 'capture-audio',
  BEATBOX: 'capture-beatbox',
  MOUTH: 'capture-beatbox',
  CLAP: 'capture-clap',
  CLAP_TAP: 'capture-clap',
  BODY: 'capture-clap',
  HUM: 'capture-hum',
  HUM_VOICE: 'capture-hum',
  VOICE: 'capture-hum',
  MIMIC: 'capture-mimic',
  SING: 'capture-sing',
  SPEAK: 'capture-speak',
  MIDI: 'capture-midi',
  INSTRUMENT: 'capture-midi',
  IMPORT: 'capture-import',
  MELODY: 'capture-melody',
};

/** Chooses a modality and starts recording. Leaves the microphone open. */
async function armCapture(page, modality = 'BEATBOX', { settle = 1200 } = {}) {
  const tab = MODALITY_TAB[modality];
  if (!tab) throw new Error(`No capture modality called ${modality}. Known: ${Object.keys(MODALITY_TAB).join(', ')}`);
  await page.locator(`[data-testid="${tab}"]`).first().click({ force: true });
  await page.waitForTimeout(400);
  await page.locator('[data-testid="record"]').first().click({ force: true });
  await page.waitForTimeout(settle);
}

/** Ends capture from whichever control is on screen, and keeps the take. */
async function stopCapture(page, { settle = 2600 } = {}) {
  const surface = page.locator('[data-testid="record"]').first();
  const label = (await surface.count()) ? (await surface.innerText()).trim() : '';
  if (/STOP/i.test(label)) await surface.click({ force: true });
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

/**
 * Studio Intelligence, opened and closed.
 *
 * The button that opens it moved out of the header and onto the end of the
 * room bar, behind RELEASE. The drawer it opens is fixed to the right edge at
 * z-50, so once it is open that button is underneath it -- clicking it a
 * second time to close was clicking the drawer, and Playwright waited thirty
 * seconds for a hit target that was never going to be free. Closing goes
 * through the drawer's own X, which is what a creator reaches for anyway.
 */
async function openIntelligence(page) {
  await page.getByRole('button', { name: '✦ STUDIO INTELLIGENCE' }).first().click({ force: true });
  await page.waitForTimeout(800);
}

async function closeIntelligence(page) {
  const x = page.locator('[data-testid="intelligence-close"]').first();
  if (await x.count()) await x.click({ force: true });
  await page.waitForTimeout(500);
}

/**
 * Asks Studio Intelligence and waits for the answer, rather than for a clock.
 *
 * Both callers slept 1500 ms and read the page. That is long enough for the
 * first question of a session and not for the fourth: the check that the
 * studio refuses to invent an audience failed against a build that answers it
 * correctly, because the reply landed after the read. This waits for a new
 * turn to appear in the transcript.
 */
async function askIntelligence(page, text) {
  const panel = page.locator('div.fixed.right-0').first();
  const turns = async () =>
    (await panel.innerText().catch(() => '')).split('SOULSONUS INTELLIGENCE').length;
  const before = await turns();
  await page.fill('#intelligence-input', text);
  await page.click('#intelligence-ask');
  for (let i = 0; i < 60; i++) {
    if ((await turns()) > before) break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(300);
  return page.evaluate(() => document.body.innerText);
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
  openIntelligence,
  closeIntelligence,
  askIntelligence,
};
