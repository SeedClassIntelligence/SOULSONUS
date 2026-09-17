# The new layout, wired to what already exists

**CTO to CTO. Read this before writing a component.**

The layout in the owner's mockup is a **rearrangement**. Not one element in it
needs a new room, a new drawer, or a new capability. Every panel, button and
rail entry below already has something behind it, and this file names what.

The failure this document exists to prevent: someone reads "Beat Machine" on
the left rail, does not find a `BeatMachine.tsx`, and builds one — beside the
pads that already exist. That is how a platform grows two of everything.

---

## 1. The three ways anything opens

There are exactly three. Use one of them; do not add a fourth.

**A. The drawer event.** Almost everything.

```ts
window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail: '<key>' }))
```

`App.tsx` listens once and owns every drawer's open state. A new button is a
new call with an existing key — never a new state flag.

**B. The same event, caught by the canvas.** One key only: `'pattern'`, handled
in `StudioCanvas.tsx` because the grid tools live with the grid.

**C. The room.** From `useStudioSession()`:

```ts
setActiveWorkspace('CREATE' | 'SOUNDS' | 'WRITE_RECORD' | 'MIX' | 'MASTER' | 'RELEASE')
```

---

## 2. Every key that works today

Aliases are real — either spelling opens the same thing.

| Key (and alias) | Opens |
|---|---|
| `piano` / `keyboard` | Virtual piano |
| `capture` / `performance` | Performance instrument |
| `training` | Creator training & my sounds |
| `collab` / `collaboration` | Real-time collaboration |
| `nativebrain` / `brain` | Native studio brain |
| `workstation` | Track production workstation |
| `songwriting` / `vocal` | Songwriting suite |
| `pattern` | Grid tools *(caught by StudioCanvas, not App)* |
| `takes` / `pads` | Performance take slots |
| `lyric` / `vocaltolyric` | Vocal-to-lyric |
| `hardware` / `midi` | External MIDI & hardware |
| `inspector` | Production inspector |
| `calibration` | Calibration |
| `visualization` / `radar` | Radial radar |
| `soulflow` / `pipeline` | SoulFlow governance pipeline |
| `voice` / `command` | Command bar — speak or type |
| `intelligence` | Studio Intelligence |
| `seedsignature` / `signature_inspector` | SeedSignature inspector |
| `vault` / `library` | Sound library |
| `voiceclone` | Voice clone |
| `export` | Export & delivery |
| `projects` / `save` | Projects: save, open, new |

**Realization** takes an object rather than a string:

```ts
window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', {
  detail: { type: 'realization', trackId, route, prompt, bars: [2, 2] },
}))
```

`route` is one of `ACE_PERFORMANCE_TRANSFER`, `ACE_STEM_EXTRACTION`,
`ACE_REPAINT`, `ACE_GENERATIVE_EXTENSION`, `INSTRUMENT`, `SAMPLE`, `SYNTH`,
`ORIGINAL`. Omit it and `App.tsx` picks one from the track. `bars` is the
region, 1-indexed and inclusive — clause XI.6, "only change bar eight".

---

## 3. The mockup, zone by zone

### Top bar

| Mockup | Already is |
|---|---|
| SOULSONUS logo | `brand/SoulSonusLogo` — `SoulSonusMark`, `SoulSonusWordmark` |
| "Untitled Soul · Revision 28" | `dawState.projectName` + `revisions.length` from the session |
| PROJECTS | key `projects` |
| HISTORY | `RevisionTreePanel` — already in the header |
| AI ENGINES | `EngineStatusBadge` — already in the header, already reports 3/4 |
| ✦ STUDIO INTELLIGENCE | key `intelligence` |
| EXPORT | key `export` |

### Transport row

`handleTogglePlay`, `handleStopTransport`, `handleToggleMetronome`,
`handleUndo` — all on the session context. The counter is
`dawState.currentStep` read as bar:beat.

> **Conflict, flagged not resolved.** The owner previously moved the transport
> *out* of the top bar and down to the microphone: *"The record play button,
> loop, the timing, key, all of that should be where the microphone is."* The
> mockup puts it back at the top. Both cannot be true. Ask before moving it —
> and note `disclosureLevels.ts` declares `transport: 1`, "always visible",
> which is currently honoured by `PlaybackTransport` appearing in every room
> without a microphone.

### Room tabs

Six rooms, already built: `CREATE · SOUNDS · WRITE_RECORD · MIX · MASTER ·
RELEASE`.

> **Do not rename the ids.** The label is free to change. `data-testid="room-<ID>"`
> is what the entire verification suite keys on, and `WRITE_RECORD` is the id
> behind the label "WRITE & RECORD".

The owner's example — *"when it says write on the left panel that should go to
write and record"* — is `setActiveWorkspace('WRITE_RECORD')`. The left rail's
writing tools (Songwriting, Vocal-to-Lyric) are drawers that open **over**
whatever room you are in; if the intent is that pressing them also takes you to
the writing room, that is one added `setActiveWorkspace` call beside the
existing `openDrawer`, not a new surface.

### Left rail — all four groups

Every entry exists today in `StudioUtilityBar.tsx`. The mockup regroups and
renames them.

| Mockup label | Key | Note |
|---|---|---|
| **TOOLS & WORKSTATIONS** | | |
| Studio Recording | — | `StudioRecordingSurface`, already the top of CREATE |
| Piano / Keys | `piano` | |
| Instrument | `capture` | |
| Beat Machine | `takes` **or** `pattern` | **Owner must pick.** `takes` is `PerformanceTakePads`; `pattern` is the grid tools. Neither is new. |
| Sourcing | — | **See gotcha 1.** |
| **BAND & COLLABORATION** | | |
| Session Players (4) | — | `lib/sessionBand.ts` — 7 roles: BASS, DRUMS, KEYS, GUITAR, STRINGS, BACKING_VOCALS, TEXTURE. Called with `handleCallSessionPlayer`. |
| Background Vocals | — | The `BACKING_VOCALS` role above. Not a separate system. |
| Collaboration | `collab` | |
| **CREATIVE UTILITIES** | | |
| Songwriting | `songwriting` | |
| Vocal-to-Lyric | `lyric` | |
| Takes (3) | `takes` | Count is take slots already in state |
| MIDI Hardware | `hardware` | |
| Import Audio | — | Opens the import/stems modal; see `AudioStemImportModal` |
| **STUDIO SYSTEMS** | | |
| Inspector | `inspector` | |
| Calibration | `calibration` | |
| Pipeline | `soulflow` | |
| Native Brain | `nativebrain` | |
| SeedSignature | `seedsignature` | |

Dropped from the mockup: **RADIAL RADAR** (`radar`) and **SAY IT** (`voice`).
Both still exist. Removing a rail entry does not remove the surface, but it
does make it unreachable — Amendment D. Either keep them or decide out loud.

### Centre column

| Mockup | Already is |
|---|---|
| THE BOOTH · mic · modality pills | `StudioRecordingSurface` — the ten `capture-<id>` pills are already there |
| SOURCE / INTERPRETATION / REALIZATION | `InterpretationPanel` + the recording-path line |
| THE BAND · session player cards | `SESSION_BAND` roles. The names (Marcus, Jay, Elena) are **cosmetic labels over roles** — the model has roles, not people. Adding display names is a data change, not a system. |
| Section tabs (INTRO / VERSE 1 / …) | `sections` in session state + `SectionBuilder`. The tab row is a new *view* of existing state. |
| THE CONTROL ROOM · unified DAW | `UnifiedTrackLane` + the timeline already in `StudioCanvas` |

### Right column — Studio Intelligence

| Mockup | Already is |
|---|---|
| PRODUCER / ENGINEER + prompt + PROPOSE CHANGESET | `StudioIntelligenceDrawer` — `#intelligence-input`, `#intelligence-ask`. PROPOSE CHANGESET is the existing changeset flow (`data-testid="changeset"`, `cs-apply`, `cs-reject`, `cs-alternative`). |
| SOURCE → INTENT → REALIZATION | `realizationRouter` + the preservation contract |
| PROVENANCE / RIGHTS | `lib/seedSignature.ts` + lineage and decision records |
| CAPABILITY ORCHESTRATOR | **The only genuinely new panel.** The pipeline it lists is real — capability contract, provider resolution, adapter, engine, normalize, validate, changeset — but nothing renders those seven steps as a panel today. It is a **view over state that exists**, not a new runtime. |

The whole right column is currently a **drawer** (`intelligence`). Making it a
persistent third column is layout work. It adds no capability and should not
add a second intelligence implementation.

### Status bar

`StudioMasterStatusBar` already renders master bus dB, DSP load, project saved,
SeedSignature state and rights. It is at the bottom of the app today.

---

## 4. Gotchas that will cost someone a day

1. **SOURCING is the one rail item not on the event bus.** It opens a modal held
   in `StudioUtilityBar`'s own `useState` (`setIsVaultModalOpen`). Rebuild the
   rail as a new component and SOURCING dies silently. Either move the modal
   with it, or give it a key on the bus like everything else — the second is
   better and is a five-line change.

2. **`data-testid` values are load-bearing.** `room-<ID>`, `record`,
   `capture-<modality>`, `preservation-scorecard`, `transport-time`, `bpm`,
   `master-volume`, `kit-preset`, `btn-*`. Sixty live checks key on them. Keep
   the attribute even when the element moves.

3. **Titles are load-bearing too.** `Play (Space)`, `Stop Playhead`,
   `Rewind to Start`, `Toggle Continuous Loop Mode` — several checks address
   controls by `title` because labels have churned twice.

4. **`App.tsx` owns drawer state.** A new panel that holds its own open/closed
   flag is a second source of truth. Add a key to the existing listener.

5. **Nothing renders ACE.** ACE-Step is a backend behind E05 and must stay
   invisible in the creative flow — the owner's standing instruction. It
   appears in provenance only.

---

## 5. The honest list of what is *not* already built

Short, on purpose:

- **The Capability Orchestrator panel.** A view over existing state. No runtime.
- **Session player display names.** Roles exist; "Marcus", "Jay", "Elena" do not.
- **The section tab row.** Sections exist; this row is a new view of them.
- **A persistent right column.** The content exists as a drawer.
- **Whether "Beat Machine" means the pads or the grid tools.** Owner decides.

Everything else in the mockup is a move, a rename, or a regrouping.
