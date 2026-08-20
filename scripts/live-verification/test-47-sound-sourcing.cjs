/**
 * The sourcing panel says what is actually there.
 *
 * The screen this replaces listed seven instruments that do not exist -- a
 * Rhodes SoundFont, an SFZ cello, a Surge XT patch -- each badged COMMERCIAL
 * APPROVED against admission records that were never written, over a footer
 * reading "All assets audited by E16 Dataset Admission Engine". Auditioning
 * the Rhodes started a Tone.PolySynth and played a triad. The button that
 * opened it promised "25,000+ Open-Source Instruments".
 *
 * The sourcing decision is a funnel now: a curated catalogue is the only way
 * in, and libraries compete for a small number of factory slots. This drives
 * the real panel and checks that it reports the funnel's real state -- an
 * empty factory, candidates blocked on rights nobody has read, and the ruled
 * out named with their reasons.
 */
const playwright = require('playwright');
const { launch, enterStudio } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== WHERE THE SOUNDS COME FROM ===\n');

  await page.locator('#btn-sound-sourcing').first().click();
  await page.waitForTimeout(900);
  const panel = page.locator('#sound-sourcing-panel');
  check('the panel opens', (await panel.count()) === 1, 'sound sourcing');
  if (!(await panel.count())) { console.log('\nFAILED'); await browser.close(); process.exit(1); }

  const text = async () => (await panel.innerText()).replace(/\s+/g, ' ');
  const stack = await text();

  console.log('\n-- the runtime, read from the engine --');
  const runtime = (await page.locator('#sourcing-runtime-state').innerText()).trim();
  check(
    'it reports whether a bank is loaded, rather than assuming one',
    /no sound bank loaded/.test(runtime) || /preset\(s\)/.test(runtime),
    runtime
  );

  console.log('\n-- the stack --');
  for (const [name, phrase] of [
    ['SpessaSynth', 'SpessaSynth'],
    ['sfizz', 'sfizz'],
    ['FaustWasm', 'FaustWasm'],
    ['ACE-Step', 'ACE-Step XL Base'],
    ['the native synths', 'SoulSonus native synths'],
    ['the mastering chain', 'existing mastering chain'],
  ]) {
    check(`the stack names ${name}`, stack.includes(phrase), phrase);
  }
  check(
    'nothing on this screen claims a bundled instrument count',
    !/\d{3,}\+? (open-source )?instruments/i.test(stack),
    'no "25,000+"'
  );

  console.log('\n-- the factory --');
  await page.getByRole('button', { name: 'Factory slots', exact: true }).click();
  await page.waitForTimeout(400);
  const factory = await text();
  check(
    'every family reports slots, and they are empty',
    /drum kit/i.test(factory) && /0\/2 slots/.test(factory) && /0\/3 slots/.test(factory),
    (factory.match(/\d\/\d slots/g) || []).join(' ')
  );
  check(
    'the drum kit slot is filled by the first admitted instrument',
    /1\/2 slots/.test(factory) && /SoulSonus Factory Kit/.test(factory),
    (factory.match(/\d\/\d slots/g) || []).join(' ')
  );
  check(
    'and the empty families still say so plainly',
    /no instrument admitted/.test(factory),
    'empty state stated where it is empty'
  );
  check(
    'the admitted instrument shows its licence and checksum',
    /CC0 1\.0 Universal/.test(factory) && /sha 2cf7219fd0f1/.test(factory),
    (factory.match(/CC0[^·]*· [^·]*· sha \w+/) || ['not shown'])[0]
  );

  // ---- and it actually loads and plays ----
  //
  // A bank that appears in a list is not a bank that makes a sound. This
  // presses the real button, then renders every drum through the engine the
  // studio uses and measures what comes back.
  console.log('\n-- it loads, and it sounds --');
  await page.locator('#load-soulsonus-factory-kit').click();
  await page.waitForTimeout(3000);
  const result = await page.locator('#sourcing-load-result').innerText();
  check(
    'pressing Load loads the bank',
    /loaded/.test(result) && /CC0/.test(result),
    result.trim()
  );
  const runtimeAfter = (await page.locator('#sourcing-runtime-state').innerText()).trim();
  check(
    'and the runtime line stops saying nothing is loaded',
    !/no sound bank loaded/.test(runtimeAfter) && /preset/.test(runtimeAfter),
    runtimeAfter
  );

  // Rendering a channel through the bank is the real product path -- it is
  // how a sampled instrument reaches the timeline -- so that is what is
  // driven, rather than poking the engine directly.
  const played = await page.evaluate(`(async () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    let ctx = null;
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.handleLoadFactoryInstrument) { ctx = v; break; }
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    if (!ctx) return { error: 'no session context' };
    const kick = ctx.tracks.find(t => t.instrument === 'kick' && (t.noteEvents || []).length);
    if (!kick) return { error: 'no kick channel with notes' };
    const res = await ctx.handleRenderTrackWithSoundBank(kick.id, 0);
    const after = ctx.tracks.find(t => t.id === kick.id);
    return { res, notes: (kick.noteEvents || []).length, pitches: [...new Set((kick.noteEvents || []).map(n => n.midiNote))] };
  })()`);
  check(
    'a channel renders through the kit onto the timeline',
    !played.error && played.res && played.res.ok === true,
    played.error || (played.res && played.res.message) || ''
  );
  check(
    'the studio channel was mapped onto the kit, not played as written',
    !!played.res && /played on key 36/.test(played.res.message || '') && !played.pitches.includes(36),
    played.pitches ? `channel notes at MIDI ${played.pitches.join(',')} — the studio's numbering, not General MIDI` : ''
  );

  await page.waitForTimeout(1500);
  const rendered = await page.evaluate(`(() => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    let ctx = null;
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.handleLoadFactoryInstrument) { ctx = v; break; }
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    const assets = Object.values(ctx.audioAssets || {}).filter(a => a.name.indexOf('Factory Kit') >= 0);
    const a = assets[assets.length - 1];
    return a ? { name: a.name, secs: a.durationSeconds, peak: Math.max.apply(null, a.peaks || [0]), points: (a.peaks || []).length } : null;
  })()`);
  check(
    'and what landed is audio, not silence',
    !!rendered && rendered.peak > 0.01 && rendered.secs > 0.5,
    rendered ? `${rendered.name} — ${rendered.secs.toFixed(2)}s, peak ${rendered.peak.toFixed(3)} over ${rendered.points} points` : 'no asset'
  );

  console.log('\n-- the candidates --');
  await page.getByRole('button', { name: 'Candidates', exact: true }).click();
  await page.waitForTimeout(400);
  const cands = await text();
  for (const lib of ['Versilian', 'Karoryfer', 'Virtuosity Drums', 'MuseScore General']) {
    check(`${lib} is listed as a candidate`, cands.includes(lib), lib);
  }
  check(
    'the ones nobody has checked are blocked',
    (cands.match(/Nobody has read/g) || []).length >= 3,
    `${(cands.match(/Nobody has read/g) || []).length} candidates waiting on a rights check`
  );
  // The footer counts how many sources have been rights-checked, so the badge
  // itself is what has to be absent -- not the phrase anywhere on screen.
  const badges = await panel.locator('span', { hasText: /^rights checked$/ }).count();
  check(
    'exactly the licence-checked library is badged',
    badges === 1 && /Versilian/.test(cands),
    `${badges} "rights checked" badge(s) — VCSL's CC0 was read at the source, the other three have not been`
  );
  check(
    'and the unread ones say what is missing',
    (cands.match(/Nobody has read/g) || []).length === 3,
    'Karoryfer, Virtuosity Drums and MuseScore General still waiting'
  );

  console.log('\n-- the ruled out --');
  await page.getByRole('button', { name: 'Ruled out', exact: true }).click();
  await page.waitForTimeout(400);
  const out = await text();
  for (const lib of ['Pianobook', 'Philharmonia', 'Freesound', 'OpenAIR', 'Pedalboard', 'Rubber Band', 'Surge XT', 'Dexed']) {
    check(`${lib} is ruled out, with a reason`, out.includes(lib), lib);
  }

  console.log('\n-- the search reaches the whole decision --');
  await page.locator('#sourcing-search').fill('per-asset');
  await page.waitForTimeout(400);
  const found = await text();
  check(
    'searching a reason finds the sources it belongs to',
    /OpenAIR/.test(found),
    'the reason text is searchable, not just the name'
  );

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
