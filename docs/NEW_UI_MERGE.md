# The new UI, and how it joins the engine

**Read this before writing a line against the new front end.**

The owner rebuilt the interface from scratch, organized around the
architecture in `docs/ARCHITECTURE.md`. This file says exactly what arrived,
what it does and does not do, and what joining it to this repository's engine
costs.

The short version: **the new UI is the shell, this repository is the engine,
and they fit.** Neither is a replacement for the other.

---

## 1. What arrived, measured

A real React 19 / Vite 8 / Tailwind 4 application. Not a mockup.

| | |
|---|---|
| Total | **14,885 lines**, 40 components, 2 services, 2 type modules |
| Layout | `StudioTopBar` · `StudioSubTabs` · `StudioSidebar` · `StudioFooter` |
| Rooms | Booth, Band, BGV, Beat Machine, Piano/Keys, Instrument Workstation, Songwriting, Vocal-to-Lyric, Creator Training, Collaboration, Mix, Master, Release |
| DAW | `UnifiedDAW`, `BandSessionRow`, `SongSectionsBar` |
| Intelligence | `StudioIntelligencePanel`, `ChangeSetModal` |
| Systems | `CapabilityRegistryView`, `SmirInspectorView`, `ProvenanceRightsView`, `PipelineOrchestratorView`, `RevisionTreeTakesView`, `CalibrationView`, `StudioLobbyModal` |
| Services | `audioEngine.ts` (380 lines), `initialData.ts` (430 lines) |
| Types | `soulsonus.ts` (185), `creatorIntelligence.ts` (103) |

Its largest rooms are `CreatorTrainingView` (1,511), `MixRoomView` (1,292) and
`MasterRoomView` (1,253). This is a serious piece of work and the room
organization is better than what it replaces.

### What its audio engine really does

`services/audioEngine.ts` is genuine Web Audio, not a stub:

- oscillator-and-filter synth voices for the piano and the drum machine
- a step transport with a playhead callback
- **real `getUserMedia` mic monitoring** with an `AnalyserNode` driving the
  level and waveform

It does **not** do: onset detection, pitch tracking, classification, stem
separation, SoundFont playback, mastering DSP, bouncing, or persistence.

---

## 2. What it does not have, and this repository does

Nothing on this list is UI, and nothing on it is cheap to re-derive.

| | lines | what it is |
|---|---|---|
| `src/audio/` | 7,534 | Tone.js transport, spectral onset classifier, Basic Pitch, SoundFont, take recorder, mastering chain, true-peak limiter, master render |
| `src/lib/` | 10,988 | interpretation, realization routing, ChangeSet with guarantee bases, intent policy, realization verifier, session band, seed signature, revision tree, collaborative state, capability registry |
| `src/app/` | 6,462 | `StudioSessionContext` — **121 handlers**, undo/redo, revisions, autosave to IndexedDB |
| `scripts/live-verification/` | 9,782 | 65 live checks against a running studio |
| `seed/` | 6,004 | the constitutional corpus and its audit |
| `server/` | 688 | the `/api/e05` route to ACE-Step, the Redis collaboration relay |

**43,864 lines that are not the interface.** That is the asset. The UI is
replaceable; this is not.

---

## 3. Three things that must not ship as they are

Each is a measurement that was never taken, presented as one. This is the
exact defect class the seed corpus forbids, and this repository has corrected
it three times already.

1. **`services/audioEngine.ts` — the simulated microphone.**
   When `getUserMedia` throws, the `catch` falls through to a sine-and-cosine
   waveform generator on a 60 ms interval. A creator who denied the mic
   permission, or has no input device, sees a level meter moving and a
   waveform drawing. Amendment F: what the system hears is written. A meter
   that moves when nothing is being heard is worse than a dead meter.
   **Fix:** report that the microphone did not open. This repository's
   recording surface already has that path and its wording.

2. **`rooms/MixRoomView.tsx:315–323` — random meter deltas.**
   `(Math.random() - 0.5) * 8` and two more for left and right. Those are the
   mix meters. Replace with `audio/maskingAnalysis.ts` and the real channel
   telemetry, which exist.

3. **`rooms/CreatorTrainingView.tsx:359–361` — random VU level.**
   `0.45 + Math.random() * 0.5` while recording, `0.1 + Math.random() * 0.15`
   while not. Replace with the analyser level the engine already provides.

`services/initialData.ts` is demo content — the personas, revisions and
capability rows. Keep it as seed data for an empty session; never let it stand
where real state should be.

---

## 4. What each side contributes

**From the new UI, keep everything visual and structural:** the component
tree, the room organization, the sidebar, the sub-tabs, the styling, the
layout of every room.

**From this repository, keep everything below the components:** `src/audio`,
`src/lib`, `src/app`, `src/types`, `src/utils`, `src/data`, `server`,
`scripts`, `seed`, `docs`, `CLAUDE.md`.

**Two things the new UI contributes that this repository was missing**, and
they are the two gaps named in `docs/ARCHITECTURE.md` §12:

- **`SMIRIntent`** — a first-class shape for musical intent: phrase, source,
  intended role, contour, groove delta, emotional direction, preservation
  requirements, current realization, provider used. This repository had those
  fields scattered across five modules and no object holding them. Adopt this
  shape and back it with the real measurements.
- **`CapabilityEntry`** with `availableProviders` and a provider switch. This
  repository's registry describes but does not dispatch. That switch is the
  creator-facing half of the resolver, and it now has a shape to target.

---

## 5. The handler map

The new `App.tsx` holds about 25 handlers in local `useState`. The existing
`StudioSessionContext` holds 121 of them, already undoable, already revisioned
and already autosaving. Wiring is mostly deletion: remove the local state, take
the handler from `useStudioSession()`.

| New UI handler | Existing context | Note |
|---|---|---|
| `togglePlay` | `handleTogglePlay` | |
| `handleStop` | `handleStopTransport` | also cancels the draw queue |
| `toggleMetro` | `handleToggleMetronome` | real click, on the quarters |
| `toggleRecord` | `handleQuickPerformanceCapture` / `handleStopCapture` | one way to stop capture — see `CalibrationDrawer`'s note |
| `handleToggleMute` / `Solo` / `Arm` | `handleToggleMute` / `handleToggleSolo` / `handleUpdateTrack` | |
| `handleChangeVolume` | `handleChangeVolume` | same name |
| `handleNewRecordingTake` | the capture path in `StudioRecordingSurface` | modality decides interpretation |
| `handleProposeChangeSet` | `lib/changeSet.ts` + `intelligence/OperationPlanner` | guarantees carry a basis |
| `handleApplyChangeSet` | `handleCommitCandidateTransaction` | revisioned, undoable |
| `handleRejectChangeSet` | `handleRejectCandidate` | a reason is never required |
| `handleInstructPlayer` | `handleCallSessionPlayer` | takes role, grant, direction |
| `handleAddSessionPlayer` | `lib/sessionBand.ts` | **seven roles exist; the personas do not** |
| `handleSwitchProvider` | `lib/capabilityRegistry.ts` | describes today, does not dispatch |
| `handleRestoreRevision` | `handleJumpToRevision` / `handleAdoptFromRevision` | a tree, not a stack |
| `handleSendPatternToTrack` | `handleCloneBarToAll` and the pattern ops | |
| `handleRecordKeysToTrack` | `audio/midiCapture.ts` + `handleAddNote` | |
| `handleAddCreatorSoundToSession` | the creator sound vault in `PersonalTrainingModal` | one store, not two |
| `handleApplyHarmonyToTrack` | `handleUpdateHarmonySettings` | |
| `handleSelectTab` | `setActiveWorkspace` | **ids must stay `CREATE · SOUNDS · WRITE_RECORD · MIX · MASTER · RELEASE`** — 65 live checks key on `room-<ID>` |

### Type reconciliation

The new `Track` is a presentation shape: `number`, `subtitle`, `color`,
`plugins`, `bus`, `clips`, `activeTake`. The existing `Track` is the project
shape: `noteEvents`, `audioClips`, `layers`, `seedType`, `originType`,
`detectionProfile`, `dspSettings`, `automationLanes`, `sourceAsset`.

**The existing one is canonical.** The new fields are a view over it —
`number` is the index, `subtitle` is derived from `instrument` and
`originType`, `plugins` is the insert chain. Do not replace the project shape
with the view; `docs/ARCHITECTURE.md` §9 is the rule.

---

## 6. Order of work

1. Start the new repository from **this** repository, so the engine, the
   checks and the seed corpus come with it. Then replace `src/components` and
   `src/App.tsx` with the new UI's.
2. Delete `services/audioEngine.ts` and point the new components at
   `audio/audioEngine.ts`. The synth voices worth keeping move to
   `audio/instrumentVoices.ts`, which already holds that kind of thing.
3. Wrap the new `App.tsx` in `StudioSessionProvider` and delete the local
   state list, handler by handler, against §5.
4. Remove the three simulations in §3 as each room is wired.
5. Keep `initialData.ts` as the empty-session seed only.
6. Re-point the live checks. They address by `data-testid` and by `title`;
   those attributes need to land on the new components. That is the single
   biggest chunk of work and it is also the only reason anyone will know the
   result works.
7. `npm run seed:audit` must not regress: 104 honored, 2 absent.

Steps 1 to 5 are mechanical. Step 6 is the real job, and skipping it is how
the platform goes back to being unverifiable.
