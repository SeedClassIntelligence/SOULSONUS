/**
 * Acceptance: once separated, each channel must be independently editable —
 * move notes, change velocity, mute/solo — without disturbing the others.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, armCapture } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

const SNAP = `s => Object.fromEntries(s.tracks
  .filter(t => (t.noteEvents||[]).some(n => String(n.id).startsWith('rec_')))
  .map(t => [t.instrument, {
    id: t.id, mute: t.mute, solo: t.solo,
    notes: (t.noteEvents||[]).filter(n => String(n.id).startsWith('rec_'))
      .map(n => ({ id: n.id, tick: n.startTick, midi: n.midiNote, vel: n.velocity })),
  }]))`;

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);
  await armCapture(page, 'BEATBOX', { settle: 0 });
  await page.waitForTimeout(1200);
  await page.locator('button[title="Play (Space)"]').first().click().catch(() => {});
  await page.waitForTimeout(11000);
  // Stop the transport AND the mic engine, so the take is stable while we edit.
  await page.locator('button[title="Stop Playhead"]').first().click().catch(() => {});
  await page.locator('button[title="Toggle Mic Recording Engine"]').first().click().catch(() => {});
  await page.waitForTimeout(1500);

  const before = await session(page, SNAP);
  console.log('=== INDEPENDENT EDITING ===');
  console.log('separated channels:', Object.keys(before).join(', '));
  for (const [k, v] of Object.entries(before)) console.log(`  ${k}: ${v.notes.length} notes`);

  // Re-resolve the live context on every call — React rebuilds the value object
  // each render, so a cached reference goes stale and silently no-ops.
  await page.evaluate(`window.__studio = () => {
    const root = document.getElementById('root');
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    const fiberRoot = root[key] && root[key].stateNode;
    const stack = [(fiberRoot && fiberRoot.current) || root[key]]; const seen = new Set();
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      const v = f.memoizedProps && f.memoizedProps.value;
      if (v && Array.isArray(v.tracks) && v.handleMoveNotes) return v;
      if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
    }
    throw new Error('studio context not found');
  }`);

  const kickId = before.kick.id;
  const moveIds = before.kick.notes.slice(0, 3).map(n => n.id);

  await page.evaluate(`window.__studio().handleMoveNotes(${JSON.stringify(kickId)}, ${JSON.stringify(moveIds)}, 240, 0)`);
  await page.waitForTimeout(700);
  const afterMove = await session(page, SNAP);

  for (const nid of moveIds) {
    await page.evaluate(`window.__studio().handleSetNoteVelocity(${JSON.stringify(kickId)}, ${JSON.stringify(nid)}, 33)`);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);
  const afterVel = await session(page, SNAP);

  await page.evaluate(`window.__studio().handleToggleMute(${JSON.stringify(before.snare.id)})`);
  await page.waitForTimeout(700);
  const afterMute = await session(page, SNAP);

  await page.evaluate(`window.__studio().handleToggleSolo(${JSON.stringify(before.hihat.id)})`);
  await page.waitForTimeout(700);
  const afterSolo = await session(page, SNAP);

  const others = Object.keys(before).filter(k => k !== 'kick');
  console.log('\n-- move 3 kick notes by +240 ticks --');
  const pick = (snap, ids) => ids.map(id => (snap.kick.notes.find(n => n.id === id) || {}).tick);
  const wasTicks = pick(before, moveIds), nowTicks = pick(afterMove, moveIds);
  const movedRight = nowTicks.every((t, i) => t === wasTicks[i] + 240);
  console.log('  kick note ticks       :', wasTicks.join(',') , '->', nowTicks.join(','),
              movedRight ? 'PASS (+240 each)' : 'FAIL');
  console.log('  other channels intact :', others.every(k => eq(before[k].notes, afterMove[k].notes)) ? 'PASS' : 'FAIL');

  console.log('\n-- set those 3 kick notes to velocity 33 --');
  const vels = afterVel.kick.notes.filter(n => moveIds.includes(n.id)).map(n=>n.vel);
  console.log('  kick velocities       :', vels.join(','), vels.every(v=>v===33) ? 'PASS' : 'FAIL');
  console.log('  other channels intact :', others.every(k => eq(afterMove[k].notes, afterVel[k].notes)) ? 'PASS' : 'FAIL');

  console.log('\n-- mute the snare channel --');
  console.log('  snare muted           :', afterMute.snare.mute === true ? 'PASS' : 'FAIL (mute=' + afterMute.snare.mute + ')');
  console.log('  others unmuted        :', Object.keys(afterMute).filter(k=>k!=='snare').every(k => afterMute[k].mute === false) ? 'PASS' : 'FAIL');
  console.log('  no notes disturbed    :', Object.keys(afterMute).every(k => eq(afterVel[k].notes, afterMute[k].notes)) ? 'PASS' : 'FAIL');

  console.log('\n-- solo the hi-hat channel --');
  console.log('  hihat soloed          :', afterSolo.hihat.solo === true ? 'PASS' : 'FAIL');
  console.log('  others not soloed     :', Object.keys(afterSolo).filter(k=>k!=='hihat').every(k => afterSolo[k].solo === false) ? 'PASS' : 'FAIL');
  console.log('  snare stayed muted    :', afterSolo.snare.mute === true ? 'PASS' : 'FAIL');
  console.log('  no notes disturbed    :', Object.keys(afterSolo).every(k => eq(afterMute[k].notes, afterSolo[k].notes)) ? 'PASS' : 'FAIL');

  // Diagnostics for anything that did not hold.
  console.log('\n-- diagnostics --');
  const allIds = Object.values(before).flatMap(v => v.notes.map(n => n.id));
  console.log('  total captured notes:', allIds.length, ' unique ids:', new Set(allIds).size,
              new Set(allIds).size === allIds.length ? '(no duplicate ids)' : '(DUPLICATE IDS PRESENT)');
  console.log('  targeted note ids   :', JSON.stringify(moveIds));
  console.log('  their velocities    :', JSON.stringify(afterVel.kick.notes.filter(n => moveIds.includes(n.id))));
  for (const k of Object.keys(afterMute)) {
    if (!eq(afterVel[k].notes, afterMute[k].notes)) {
      const a = afterVel[k].notes, b = afterMute[k].notes;
      console.log(`  channel ${k} changed across the mute: ${a.length} -> ${b.length} notes`);
      const aIds = new Set(a.map(n => n.id)), bIds = new Set(b.map(n => n.id));
      console.log('    added  :', JSON.stringify(b.filter(n => !aIds.has(n.id)).slice(0, 4)));
      console.log('    removed:', JSON.stringify(a.filter(n => !bIds.has(n.id)).slice(0, 4)));
      const changed = b.filter(n => { const m = a.find(x => x.id === n.id); return m && !eq(m, n); });
      console.log('    altered:', JSON.stringify(changed.slice(0, 4)));
    }
  }

  await browser.close();
})();
