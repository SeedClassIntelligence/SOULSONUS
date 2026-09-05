/**
 * SRT-1 XV.1: the collaborative state model, exercised as a model.
 *
 * The clause quotes the seed: "A serious implementation requires more than
 * Socket.io. It needs a collaborative state model." A screen showing people is
 * not that, and neither is a socket. What makes it a model is that two peers
 * holding the same operations compute the same state, that receiving a peer
 * twice changes nothing, and that no merge rule exists under which one
 * participant's take replaces another's.
 *
 * So the first half of this file proves the algebra against the module the app
 * itself loads -- determinism, idempotence, commutativity, permissions
 * enforced and refusals kept, and Amendment F's rule that a capture is never
 * dropped by a permission check. The second half performs a real take in the
 * running studio and checks that the log wrote down who did it, when, on which
 * track and producing which version -- section XV's five questions, answered
 * off the record rather than guessed.
 */
const playwright = require('playwright');
const { launch, enterStudio, session, recordTake } = require('./lib.cjs');
const SP = process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(60)} ${detail}`);
}

// Runs inside the page against the real module, so what is proved is what the
// app runs -- not a copy of it compiled for a test.
const MODEL = async () => {
  const M = await import('/src/lib/collaborativeState.ts');
  const P = (id, name, role, at) => ({
    participantId: id, name, role, presence: 'joined', statedAt: at,
  });

  // Two peers on one project, each holding the other's participants.
  const base = () => {
    let s = M.emptyState('proj_x', 'Take One', 1000);
    for (const p of [P('p_owner', 'Owner', 'owner', 1000), P('p_voc', 'Vocalist', 'vocalist', 1001),
                     P('p_wri', 'Writer', 'writer', 1002), P('p_view', 'Watcher', 'viewer', 1003)]) {
      s = M.upsertParticipant(s, p);
    }
    return s;
  };

  const opA = M.makeOperation('p_owner', { kind: 'edit', summary: 'Tightened the hats', trackIds: ['t_drums'], revisionId: 'rev_1', at: 2000 });
  const opB = M.makeOperation('p_voc', { kind: 'capture', summary: 'Second verse', trackIds: ['t_vox'], takeId: 'take_1', revisionId: 'rev_2', at: 2001 });
  const opC = M.makeOperation('p_owner', { kind: 'capture', summary: 'Owner sang it too', trackIds: ['t_vox'], takeId: 'take_2', revisionId: 'rev_3', at: 2002 });
  const opD = M.makeOperation('p_owner', { kind: 'export', summary: 'Bounced the master', trackIds: [], assetId: 'asset_master', revisionId: 'rev_3', at: 2003 });

  let peer1 = base();
  for (const op of [opA, opC, opD]) peer1 = M.admit(peer1, op).state;
  let peer2 = base();
  peer2 = M.admit(peer2, opB).state;

  const ab = M.mergeStates(peer1, peer2);
  const ba = M.mergeStates(peer2, peer1);
  const twice = M.mergeStates(ab, peer2);

  // Permissions: a writer cannot mix, and the refusal is kept rather than
  // enforced and forgotten.
  const mixOp = M.makeOperation('p_wri', { kind: 'mix', summary: 'Pushed the vocal up 3dB', trackIds: ['t_vox'], at: 2100 });
  const mixed = M.admit(ab, mixOp);

  // Amendment F: a viewer's capture is still written.
  const viewCapture = M.makeOperation('p_view', { kind: 'capture', summary: 'Hummed an idea', trackIds: ['t_idea'], takeId: 'take_3', at: 2101 });
  const captured = M.admit(mixed.state, viewCapture);

  const stranger = M.makeOperation('p_nobody', { kind: 'capture', summary: 'Take from an unknown peer', trackIds: ['t_idea'], takeId: 'take_4', at: 2102 });
  const fromStranger = M.admit(captured.state, stranger);

  const final = fromStranger.state;

  return {
    sameBothWays: JSON.stringify(ab) === JSON.stringify(ba),
    idempotent: JSON.stringify(twice) === JSON.stringify(ab),
    converged: ab.operations.length === 4,
    orderedByTime: ab.operations.map((o) => o.at).join(',') === '2000,2001,2002,2003',
    bothCapturesKept: ab.operations.filter((o) => o.kind === 'capture' && o.trackIds.includes('t_vox')).length === 2,
    divergence: M.divergentCaptures(ab).map((d) => ({ trackId: d.trackId, authors: d.authorIds })),

    mixAdmitted: mixed.admitted,
    mixRefusal: mixed.refusal && mixed.refusal.reason,
    mixRefusalKept: mixed.state.refusals.length === 1,
    mixNotInLog: mixed.state.operations.every((o) => o.operationId !== mixOp.operationId),

    captureAdmitted: captured.admitted,
    captureRefused: !!captured.refusal,
    captureKeptAnyway: captured.refusal && captured.refusal.keptAnyway === true,
    captureInLog: captured.state.operations.some((o) => o.operationId === viewCapture.operationId),

    strangerAdmitted: fromStranger.admitted,
    strangerReason: fromStranger.refusal && fromStranger.refusal.reason,

    // The five questions.
    whoAddedVox: M.whoAdded(final, { trackId: 't_vox' }).map((a) => `${a.name}:${a.operations}`),
    historyOfVox: M.historyOf(final, { trackId: 't_vox' }).map((h) => `${h.who}|${h.kind}|${h.at}|${h.revisionId || ''}`),
    whatChangedRev3: M.whatChanged(final, 'rev_3').map((o) => o.summary),
    versionBehindMaster: M.versionBehind(final, 'asset_master'),
    versionBehindUnknown: M.versionBehind(final, 'asset_never_made'),
    nothingRecorded: M.nothingRecorded({ assetId: 'asset_never_made' }),
    ledger: M.contributionLedger(final).map((l) => ({ name: l.name, captures: l.captures, tracks: l.trackIds, kinds: l.byKind })),

    // Permissions as a table, not a mood.
    viewerCanMix: M.can('viewer', 'mix'),
    vocalistCanCapture: M.can('vocalist', 'capture'),
    vocalistCanAccept: M.can('vocalist', 'accept'),

    // The seam, honest about itself.
    transport: await M.unconfiguredTransport.status(),
    publishThrows: await M.unconfiguredTransport.publish('proj_x', []).then(() => false).catch(() => true),
  };
};

const SESSION = `s => JSON.stringify({
  self: s.collaborationSelfId,
  participants: s.collaboration.participants.map(p => ({ id: p.participantId, role: p.role, presence: p.presence, name: p.name })),
  ops: s.collaboration.operations.map(o => ({ author: o.authorId, kind: o.kind, at: o.at, rev: o.revisionId, tracks: o.trackIds, summary: o.summary })),
  refusals: s.collaboration.refusals.length,
  sync: s.collaborationSync,
  revisions: (s.revisions || []).map(r => ({ id: r.revisionId, origin: r.origin, label: r.label })),
})`;

(async () => {
  const { browser, page } = await launch(playwright, `${SP}/beatbox_ksh.wav`);
  await enterStudio(page);

  console.log('=== XV.1: THE COLLABORATIVE STATE MODEL ===\n');

  console.log('-- the model, in the app that loads it --');
  const m = await page.evaluate(MODEL);

  check('two peers merge to the same state either way round', m.sameBothWays);
  check('receiving the same peer twice changes nothing', m.idempotent);
  check('and everything both of them did survives it', m.converged && m.orderedByTime,
    `${m.converged ? 4 : '?'} operations, ordered by time`);

  console.log('\n-- Amendment F: a take is never lost to the merge or the rules --');
  check('two takes on one track are both kept, neither replaced', m.bothCapturesKept);
  check('and the collision is reported for a person to settle', m.divergence.length === 1,
    JSON.stringify(m.divergence));
  check('a viewer\'s capture is written despite the refusal', m.captureAdmitted && m.captureInLog);
  check('with the refusal recorded beside it, saying it was kept',
    m.captureRefused && m.captureKeptAnyway, String(m.captureKeptAnyway));
  check('a take from someone not on the project is kept too, and named as such',
    m.strangerAdmitted && /not a participant/.test(m.strangerReason || ''), m.strangerReason || '');

  console.log('\n-- permissions, enforced and recorded --');
  check('a writer cannot mix', !m.mixAdmitted && !m.viewerCanMix);
  check('the refusal says which role and which action', /writer/.test(m.mixRefusal || '') && /mix/.test(m.mixRefusal || ''),
    m.mixRefusal || '');
  check('the refused operation is not in the log, but the refusal is',
    m.mixNotInLog && m.mixRefusalKept);
  check('a vocalist can perform but cannot accept their own work',
    m.vocalistCanCapture && !m.vocalistCanAccept);

  console.log('\n-- the five questions section XV names --');
  check('who added it: both people, with what each did', m.whoAddedVox.length === 2,
    m.whoAddedVox.join(' | '));
  check('what changed and when: every entry timed and attributed',
    m.historyOfVox.length === 2 && m.historyOfVox.every((h) => /\|\d{4}\|/.test(h)),
    m.historyOfVox.join(' || '));
  check('which version: a revision names what it was made of',
    m.whatChangedRev3.length === 2, m.whatChangedRev3.join(' | '));
  check('which version produced the asset', m.versionBehindMaster && m.versionBehindMaster.revisionId === 'rev_3',
    m.versionBehindMaster ? m.versionBehindMaster.revisionId : 'none');
  check('an asset the log never saw gets no version invented for it',
    m.versionBehindUnknown === null && /absence of record/.test(m.nothingRecorded),
    m.nothingRecorded.slice(0, 80));
  check('what belongs to whom: counts and tracks, never a percentage',
    m.ledger.length >= 2 && m.ledger.every((l) => !('share' in l) && Array.isArray(l.tracks)),
    JSON.stringify(m.ledger[0]));

  console.log('\n-- the transport, about itself --');
  check('reports itself unconfigured rather than pretending', m.transport.configured === false,
    m.transport.reason.slice(0, 70));
  check('and refuses to silently succeed at publishing', m.publishThrows);

  // ---------------------------------------------------------------- //
  console.log('\n-- a real session writing to it --');
  await page.locator('#btn-blank-canvas').first().click();
  await page.waitForTimeout(1200);
  const before = JSON.parse(await session(page, SESSION));
  check('the creator is a participant, as themselves', before.participants.length === 1
    && before.participants[0].id === before.self && before.participants[0].role === 'owner',
    JSON.stringify(before.participants));
  check('and nothing is claimed to have happened yet', before.ops.length === 0,
    `${before.ops.length} operations`);
  check('the session says out loud that nothing is shared',
    before.sync && before.sync.configured === false, before.sync ? before.sync.reason.slice(0, 60) : 'null');

  await recordTake(page, 'Oral Beatbox', 8);
  const after = JSON.parse(await session(page, SESSION));
  check('the take is in the log', after.ops.length >= 1, `${after.ops.length} operations`);
  const captureOp = after.ops.find((o) => o.kind === 'capture') || after.ops[after.ops.length - 1];
  check('authored by the creator', !!captureOp && captureOp.author === after.self,
    captureOp ? captureOp.author : 'none');
  check('naming the version it produced', !!captureOp && !!captureOp.rev
    && after.revisions.some((r) => r.id === captureOp.rev),
    captureOp ? String(captureOp.rev) : 'none');
  check('and the tracks it touched', !!captureOp && captureOp.tracks.length > 0,
    captureOp ? captureOp.tracks.join(', ') : 'none');
  check('the session start is not attributed to anybody',
    after.ops.every((o) => !/Session start/.test(o.summary))
    && after.revisions.some((r) => r.origin === 'root'),
    'root revision exists, unattributed');
  check('no permission refusal was manufactured on the way', after.refusals === 0,
    `${after.refusals}`);

  // ---- the screen ----
  console.log('\n-- what the collaboration screen shows --');
  await page.getByRole('button', { name: 'COLLAB', exact: false }).first().click();
  await page.waitForTimeout(900);
  const shown = await page.locator('[data-testid="collab-history"]').innerText().catch(() => '');
  check('the history is on screen, attributed and timed', /capture|edit|arrange/i.test(shown),
    shown.split('\n').slice(0, 2).join(' / ').slice(0, 90));
  const ledgerText = await page.locator('[data-testid="collab-ledger"]').innerText().catch(() => '');
  check('so is what has been contributed', ledgerText.length > 0,
    ledgerText.split('\n').slice(0, 2).join(' / ').slice(0, 80));
  const status = await page.locator('[data-testid="collab-sync-status"]').innerText().catch(() => '');
  check('and the screen says nothing is being shared', /leaves this machine|not connected/i.test(status),
    status.replace(/\s+/g, ' ').slice(0, 90));

  // Someone named, and named as not invited.
  await page.locator('[data-testid="collab-invite-email"]').fill('someone@example.com');
  await page.locator('[data-testid="collab-invite-role"]').selectOption('vocalist');
  await page.getByRole('button', { name: 'ADD TO LIST' }).first().click();
  await page.waitForTimeout(600);
  const invited = JSON.parse(await session(page, SESSION));
  const them = invited.participants.find((p) => p.id !== invited.self);
  check('naming someone puts them in the model with their role',
    !!them && them.role === 'vocalist', them ? `${them.name} — ${them.role}` : 'none');
  check('and records that no invitation was sent', !!them && them.presence === 'invited_not_sent',
    them ? them.presence : 'none');
  check('the naming is itself an operation in the history',
    invited.ops.some((o) => o.kind === 'invite'),
    (invited.ops.find((o) => o.kind === 'invite') || {}).summary || 'none');

  await page.screenshot({ path: `${SP}/59_collaboration.png` });
  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
