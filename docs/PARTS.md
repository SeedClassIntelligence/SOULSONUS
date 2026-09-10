# The parts, and what is attached to them

The point of this file is that nobody re-derives it. It is the inventory of
what SoulSonus runs on, whether each part is actually wired to a code path,
and what is missing to make it work. Every "works" below cites the check that
proves it, run 2026-09-09.

**The rule this file exists to serve: the parts do the work. Our job is the
wiring.** Anything hand-written that one of these already does is a defect,
not a feature.

---

## In the browser — no service needed

| Part | Does | Attached | Proven by |
|---|---|---|---|
| **Spectral onset classifier** (`audio/detectionEngine.ts`) | Hears onsets live, classifies each as kick/snare/hat/tonal, routes to channels | yes | `test-06-classifier-offline`, `test-07-channel-separation` |
| **Basic Pitch** (ONNX, `audio/basicPitch.ts`) | Audio → pitched notes | yes | `test-40-hum-to-notes` |
| **SpessaSynth** (`audio/soundFont.ts`) | SoundFont/SF2 playback | yes, lazy-loaded | `test-43-soundfont` |
| **Tone.js** (`audio/audioEngine.ts`) | Transport, scheduling, DSP | yes | `test-03b-transport`, `test-48-kit-plays-live` |

`audio/offlinePerformanceAnalysis.ts` runs the same onset detection over a
decoded buffer, so an imported file and a live take are read by one taxonomy.

## Bringing it up

```
npm run studio          the app plus both engines, and a report of what answered
npm run studio -- --app the app only
```

It starts nothing new: `docker compose` for the services, `vite` for the app,
and `engines:check` for the report — each of which already existed and each of
which had to be known about separately. Anything that did not answer prints the
command that fixes it.

## Services — wired, and each needs a host running

| Part | Does | Attached | Missing |
|---|---|---|---|
| **Demucs v4** | Full mix → four stems | yes, via the app's import path | a host on `:8010`. `cd inference-server && docker compose up -d demucs` (CPU, no GPU) |
| **ACE-Step 1.5** | Realization: take + instruction → audio | yes, via `server/e05Route.ts` → `/api/e05` | a host on `:8001`. Locally: `docker compose up -d ace-step` (~10GB weights, NVIDIA GPU). No GPU: `inference-server/gcp/` creates a rented one and tunnels it to `localhost:8001` — see `inference-server/README.md` |

Both are proven end to end against transport stubs that speak the real wire
protocol — `test-14`, `test-22`, `test-56` all pass. What is unproven is
quality, which is the model's job, not ours.

`npm run engines:check` reports which of these answered. The app's own badge
(`lib/engineStatus.ts`) probes four engines and says which are live.

## Installed and used by nothing

| Package | Status |
|---|---|
| `@xenova/transformers` | **zero imports** in `src/`, `server/`, `scripts/` |
| `@google/genai` | **zero imports** anywhere |

Either they get wired to something or they come out of `package.json`. Right
now they are weight in the install with no path to them.

---

## Hand-built where a part already had it

The list this file exists to keep short.

| Hand-built | The part that already does it | State |
|---|---|---|
| **Tap tempo** (`StudioRecordingSurface`, `tapTempo`) — averages finger-clicks | `expressionState.ts:159` already computes the intervals between the onsets of a real take; `analyzePerformanceBuffer` does the same offline | **open.** The only BPM *producer* in the codebase is that button. Fourteen other sites consume a typed number. The tempo should be read off the performance; TAP stays as the override for when there is nothing to hear yet. |

### Not yet checked

Named so the boundary is visible rather than implied. Nothing below has been
verified either way, and none of it should be asserted until it is:

- pitch shift / transpose — ours vs. what Tone.js provides
- time-stretch and quantize (`lib/timingModes.ts`) — ours vs. Tone.js transport math
- the mastering chain (`audio/masterRender.ts`) — ours vs. Tone.js DSP nodes
- loudness / LUFS measurement — ours vs. anything in the tree
- waveform rendering and peak extraction
