# The studio architecture, and what already implements it

**Read this before you conclude that something has to be built.**

This is the architecture of record for SoulSonus. It is not a plan for a new
application. The platform exists; what was clarified is how its parts are
organized, presented and connected — particularly around AI and open-source
engines.

The single sentence the rest of this file serves:

> Understand the SoulSonus architecture first, inspect the existing
> implementation second, and only then decide how existing components and
> external technologies can serve that architecture.

---

## 1. Starting assumption: this is not greenfield

The existing codebase is the implementation baseline. Nearly every tab in any
mockup already has a room, a drawer, a state owner and a backend hook behind
it. Before creating anything:

1. inspect the existing implementation
2. name what that component already does
3. name its state owner and its backend seam
4. map it into the architecture below
5. **reuse, move, wrap, restyle or reconnect it**

A mockup presenting a capability differently is not authorization to write a
second implementation of it. The default is **KEEP AND ALIGN**, not *replace*.

`docs/UI_WIRING.md` is the element-by-element map for the current layout.
`docs/PARTS.md` is the same thing for open-source parts. Both exist so nobody
re-derives them from the source, which is slow and is paid for by the owner.

---

## 2. One studio, three relationships

SoulSonus is **one** AI-native recording studio: one persistent project, one
DAW, one recording system, one project state.

The creator experiences it through three relationships — not three
applications, and not necessarily three routes:

| | |
|---|---|
| **THE BOOTH** | how I express and record ideas |
| **THE BAND** | who creates and performs with me |
| **THE CONTROL ROOM** | where everything recorded becomes editable production material |

Everything resolves into the same project, tracks, clips, takes, timeline,
mixer, MIDI, audio, effects, automation, revisions and provenance.

The visual hierarchy that follows from it:

```
SOULSONUS
─────────────────────────────
Project / Transport / Lifecycle

          THE BOOTH
      microphone-centered
   human expression / recording

          THE BAND
  Session Players / BGV / collaborators

        THE CONTROL ROOM
          the existing DAW
─────────────────────────────
Compartmentalized Tools
Studio Intelligence
Project Systems
```

**The DAW is persistent.** Do not create a second timeline for Live
Expression, Session Players, beatbox, AI generation, BGV, mimicry or humming.
Every one of those operations creates material *inside the existing DAW*.

---

## 3. Nothing existing is obsolete

Piano/Keys, Instrument Workstation, Beat Machine, Sourcing, Songwriting,
Vocal-to-Lyric, Takes, MIDI Hardware, Import Audio, Inspector, Calibration,
Radial Radar, Pipeline, Collaboration, Session Players, Background Vocals,
Native Brain, SeedSignature, Mix, Master, Release and the DAW functions all
stay. What changes is that they stop competing to define the primary workflow.
They open when intentionally needed.

```
Beat producer        → opens Beat Machine
Keyboard player      → opens Piano / MIDI
Guitarist            → records instrument
Singer               → records through the Booth
Non-instrumentalist  → hums or mimics an idea
Producer             → uses Studio Intelligence
```

All of those enter the same project and the same DAW.

Removing a rail entry does not remove a surface, but it does make it
unreachable, which is Amendment D. Either keep it or decide out loud.

---

## 4. Live Expression is an input layer, not a room

It is not another studio. It is an interpretation layer on the existing
recording system:

```
Select Track → Arm Track → Choose Input Meaning → Perform
            → SoulSonus interprets → result appears on that track
```

Input modes: Record Audio, Beatbox, Clap/Tap, Hum, Mimic, Sing, Speak, MIDI,
Import, Melody. **These are not destinations.** They answer one question:
*how should I understand what the creator is about to provide?*

---

## 5. SOURCE → INTERPRETATION → REALIZATION stay separate objects

```
SOURCE          Creator vocalizes a bass phrase.
INTERPRETATION  SoulSonus determines it represents bass — rhythm, contour,
                articulation, feel.
REALIZATION     Electric Bass.
```

The realization can later become a synth bass, an 808, an upright, or a
session-player performance **without destroying the source or the
interpretation**. Do not collapse the three into one generated audio file.

---

## 6. Session Players are SoulSonus objects, not models

Never `Marcus = ACE-Step`. Never `Marcus = an LLM prompt`.

A player carries a role, a vocabulary, a behavior, listening priorities and a
primary and secondary instrument. The realization engine underneath may be
replaced; that must not alter the player's identity or the creator's workflow.

---

## 7. Open-source architecture rule

**Never inherit an open-source project's product architecture because
SoulSonus uses its technology.**

When reading an external repository, the question is not "what was this
application designed to do" but "what capabilities exist underneath it that
SoulSonus can use." A repository's UI, demo workflow, CLI, intended product
and default pipeline do not define how SoulSonus uses the technology inside
it. READMEs are not evidence.

Every external system goes through:

```
DISCOVER → DECOMPOSE → VERIFY → MAP → ADAPT → NORMALIZE → TEST → REGISTER
```

inspecting APIs, source functions, model stages, the inference pipeline,
inputs, outputs, intermediate representations, checkpoints, conditioning
mechanisms, editing interfaces, latency, hardware, licenses, weights and
dependencies.

### Atomic capabilities, not products

`ACE-Step = song generator` is not a registration. What can actually be used
is: `music.realize`, `music.accompaniment.generate`,
`music.reference.condition`, `music.region.repaint`, `music.stems.separate`.

Basic Pitch is not "audio → MIDI". It is `perception.pitch.extract`,
`perception.notes.transcribe`, `perception.onset.detect`,
`perception.pitchbend.extract`. SoulSonus decides what those outputs *mean*.

### Before saying a model cannot do it

Establish which of these is actually true:

1. the capability does not exist
2. it exists but the packaged UI does not expose it
3. it exists but the default workflow uses it differently
4. it can be exposed through an adapter
5. an intermediate output can be redirected
6. several tools can be chained
7. the tool performs only part of the operation
8. it works offline but not in real time
9. it is technically useful but licensing blocks production use

Only after those are investigated is "SoulSonus must build this itself" an
answer. This is the Courage Protocol applied to third-party code.

---

## 8. Capability layer

A **capability** describes *what SoulSonus needs done*. It never names a
vendor or a model.

```
perception.pitch.extract        separation.vocals
perception.notes.transcribe     separation.drums
perception.beat.detect          separation.bass
perception.tempo.estimate       separation.stems
perception.key.estimate
perception.chords.extract       interpretation.expression.classify
perception.sections.detect      interpretation.role.infer
                                interpretation.intent.construct
planning.performance
planning.harmony                realization.instrument
planning.arrangement            realization.music
planning.background_vocals      realization.vocal
                                realization.accompaniment
transformation.repaint
transformation.inpaint          engineering.mix.analyze
transformation.retime           engineering.master.analyze
transformation.retune
```

**Providers** advertise which capabilities they satisfy. A Basic Pitch adapter
provides the perception pair; an ACE-Step adapter provides realization and
transformation; a future native engine can replace either without the product
workflow changing.

### Adapters are mandatory

Prohibited: `UI → ACE-Step`, `Marcus → ACE-Step`, `Track → Demucs`,
`Hum button → Basic Pitch`.

Required:

```
SoulSonus Operation → Capability Request → Capability Resolver
  → Provider Adapter → External Engine → Provider Adapter
  → Normalized SoulSonus Object
```

Provider-specific data structures stop at the adapter boundary.

### Every provider carries

Code license, weight license, commercial-use status, attribution
requirements, model version, model hash, dependencies, hardware requirement,
latency class, known restrictions. A model can be eligible for
**RESEARCH / PROTOTYPE** and not for **COMMERCIAL PRODUCTION**, and that
distinction lives in the backend, not in someone's memory.

---

## 9. SoulSonus owns the canonical representation

ACE-Step structures, MIDI, YuE representations, Demucs output shapes and model
latents are **never** the project format. SoulSonus owns its objects, and
external providers get adapters to and from them.

**SMIR** — SoulSonus Musical Intent Representation — is the
provider-independent musical intent, and expresses more than MIDI can: the
source, the intended role, the notes, the creator's rhythm and microtiming,
articulation, dynamics, relationships ("lock with the kick"), what to avoid,
what must be **preserved** (rhythm, contour, articulation, feel), what is
**transformable** (instrument, timbre, exact pitch), and the current
realization. This is what lets one creator idea survive multiple engines.

---

## 10. Studio Intelligence and ChangeSets

Studio Intelligence is not a chatbot. It operates against the current project,
selected track, clip and section, the tracks, takes, players, arrangement,
tempo, key, mix state, creative intent, preservation constraints and revision
history.

> *"Keep my melody and drums exactly the same, but make the chorus feel like I
> finally made it through something."*

That is not forwarded to a generator. It is translated into a structured
operation and expressed as a **ChangeSet**: scope, hard-preserve, desired
change, may-modify, forbidden — offered as **PREVIEW / APPLY / ALTERNATIVE /
REJECT**. There is no unrestricted AI mutation of project state.

One creator-facing action may compose many capabilities. *"Marcus, listen to
this and play what you feel"* is not a search for a model called "AI session
bass player"; it is resolve session context + extract drum groove + analyze
harmony + analyze vocal phrasing + apply the player's persona + plan the
performance + choose a realization provider + render + validate constraints +
create a take. Several different technologies supporting one action is
intentional.

---

## 11. The real-time boundary

Large generative models never enter the DAW audio callback.

| Class | What runs there |
|---|---|
| **Real time** | audio I/O, monitoring, transport, metronome, DSP, plugins, MIDI, playback |
| **Interactive** | pitch analysis, speech recognition, basic interpretation, selection analysis |
| **Assistive** | harmony analysis, stem analysis, Studio Intelligence reasoning, ChangeSet planning |
| **Generative / async** | session-player performances, background vocals, full arrangements, neural synthesis, repainting, stem generation |

**SoulSonus must remain a working studio when every AI provider is down.**

---

## 12. Where this architecture already lives in the code

The vocabulary above is new; most of the machinery is not. Build against what
is here.

| Architecture term | What implements it today | Gap |
|---|---|---|
| Interpretation layer | `lib/interpretation.ts` — role hypotheses, every field derived from a measurement the capture path already made | — |
| Input meanings | the `capture-<id>` modality pills on `StudioRecordingSurface` | — |
| Source preservation | `TrackLayer` / `SeedType` / `LayerOriginType` / `SourceDecompositionManifest` in `types/daw.ts` | — |
| Realization routes | `lib/realizationRouter.ts` — ORIGINAL, SAMPLE, INSTRUMENT, SYNTH, ACE_* | `ACE_GENERATIVE_EXTENSION` unrealized: no target duration on the request |
| Provider seam | `lib/inference/e05Provider.ts` — one interface, swappable per deployment | one provider implemented |
| Adapter boundary | `lib/inference/e05Contract.ts`, `demucsClient.ts`, `server/e05Route.ts` | holds for E05 and Demucs; not yet a general resolver |
| ChangeSet | `lib/changeSet.ts` — guarantees carry `MEASURED` / `BY_CONTRACT` / `BY_CONSTRUCTION` | — |
| Preservation constraints | `lib/intentPolicy.ts`, `lib/realizationVerifier.ts`, `inference/audioPreservationScoring.ts` | — |
| Creative intent | `lib/creativeIntent.ts`, `CreativeIntentPanel` | — |
| Operation planning | `lib/intelligence/OperationPlanner.ts`, `StudioContextCompiler.ts`, `ReasoningProvider.ts` | — |
| Session players | `lib/sessionBand.ts` (7 roles), `lib/sessionPlayer.ts` | roles exist; persona vocabulary, behavior, listening priorities and display names do not |
| Background vocals | the `BACKING_VOCALS` role — not a separate system | — |
| Provenance / rights | `lib/seedSignature.ts`, `lib/revisionTree.ts`, `AudioClipProvenance`, `NoteProvenance` | — |
| Real-time class | `audio/audioEngine.ts`, `detectionEngine.ts`, `masterRender.ts` — in the browser graph on purpose | — |
| Capability registry | **not built.** The routes are a dispatcher, not a registry; there is no provider table and no license/hardware metadata | the genuine gap |
| SMIR | **not built as one object.** Its fields exist scattered across `ExpressionState`, `NoteExpression`, `RoleHypothesis`, `intentPolicy` and `RealizationRequest` | the genuine gap |

Two gaps, named. Everything above them is a wiring or presentation job, and
writing a second one of any of them is a defect however good the code is.

---

## 13. Migration procedure for any existing surface

Before changing code, write the inventory row:

```
CURRENT COMPONENT / ROUTE / PURPOSE / UI / STATE / BACKEND
CURRENT WORKING CAPABILITIES / DEPENDENCIES

NEW LOCATION:  Booth | Band | Control Room | Tool | System
ACTION:        KEEP | MOVE | RESTYLE | WRAP | REWIRE | DEPRECATE | NONE
```

A new design is applied as a **shell and interaction hierarchy around existing
capabilities**:

```
New tools rail → Beat Machine → the existing beat machine component
Creative utilities → Vocal-to-Lyric → the existing implementation
Control Room → the existing DAW, restyled and reconnected
```

A demonstrator is read for information hierarchy, the studio metaphor, room
relationships, progressive disclosure, the session-player experience, the
source/interpretation/realization split, Studio Intelligence, ChangeSets and
the capability/provider separation. It is not copied over working code.

```
EXISTING FUNCTIONAL PLATFORM
  + NEW EXPERIENCE ARCHITECTURE
  + CAPABILITY RE-ORCHESTRATION BACKEND
  = MATURE SOULSONUS
```

Not: delete the platform and replace it with the demo.

---

## 14. Target shape

```
                    CREATOR
                       │
              SOULSONUS STUDIO
          ┌────────────┼────────────┐
       BOOTH          BAND      CONTROL ROOM
          └────────────┼────────────┘
                 PROJECT STATE
              STUDIO INTELLIGENCE
                  SOUL INTENT
                      SMIR
                   CHANGESET
             ORCHESTRATION GRAPH
              CAPABILITY RUNTIME
             CAPABILITY REGISTRY
               PROVIDER RESOLVER
            ┌──────────┼──────────┐
         Adapter    Adapter    Adapter
            ▼          ▼          ▼
        Open source Commercial  Native
            └──────────┼──────────┘
               NORMALIZED RESULT
                   VALIDATION
                 SOULTAKE / CLIP
                       DAW
             REVISION + PROVENANCE
```

External repositories are capability suppliers, not architectural
authorities. Before implementing anything new, prove the platform does not
already contain it. Before calling a requirement unsupported, prove the
underlying capability cannot be exposed, adapted, redirected, composed or
wrapped from technology already here.
