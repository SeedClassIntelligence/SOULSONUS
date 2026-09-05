/**
 * A request addressed to a who.
 *
 * Every branch of the Co-Producer reads a verb — make this fatter, redo those
 * bars. "Bass player, play what you feel" names a musician, and there was
 * nowhere for that to land, so it fell through to whichever operation happened
 * to share a keyword: asking the bassist for anything got you a timbre sculpt
 * on the 808.
 *
 * This drives the real dock in the real app and checks three things: that an
 * address is recognised as one, that a verb about a track is NOT turned into a
 * player, and — the part that matters most given this project's history — that
 * the reply says plainly no player exists yet rather than handing back a take
 * that nothing generated.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, seedMelody, seedPattern } = require('./lib.cjs');

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
}

async function ask(page, text) {
  const input = page.locator('#intelligence-input').first();
  await input.scrollIntoViewIfNeeded();
  await input.fill(text);
  await page.locator('#intelligence-ask').first().click();
  await page.waitForTimeout(2200);
  const replies = page.locator('.intelligence-reply');
  const count = await replies.count();
  return count ? (await replies.nth(count - 1).innerText()).trim() : '';
}

(async () => {
  const { browser, page } = await launch(playwright, null);
  await enterStudio(page);

  console.log('=== THE SESSION BAND: ADDRESSING A PLAYER ===\n');

  // The drummer is asked to play exactly what was played, so there has to be
  // something on the drums to copy. The session arrives with empty channels.
  await seedPattern(page);


  await page.evaluate(`window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: 'intelligence' }))`);
  await page.waitForTimeout(1500);
  const reachable = await page.locator('#intelligence-input').count();
  check('the intelligence dock is reachable', reachable > 0, `${reachable} input(s)`);
  if (!reachable) { console.log('\nFAILED'); await browser.close(); process.exit(1); }

  // ---- 1. an address is answered as one ----
  console.log('\n-- addressing the bass player --');
  const bass = await ask(page, 'Bass player, play what you feel in the hook');
  check('the reply names the player', /Bass/.test(bass), bass.split('\n')[0].slice(0, 60));
  check('it states the grant', /PLAY WHAT YOU FEEL/.test(bass), (bass.match(/PLAY [A-Z ]+/) || ['none'])[0]);
  check('it names the lane it may write to', /Lane/.test(bass), 'lane stated');
  check(
    'it says the take comes back as notes',
    /performance, as notes/.test(bass),
    'engine can be swapped afterwards'
  );
  // PLAY WHAT YOU FEEL asks the player to invent, and nothing that can invent
  // is wired. The reply has to say that in those terms rather than hand back
  // something plausible.
  check(
    'it refuses the grant it cannot honour, and says why',
    /needs a model that is not wired yet/.test(bass),
    'no take fabricated for an invention grant'
  );
  check(
    'nothing in the reply claims a percentage',
    !/\d+(\.\d+)?%/.test(bass),
    /\d+(\.\d+)?%/.test(bass) ? bass.match(/\d+(\.\d+)?%/g).join(', ') : 'none'
  );

  // ---- 2. the grant changes with the words ----
  console.log('\n-- the grant follows the direction --');
  const exact = await ask(page, 'Drummer, play exactly what I beatboxed');
  check('PLAY EXACTLY is recognised', /PLAY EXACTLY/.test(exact), (exact.match(/PLAY [A-Z ]+/) || ['none'])[0]);
  check('and it is answered by the drummer', /Drummer/.test(exact), exact.split('\n')[0].slice(0, 40));
  check(
    'the tolerance is stated, not implied',
    /30 ms/.test(exact),
    (exact.match(/\d+ ms/) || ['none'])[0]
  );

  const around = await ask(page, 'Guitarist, play around it');
  check('PLAY AROUND IT is recognised', /PLAY AROUND IT/.test(around), (around.match(/PLAY [A-Z ]+/) || ['none'])[0]);
  check('its looser window is stated', /60 ms/.test(around), (around.match(/\d+ ms/) || ['none'])[0]);

  // ---- 3. the audio-only players say so ----
  console.log('\n-- the split inside the roster --');
  const bgv = await ask(page, 'Give me backing vocals on the chorus');
  check('backing vocals are answered', /Background vocals/.test(bgv), bgv.split('\n')[0].slice(0, 40));
  check(
    'and they say the engine cannot be swapped later',
    /cannot be swapped/.test(bgv),
    'audio take, no note form'
  );

  // ---- 3b. the grant it CAN honour produces a real take ----
  //
  // The band stopped being a description at this point. Asking for the phrase
  // you played back has a player behind it, so a channel has to appear, hold
  // notes, and carry the renderer's name -- and the reply has to show the
  // grant check that let it through rather than asserting it went well.
  console.log('\n-- a grant with a player behind it --');
  const COUNTS = `s => JSON.stringify({
    tracks: s.tracks.length,
    band: s.tracks.filter(t => t.name.indexOf('session take') >= 0).map(t => ({
      name: t.name,
      notes: (t.noteEvents || []).length,
      renderers: [...new Set((t.noteEvents || []).map(e => (e.provenance || {}).renderer))],
      origins: [...new Set((t.noteEvents || []).map(e => (e.provenance || {}).origin))],
    })),
    bassNotes: (s.tracks.filter(t => t.instrument === 'bass' && t.name.indexOf('session take') < 0)[0] || {}).noteEvents || [],
  })`;
  // "Play exactly what I played" needs something played: the bass channel
  // arrives empty now, so the player had nothing to copy and no take came
  // back, which this file was reading as a broken session band.
  await seedMelody(page, { trackInstrument: 'bass' });

  const before39 = JSON.parse(await session(page, COUNTS));
  console.log(`  bass channel holds ${before39.bassNotes.length} notes before the call`);

  const played = await ask(page, 'Bass player, play exactly what I played');
  await page.waitForTimeout(1200);
  const after39 = JSON.parse(await session(page, COUNTS));

  // The drummer was called earlier in this session and left a take of their
  // own, so what is checked is the one that just arrived.
  const bassTake = after39.band.find((t) => t.name.indexOf('Bass') === 0);
  check(
    'a take channel appeared beside the creator\'s own',
    !!bassTake && after39.tracks === before39.tracks + 1,
    bassTake ? `${bassTake.name} (${after39.band.length} band channel(s) in the session)` : 'no take channel'
  );
  check(
    'the creator\'s own channel was not touched',
    after39.bassNotes.length === before39.bassNotes.length,
    `${before39.bassNotes.length} -> ${after39.bassNotes.length} notes on the bass the creator played`
  );
  check(
    'the take holds the same number of notes',
    !!bassTake && bassTake.notes === before39.bassNotes.length,
    bassTake ? `${bassTake.notes} notes against ${before39.bassNotes.length} played` : ''
  );
  check(
    'every note names what rendered it',
    !!bassTake &&
      bassTake.renderers.length === 1 &&
      bassTake.renderers[0] === 'soulsonus-feel' &&
      bassTake.origins.join() === 'SESSION_PLAYER',
    bassTake ? `${bassTake.origins.join()} via ${bassTake.renderers.join()}` : ''
  );
  check(
    'the drummer\'s earlier call landed too',
    after39.band.some((t) => t.name.indexOf('Drummer') === 0),
    after39.band.map((t) => t.name).join(' | ')
  );
  check(
    'the reply shows the grant check that let it through',
    /worst onset moved [\d.]+ ms of the 30 ms allowed/.test(played),
    (played.match(/worst onset moved [^.]*\./) || ['not shown'])[0]
  );
  check(
    'and says the take sits beside, not over',
    /not over it/.test(played),
    'live musicians on top of your music'
  );

  // ---- 4. a verb about a track is still a verb ----
  console.log('\n-- an operation must not acquire a player --');
  for (const [text, word] of [
    ['Make the kick fatter', 'Bass'],
    ['The bass is masking the kick', 'Bass'],
  ]) {
    const r = await ask(page, text);
    check(
      `"${text}" is not answered by a player`,
      !/brief received/.test(r),
      r.split('\n')[0].slice(0, 58)
    );
    void word;
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
