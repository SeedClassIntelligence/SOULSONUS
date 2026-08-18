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
