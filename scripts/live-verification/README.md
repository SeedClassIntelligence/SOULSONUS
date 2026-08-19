# SoulSonus live verification harness

Drives the running app in headless Chromium (Playwright) with a synthetic
microphone signal, and reads real session state out of the React fiber tree,
so claims made by the UI can be checked against what the code actually does.

## Running

```bash
npm run dev &                                   # app on :3000
export SOULSONUS_VERIFY_DIR=/tmp/soulsonus-verify
node scripts/live-verification/generate-test-audio.cjs   # synth beatbox / hum clips
node scripts/live-verification/test-01-mix-proposals.cjs
node scripts/live-verification/test-02-mastering-chain.cjs
node scripts/live-verification/test-03-capture-e2e.cjs
node scripts/live-verification/test-03b-transport.cjs
node scripts/live-verification/test-04-overdub-and-chrome.cjs
node scripts/live-verification/test-05-overdub-detail.cjs
```

The mic is fed via Chromium's `--use-file-for-fake-audio-capture`. Note that
the fake device is **not** rate-limited to real time — a clip can be consumed
much faster than wall-clock, so treat elapsed-time assertions with care.

## What each test answers

| Test | Question |
|---|---|
| `test-01-mix-proposals` | Are the Mix room's "% Match" masking proposals measured from the track audio? Do AUDITION / COMMIT reach the signal path? |
| `test-02-mastering-chain` | Do the 7 mastering stages construct any DSP? Do the LUFS / true-peak readouts respond to the sliders? |
| `test-03-capture-e2e` | Do BEATBOX / CLAP / HUM produce real NoteEvents derived from the fed audio, or a canned pattern? |
| `test-03b-transport` | Do captured notes get a real `startTick` from the playhead? |
| `test-04-overdub-and-chrome` | Page title, SEEDSIGNATURE footer state, vocal overdub. |
| `test-05-overdub-detail` | Does the overdub produce a decodable, non-silent take? |
| `test-06-classifier-offline` | Browser-free: does the classifier separate the sound types at all? Tells a detection failure apart from a routing failure. |
| `test-07-channel-separation` | **The gate.** One clip with several sound types in, one channel per type out, nothing anywhere else. |
| `test-08-event-dump` | Dumps every classified event's features, for sizing thresholds. |
| `test-09-independent-editing` | After separation, can each channel be moved / re-velocitied / muted / soloed without touching the others? |
| `test-10-midi-separation` | MIDI notes land on the channel their note+channel names, and nowhere else. |
| `test-11-upload-case-a` | An uploaded solo take separates the same way the live-mic'd take does. |
| `test-12-content-discrimination` | Does the Case A / Case B suggestion discriminate — and does it admit when it can't? |
| `test-13-failure-visibility` | Neither upload path may silently fall back to broadcasting. |
| `test-14-upload-case-b` | A full mix routes to stem separation and produces distinct stems carrying real audio. |
| `test-15-cross-room-persistence` | What survives a room switch: session data, open drawers, canvas component identity, playback, live capture. |
| `test-16-drawer-triggers` | Every drawer trigger opens the drawer it claims to, and where each is reachable from. |
| `test-17-drawer-contents` | Do the controls inside each drawer create audio or change state? |
| `test-18-drawer-tabs` | Walks every tab inside the multi-tab workstations, not just the default one. |
| `test-19-loudness-accuracy` | Browser-free: checks the loudness engine against EBU Tech 3341 and BS.1770-4 reference cases. |
| `test-20-master-bounce` | Bounces the project, measures it, moves each mastering stage, and encodes real WAV/FLAC. |
| `test-21-persistence` | Does a creator's work survive a reload? Named versions, new project, reopen. |
| `test-22-extract-stems` | Does Extract Stems use the actual take, and refuse honestly when there is none? |
| `test-23-masking-analysis` | Is the Mix advisor measured — and silent on an empty canvas? |
| `test-24-vocal-take-persistence` | Does a recorded vocal Blob survive a reload and re-decode? |
| `test-25-global-utilities` | Are all nine utility triggers reachable and working from all six rooms? |

## Two harness traps these tests hit

Both produced false "inert" verdicts before being fixed, so check them before
believing a control is decorative:

- **Snapshot too narrow.** Vocal drawers write `pitchSettings`, `harmonySettings`
  and `voiceIdentitySettings` onto the *track*. A snapshot of only volume/mute/DSP
  misses them. `test-18` snapshots the whole session.
- **Wrong event.** Several sliders commit on `onPointerUp`, not `change`. Setting
  `.value` and dispatching `input`/`change` alone leaves the commit unfired.

## MIDI and stem-separation dependencies

`test-10` stubs the browser's Web MIDI transport (`navigator.requestMIDIAccess`)
because no device exists here. Everything above the transport — byte parsing,
the GM map, routing, note commit — is the app's own code.

`test-14` needs a stem-separation service on `http://localhost:8010`. Run the
real one from `inference-server/`, or the transport stub for CI:

```bash
python -m uvicorn stem-service-stub:app --host 0.0.0.0 --port 8010
```

The stub speaks the real protocol and returns real, input-derived audio, so it
exercises the app's whole Case B path. It is **not** Demucs and proves nothing
about separation quality.

## Reading state out of the app

`lib.cjs` walks React's fiber tree to read live session state. It starts from
`fiberRoot.current`, **not** from the container fiber: starting at the container
can land on a stale alternate fiber and return an old context value, which makes
edits look like they never applied. An earlier version of this harness had that
bug and produced intermittent false failures — if a test reports that a state
change did not take, confirm it against the DOM before believing it.
