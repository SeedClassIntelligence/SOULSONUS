# Retrofit Plan -- Amendment A on the existing build

Status: proposal. Nothing here is built. Each step is independently
shippable and independently revertible.

## The objective, in one sentence

Make the intelligence, interpretation, creator intent and iterative
relationship visible inside the build that already exists, without removing
one control from it.

## Non-goals, stated first

This plan does not:

- replace, rebuild or redraw any existing room, drawer, modal or workstation;
- remove any control, tool, tab, meter or button;
- introduce a second AI surface beside Studio Intelligence;
- introduce a simplified novice product beside the professional one;
- add a new specialist workstation (moratorium, Amendment A "What I would
  NOT add yet").

Amendment D governs every step. If a step would thin a room, the step is
wrong, not the room.

## Why this is small: seven of the ten stages already exist

Amendment A names the connective chain:

    Human Expression -> Interpretation -> Intent -> Musical Representation
    -> Realization -> Project State -> Studio Intelligence -> Proposed Change
    -> Creator Approval -> Revision

Measured against the codebase:

| Stage | State | Where it lives |
|---|---|---|
| Human Expression | BUILT | `UnifiedDeckBench.tsx`, `detectionEngine.ts`, `performanceClassifier.ts` |
| Interpretation | MISSING | would sit at `StudioSessionContext.tsx:1724` |
| Intent | MISSING | no type exists |
| Musical Representation | BUILT | `NoteEvent` 480 PPQ, `types/daw.ts` |
| Realization | BUILT | `realizationRouter.ts`, 8 routes |
| Project State | BUILT | `StudioSessionContext.tsx` |
| Studio Intelligence | BUILT | `StudioIntelligenceDrawer.tsx`, 607 lines |
| Proposed Change | PARTIAL | data built, presentation thin |
| Creator Approval | BUILT | `CandidateGovernanceState`, `types/daw.ts:968` |
| Revision | PARTIAL | linear history built, no branching |

Six built, two partial, two missing. The work is two completions and two
additions -- not a rebuild.

---

## Step 1 -- Live Expression Engine: four modalities become seven

**Serves** Amendment A.10, clause C.2. **Risk: lowest.** One file, additive.

`UnifiedDeckBench.tsx` is the Live Seed & Beatbox Engine.

| Line | Now | Change |
|---|---|---|
| 46 | `useState<'INSTRUMENT'\|'BEATBOX'\|'CLAP_TAP'\|'HUM_VOICE'>` | add `'MIMIC'`, `'SING'`, `'SPEAK'` |
| 123-135 | tab -> `CaptureModality` + pass label | map the three new tabs to `'MOUTH'` |
| 157-159 | tab -> instrument + modality | `MIMIC`/`SING` -> `MOUTH`, instrument per role |
| 193 | `LIVE SEED & BEATBOX ENGINE` | `LIVE EXPRESSION ENGINE` |
| 385-388 | four tab objects | seven |

`detectionEngine.ts` is untouched: `CaptureModality` stays `MOUTH | BODY |
KEYS` and all three new tabs are mouth input. No engine, no classifier and
no audio path changes.

**Proof of non-breakage.** The four existing tab ids keep their exact
mappings; a diff on lines 123-159 shows the old branches unmodified.
Typecheck plus production build.

---

## Step 2 -- The ChangeSet contract becomes visible

**Serves** Amendment A.13, clause C.6. **Risk: low.** Presentation only.

The data is already there. `StudioIntelligenceDrawer.tsx:281-296` builds a
`ProposalOption` carrying `lockedInvariants` from
`realizationCandidate.preservedProperties` and `mutableParams` from
`modifiedProperties`. What is missing is that the drawer does not present
them as a promise.

Change, inside the existing drawer, no new surface:

- render `lockedInvariants` under a **Will NOT change** heading with a check
  mark per entry -- this is the sentence that makes the AI trustworthy;
- render `mutableParams` under **Will change**;
- the action row becomes Preview / Apply / Alternative / Reject.

Preview and Apply exist. Alternative re-asks the same question with the
rejected candidate excluded. Reject is Step 5's entry point.

**Proof of non-breakage.** No change to `OperationPlanner`,
`studioIntelligenceService` or any commit path. A proposal that carries no
preserved or modified properties renders exactly as it does today.

---

## Step 3 -- Creative Intent becomes a real object

**Serves** Amendment A.8, SRT-1 V, clauses IV.4, C.4. **Risk: low, read-only first.**

Add `CreativeIntent` to `types/daw.ts` beside `CreatorMusicSignature`, which
is the right neighbourhood -- both describe the creator rather than the
audio:

    interface CreativeIntent {
      expression: ExpressionState | null;   // the 7 dimensions, null until measured
      genreGrammar: string | null;
      groove: { readsAs: string; meanOffsetMs: number } | null;
      preserve: string[];                   // locked
      transform: string[];                  // permitted
      energy: string | null;
      arrangementTrajectory: string | null;
    }

Every field nullable, because `realizationRouter.describeCreatorFeel` already
establishes the rule this project follows: only measured things become words,
and an unmeasured field says nothing rather than inventing a default.

Surface it as a collapsible panel, not a new workstation -- Amendment A says
it "shouldn't necessarily consume permanent screen real estate."

Phase 3a is read-only: display what is measurable today (groove from
`CreatorMusicSignature.style.performance.pocket`, key and BPM from session
state). Phase 3b makes preserve/transform editable and feeds them into
`RealizationRequest.thresholdPolicy`, where invariant locks are already
enforced. Nothing is wired until 3a is proven on screen.

---

## Step 4 -- The Interpretation layer

**Serves** Amendment A.9, clauses IV.3, VIII.2, VIII.3. **Risk: low.**
Revised 2026-09-01: commit first, offer after. The earlier version held the
pass to ask a question. The owner challenged that and was right -- a held
performance is a performance that can be lost, and the notes are identical
whichever instrument renders them, so there is nothing to wait for.

**The capture path does not change at all.** `onCaptureEvent` ->
`monitorCaptureEvent` -> `commitCaptureEvents` runs exactly as today for
every modality. The notes land the instant the loop closes.

What is added is a panel offered *after* the commit, on the modalities where
the question is real -- `MIMIC`, `SING`, `SPEAK`. It does not block, and
ignoring it leaves the pass exactly as recorded.

The question it asks is not "what did you play". It is **"what should this
sound like"** -- a decision the system already makes silently by routing a
class to a default track.

What the creator sees after mimicking a bassline:

    That pass read as low-register pitched material.
    4 onsets - F1 to C2 - 14 ms behind the grid - muted articulation

      Bass line          82%   sub-band energy 0.46, pitch F1-C2, 4 onsets/bar
      Low synth          68%   same contour, brighter centroid also fits
      Kick/bass hybrid   41%   onsets 1 and 3 read percussive as well as pitched

    Realize as  [808] [Electric Bass] [Upright] [Synth Bass] [Cello] [Keep as recorded]
    Timing      (o) Keep my timing  ( ) Fix obvious errors  ( ) Snap to 1/16

Every element already exists. The routes are `RealizationRoute`
(`types/daw.ts:958`). The target roles are `RealizationRequest.targetRole`
(`realizationRouter.ts`). The percentages come from
`performanceClassifier.classifyOnset`, which already returns a real
confidence margin and a per-class score map. The timing options are the
quantize modes SRT-1 VII already names. Nothing new is inferred; the panel
shows a decision that is currently invisible.

    interface RoleHypothesis {
      role: string;          // 'bass_line', 'low_synth', 'kick_bass_hybrid'
      confidence: number;    // 0..1, the classifier's real margin
      basis: string[];       // the measurements that produced it
    }

`basis` is required, not decorative: a percentage with no stated reason is
the invented-score failure this codebase already corrected once, in
`realizationRouter.describeCreatorFeel`.

**Proof of non-breakage.** `commitCaptureEvents` and `monitorCaptureEvent`
are untouched. The four existing modalities never render the panel. Deleting
the panel returns the app to current behaviour exactly.

## Step 5 -- Relay gap, then revision branching

**Serves** Amendment B, Amendment A.14, clauses B.1-B.4, XI.4, XI.7. **Risk: medium.**

Two parts, in order.

**5a -- the relay gap.** `GenerationDecisionRecord` (`types/daw.ts:995`)
stores `decision: ACCEPTED | REJECTED` and one `overrideReason` that exists
only for overruling the intent contract. There is nowhere to say what was
actually heard. Add:

    relayGap?: { saidAt: number; inCreatorWords: string; candidateId: string };

Reject in the drawer opens a field for it, the co-producer answers on the
existing thread, and the exchange persists with the candidate. Amendment B
makes this the highest-value signal in the session; today it is one bit.

**5b -- branching.** History already exists in `StudioSessionContext.tsx:900-1480`
with grouped undo/redo and labels. Branching adds `parentRevisionId` so the
tree has shape, and Apply on a ChangeSet writes a new revision rather than
overwriting. Cross-revision recombination -- "drums from 12, bass from 16" --
is deferred; the tree has to exist and be trusted first.

---

## Step 6 -- Emotion as measured dimensions

**Serves** SRT-1 V, clauses V.1-V.4. **Risk: low, deferred deliberately.**

`ExpressionState { valence, arousal, tension, confidence, intimacy,
darkness, movement }` lands in `types/daw.ts` in Step 3 as part of
`CreativeIntent`, nullable and unpopulated.

Step 6 populates it from measurements the audio path already makes -- RMS,
spectral centroid, pitch variability, onset density -- and lets Studio
Intelligence explain a change in those terms: "your performance lifted, so I
widened the harmony rather than raising the tempo."

Last, because it is the only step that needs the others to be useful. An
emotional reading with no Creative Intent panel to show it and no ChangeSet
to justify is a number in a struct.

---

## Step 7 -- Vocal-to-Lyric Workstation

**Serves** Amendment A.11, SRT-1 VI, clauses E.1-E.3, VI.2, VI.4.
**Risk: medium. Adjudicated under Amendment E.**

Owner agreed 2026-09-01 that this warrants its own workstation. The
moratorium on new workstations does not apply to it.

Why it is not a panel: it carries state nothing else carries, and it runs its
own loop. A panel borrows a host's state; this owns

- recognised words, distinguished from
- phonetic fragments that carry cadence but no lexical content, distinguished from
- melodic syllable positions, distinguished from
- inferred semantic theme;

plus a syllable map, a rhyme position map, and a melody lock.

What exists to build on: `LyricCadenceStudio.tsx` (466 lines) is the E08
16th-note syllable meter and rhyme engine -- Mode A, transcription-preserving.
The workstation is Mode B around it: treat a performance that is not clean
speech as a *lyric seed* rather than a failed transcription, and propose
language that fits the cadence already performed.

The loop:

    vocal seed -> phonetic extraction -> semantic clues -> syllable map
    -> song context -> lyric alternatives -> creator approval

The binding constraint is clause E.3: a proposal that changes the syllable
count, the stress pattern or the rhyme position is rejected before it is
shown. The creator performed the cadence; language fits it, not the reverse.

Placement: a rail entry beside the other workstations, opened by the same
`soulsonus:openDrawer` event every other one uses. No new mechanism.

## Sequencing and why

1. **Step 1** -- one file, additive, visible immediately. Proves the method.
2. **Step 2** -- presentation of data that already exists. No pipeline risk.
3. **Step 3a** -- new type, read-only panel. Nothing wired.
4. **Step 5a** -- relay gap. Small, and it is the amendment that matters most.
5. **Step 4** -- interpretation. Now additive and non-blocking, so it can move
   earlier than originally planned.
6. **Step 7** -- Vocal-to-Lyric workstation. Largest single piece; benefits from
   Creative Intent existing first, since theme and emotion feed lyric proposals.
7. **Step 3b, 5b, 6** -- wiring intent into realization, branching, emotion.

Steps 1, 2, 3a, 4 and 5a change no audio path and no commit path at all.

## Standing verification, every step

- `npx tsc --noEmit` -- src error count must stay at its pre-existing 1;
- `npm run build` -- must pass;
- `npm run seed:gate` -- no clause may regress without a signed waiver;
- for any file whose layout changes, a before/after diff of its handler set,
  as was done for the workstations rail.

## Open questions for the owner

1. Where should the Creative Intent panel live -- collapsible under the
   Expression Engine, in the Studio Intelligence drawer, or its own rail entry?
2. RESOLVED 2026-09-01. Vocal-to-Lyric gets its own workstation, Step 7,
   adjudicated under Amendment E.
3. RESOLVED 2026-09-01. Step 4 commits first and offers the interpretation
   after, non-blocking. Holding a pass risks losing a performance.
4. Mobile. The rail, the Creative Intent panel and the interpretation panel
   all need a phone layout, and that is a distinct design pass with its own
   constraints. Raised, not yet planned, at the owner's direction.
