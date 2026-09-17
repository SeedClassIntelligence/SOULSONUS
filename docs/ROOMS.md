# Every room, tab, rail entry and drawer — what each one is for

**CTO to CTO. This is the "what does it do" map.**

Its companion, `docs/UI_WIRING.md`, is the "how does it open and what
implements it" map. Read that one when you are moving a button. Read this one
when you are trying to understand the platform.

Rule of the house, and the reason both files exist: **nothing here needs
rebuilding.** If you are about to write a component, first find it below.

Every description is taken from the source, not from a plan. Where something
is a preview rather than a working capability, it says so — see §7.

---

## 1. The shape of it

One studio. One persistent project. One DAW. One recording system. The creator
meets it through three relationships, which are experiential, not routes:

| | |
|---|---|
| **THE BOOTH** | how I express and record ideas |
| **THE BAND** | who creates and performs with me |
| **THE CONTROL ROOM** | where what was recorded becomes editable material |

All three resolve into the same project, tracks, clips, takes, timeline,
mixer, MIDI, audio, effects, automation, revisions and provenance.

Three objects are kept apart on purpose, everywhere:

```
SOURCE            what the creator actually did
INTERPRETATION    what SoulSonus decided it meant
REALIZATION       what it currently sounds like
```

Changing the third never rewrites the first. `docs/ARCHITECTURE.md` is the
full statement of this.

---

## 2. The chrome that is always there

Top to bottom, in mount order in `App.tsx`.

| Surface | Component | What it is for |
|---|---|---|
| **Project header** | `Header.tsx` | Logo and home, editable project name, PROJECTS, the revision tree, the engine badge, the studio tour, the manual, EXPORT. Identity and lifecycle — nothing here changes the music. |
| **Transport row** | `StudioTransportBar.tsx` | Undo, rewind, play/pause, stop, loop, bar:beat counter, BPM, TAP, KEY with transpose steppers, SIG, the click, and the project grid. Everything a take is measured against, travelling with the button that plays it. **RECORD is deliberately not here** — see §3 CREATE. |
| **Room tabs** | `WorkspaceNav.tsx` | The six rooms. Also carries BLANK CANVAS and STUDIO INTELLIGENCE, which are session-level acts rather than rooms. |
| **Left rail** | `StudioUtilityBar.tsx` | Four groups of doors. §4. Collapses to icons. |
| **Right column** | `StudioIntelligenceColumn.tsx` | Studio Intelligence plus three readouts. §5. |
| **Status bar** | `StudioMasterStatusBar.tsx` | Master bus level, DSP load, project name and save state, SeedSignature state, rights, collaborators. What is true right now, never an action. |

### Two things in the header worth knowing

**The engine badge** (`EngineStatusBadge.tsx`) reports *what answered*, not
what is installed. It probes on mount and on demand and shows the reason it
got back — including "runs in this bundle, there is nothing to ask". An
inventory drifts; a creator finds out it drifted at the moment they needed it.

**The revision tree** (`RevisionTreePanel.tsx`) is a tree, not a stack. Walk
back three states to hear where a take was going, decide the older one was
right, edit from there — and still have the newer branch.

---

## 3. The six rooms

Ids are `CREATE · SOUNDS · WRITE_RECORD · MIX · MASTER · RELEASE`. Switch with
`setActiveWorkspace(id)` from `useStudioSession()`. **Do not rename the ids** —
`data-testid="room-<ID>"` is what the whole verification suite keys on.

### 1 · CREATE — the booth, the band and the control room on one screen

`StudioCanvas.tsx`. The busiest room and the default one. Top to bottom:

1. **`StudioRecordingSurface`** — the microphone, the song underneath it, and
   RECORD. Shows the armed channel, the playhead, the recording path (where
   this take will land), the mic preset, monitoring state and the input level.
   Then the ten **input meanings**: Record Audio, Beatbox, Clap, Hum, Mimic,
   Sing, Speak, MIDI, Import, Melody. These are not destinations. They answer
   one question — *how should SoulSonus understand what I am about to give
   it?* — and everything records to the armed track and the DAW timeline
   either way.

   RECORD lives here rather than in the transport row because what recording
   *means* on a pass is decided by the armed channel and the input meaning,
   and neither is visible from the mix room.

2. **`SessionBandPanel`** — the band. Seven roles from `lib/sessionBand.ts`,
   each showing what it hands back and what it listens for, and a grant:
   EXACTLY / AROUND IT / WHAT YOU FEEL. A player's take lands on its own
   channel beside yours; yours is never written over.

3. **Scope & sections** — the section tabs, bar focus, song length, and
   `SectionBuilder` behind EDIT SECTIONS: arrangement structure, segments,
   structure presets, pattern density across the song.

4. **The editing toolbar** — select, draw, stretch, split, erase; snap grid,
   scale snapping, transposition, quantize, velocity lane. Disclosed on ask
   rather than permanently open.

5. **The timeline and `UnifiedTrackLane`** — the DAW itself. Per-track source,
   sound, sonus, level, transform, clear and delete are one click behind the
   lane rather than three rows above it.

Also appearing here when opened: `InstrumentStrip` (the instrument reduced to
what fits on top of the arrangement), `ShootAroundControls` (the grid tools),
`InterpretationPanel` and `CreativeIntentPanel` after a take.

### 2 · SOUNDS — the creator's own recordings, kept

`PersonalTrainingModal` rendered **embedded**, opened on its sound-vault tab.
It is one component whether it is this room or the drawer, on purpose: two
implementations over one store is how a sound comes back in one place and not
the other. The room the owner asked for — *"one room to record a sound, keep
it, name it, hear it, and reach for it later."*

Its other tabs are training pillars, the head/body/keys/vocal calibration, and
the voice-cloning lab (§7).

### 3 · WRITE & RECORD — words, cadence and vocal takes

`workspaces/WriteRecordWorkspace.tsx`. Lyric drafting and cadence studio,
the vocal take stack, section-locked writing, and recording in sync with the
transport. The draft lives in the session, not in the component — leaving this
room to check the mix used to destroy whatever had been written.

Hook and cadence assistance goes through the real reasoning provider. It does
not append a stored sentence.

### 4 · MIX — the console

`mix/MixWorkspace.tsx`, three panels:

- **`MixingConsoleDesk`** — every channel: faders, mutes, solos, DSP bypass, aux sends, bus inserts.
- **`SelectedChannelWorkstation`** — the focused channel: dynamics, waveform, low shelf, parametric mid, air high shelf, inserts, splice at playhead, reverse clip.
- **`CoEngineerAnalysisSuite`** — live telemetry and the AI advisor: loudness target, true-peak ceiling, low-end delta, vocal presence delta, stereo width, reference comparison, saveable scenes.

### 5 · MASTER — the master bus and the finish line

`finish/FinishMasterWorkspace.tsx`, three panels:

- **`MasterStereoWaveformConsole`** — the stereo master print, the processor chain, the master target, and a stale flag when the mix has moved since the last print.
- **`MasteringTelemetrySuite`** — integrated LUFS, true-peak ceiling, clipping, mid and side energy, spectrum, reference.
- **`FinalizationGateAndSign`** — findings from the **real bounce measurement**, the master candidates, the quality gate and signing.

### 6 · RELEASE — provenance and delivery

`FinalizationGateAndSign` again, presented as the release room: the five-gate
quality finalization, the SHA-256 ledger and 24-bit / FLAC export.

---

## 4. The left rail, group by group

Everything here opens **over** the room you are in, except the two marked
*door*, which take you to the room. Keys are the `soulsonus:openDrawer` detail
strings — the full table is in `docs/UI_WIRING.md` §2.

### TOOLS & WORKSTATIONS

| Entry | Key | What it is |
|---|---|---|
| **Studio Recording** | *door → CREATE* | The booth. Takes you to the microphone. |
| **Piano / Keys** | `piano` | `VirtualPianoKeyboard` — a playable keyboard, computer keys mapped, into the armed channel. |
| **Instrument** | `capture` | `InstrumentRoom` — the performance instrument: Train / Play / Packs, eight real pad slots. Expands to the full room or sits on top of the arrangement as `InstrumentStrip`. |
| **Beat Machine** | `pattern` | `ShootAroundControls` — pattern operations grouped by what they do: clone a bar to all, nudge, invert, randomise, clear, undo, redo. |
| **Sourcing** | *context state* | `CreativeResourceVaultModal` — where sounds come from, with admission records behind them rather than badges. |
| **Workstation** | `workstation` | `TrackWorkstationDrawer` → `TrackProductionStrip`. The deep per-track production surface: layers, timbre, the sound behind each entry. |

### BAND & COLLABORATION

| Entry | Key | What it is |
|---|---|---|
| **Session Players** | *door → CREATE* | The band panel. Roles, grants, and calling a player. |
| **Background Vocals** | *door → CREATE* | The `BACKING_VOCALS` role. **Not a separate system** — same panel, same call. |
| **Collaboration** | `collab` | `CollaborationModal` — real collaborators, invitations, roles and contributions. Describes what is actually connected; it does not list invented people. |

### CREATIVE UTILITIES

| Entry | Key | What it is |
|---|---|---|
| **Songwriting** | `songwriting` | `SongwritingSuiteDrawer` → `WriteRecordStudio`. The writing room as a drawer over whatever you are doing. |
| **Vocal to Lyric** | `lyric` | `VocalToLyricWorkstation` — vocal seed → phonetic extraction → semantic clues → syllable map → song context → lyric alternatives → creator approval. Its own workstation because it carries state nothing else carries. |
| **Takes** | `takes` | `PerformanceTakePads` — the take slots. Pick which one the next pass lands on. |
| **My Sounds** | `training` | The training and sound-vault surface as a drawer. Same component as the SOUNDS room. |
| **MIDI Hardware** | `hardware` | `ExternalHardwareMidiDrawer` — controllers and hardware synths, bidirectional I/O, a live event monitor, a test note, and DAW bundle import/export. |
| **Import Audio** | *context state* | `AudioStemImportModal` — bring in audio, or separate a mix into stems through Demucs. |
| **Say It** | `voice` | `VoiceCommandBar` — speak or type a command in your own words. It reports what actually ran, not what was parsed. |

### STUDIO SYSTEMS

| Entry | Key | What it is |
|---|---|---|
| **Inspector** | `inspector` | `QuickInspectorDrawer` → `ContextualInspector`. Select any track and get fast polymorphic controls: explode to tracks, source decomposition, extract a single instrument, retain lineage, channel DSP, realization capability. |
| **Calibration** | `calibration` | `CalibrationDrawer` — FFT and detection calibration: mic gain, kick and snare sensitivity, low/sub and high/transient bands, and the studio's one way to stop capture. |
| **Radial Radar** | `visualization` | `VisualizationDrawer` — the radial step visualizer and track colour rings. |
| **Pipeline** | `soulflow` | `SoulFlowOrchestratorBar` — the governance pipeline: current stage, target stage, what must be fulfilled to advance, and a force override. |
| **Native Brain** | `nativebrain` | `NativeBrainDrawer` — which reasoning provider answers, the Ollama host, hyperparameters, a handshake test. Model-neutral by design. |
| **SeedSignature** | `seedsignature` | `SeedSignatureModal` — the cryptographic provenance tree and signing. |

---

## 5. The right column

`StudioIntelligenceColumn.tsx`. Four stacked panels. Collapses with its own X;
reopens from ✦ STUDIO INTELLIGENCE.

| Panel | What it is |
|---|---|
| **Studio Intelligence** | `StudioIntelligenceDrawer`, embedded. Not a chatbot: it operates against the current project, selected track, clip and section, the tracks, takes, players, arrangement, tempo, key, mix state, creative intent, preservation constraints and revision history. Five emphases — Producer, Engineer, Tutor, Guide, Manager. Anything that would change the session arrives as a **ChangeSet** with Preview / Apply / Alternative / Reject. It also answers an address: *"bass player, play what you feel in the hook"* calls that player. |
| **Capability Orchestrator** | Over `lib/capabilityRegistry.ts`. Thirteen capabilities, the eight providers that satisfy them, where each runs, and the seven-step request pipeline. **It describes; it does not dispatch** — and says so on its own face. |
| **Source → Intent → Realization** | The selected channel's three objects, from the track's own fields. Says "nothing recorded on this channel yet" rather than inventing a label. |
| **Provenance / Rights** | Revision count, creator signature state, and how many provider licences are still unverified. |

---

## 6. Things that are not on the rail

| Surface | How it opens | What it is |
|---|---|---|
| `ProjectMenu` | `projects` | Save, open, start. The rolling autosave already returns you where you were; this is for named versions. |
| `ExportModal` | `export` | Renders the project through the master bus, encodes it, bounces every track for stems and hands over real files. |
| `SoundLibraryModal` | `vault` | Auditions sounds through the studio's shared voices. |
| `RealizationCandidateDrawer` | `{ type: 'realization', … }` | A realization candidate with its preservation scorecard, and Apply / Alternative / Reject. A rejection never requires a reason. |
| `FocusModeView` | focus a track | One channel, alone. |
| `AiControlRoomModal` | header | Reasoning providers and the authority model. |
| `DatasetRegistryModal` | header | Dataset governance and dependency admission. |
| `StudioTourGuide` | STUDIO TOUR | The interactive tour, aspect by aspect. |
| `QuickHelpModal` | MANUAL | The studio manual and trigger reference. |
| `OverdubRecorder`, `VocalLayer`, `VocalTakeStack` | inside the write and vocal surfaces | Punch-in/punch-out with latency compensation, overdubbing in sync, and the take stack with raw provenance locked. |
| `vocal/*` | inside WRITE & RECORD | Comp builder, DSP strip, harmony and doubles, pitch and timing, voice identity. |

---

## 7. What is a preview rather than a working capability

Stated plainly so nobody demos it as finished.

- **Voice cloning / voice identity** (`VoiceCloneDrawer`). No
  singing-voice-synthesis model is wired into this deployment. ACE-Step's real
  tasks take audio or a style prompt, not lyrics-plus-a-chosen-voice — that is
  a different capability nothing in this stack provides yet. The picker is
  honest about being a preview.
- **Provider licences.** Every provider in the capability registry carries
  licence fields, and four of eight read `UNVERIFIED` — nobody has read them.
  Until they are, nothing rendered through ACE-Step, Demucs, Basic Pitch or
  SpessaSynth is cleared for release.
- **Capability dispatch.** The registry describes who satisfies what. Requests
  still route through `realizationRouter` and `e05Provider`. Resolving through
  the registry is the remaining half of that job.
- **`ACE_GENERATIVE_EXTENSION`.** Unimplemented: the realization request
  carries no target duration. Marked unrealized rather than quietly handing
  back the untouched source.
- **Engines are not bundled.** ACE-Step on `:8001` and Demucs on `:8010` are
  not started by the app. `npm run engines:check` says what is actually up.
  **The studio is a working studio with both of them down** — that is a
  design rule, not a coincidence.

---

## 8. Where the rest of it is written down

| | |
|---|---|
| `docs/ARCHITECTURE.md` | the architecture of record, and the table of which file implements each architectural term |
| `docs/UI_WIRING.md` | how each element opens, every drawer key, and the five gotchas |
| `docs/PARTS.md` | every open-source part, whether it is wired, and what is missing |
| `seed/SRT-1.md` + amendments | the constitutional corpus. `npm run seed:audit` reports conformance |
| `CLAUDE.md` | how to work in this repository at all |
