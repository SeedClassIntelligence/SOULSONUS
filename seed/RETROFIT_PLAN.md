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

**Serves** Amendment A.9, clauses IV.3, VIII.2, VIII.3. **Risk: highest.
Sits in the live capture path, so it is opt-in and non-blocking.**

Today, `StudioSessionContext.tsx:2036` calls `onCaptureEvent` ->
`monitorCaptureEvent` (`:1724`) -> `commitCaptureEvents` (`:1593`), and a
classified event lands on a track immediately. That immediacy is correct for
beatbox: thump is a kick, and the creator wants it there now.

It is wrong for Mimic. "Bummm-bum-ba-bumm" is not self-evidently a bass line.

So interpretation is scoped to the modalities where the question is real:

- `BEATBOX`, `CLAP_TAP`, `INSTRUMENT`, `HUM_VOICE` -- unchanged, commit
  straight through as today;
- `MIMIC`, `SING`, `SPEAK` -- the pass is held after the loop closes and
  `RoleHypothesis[]` is offered, ranked, before anything is committed.

    interface RoleHypothesis {
      role: string;          // 'bass_line', 'low_synth', 'kick_bass_hybrid'
      confidence: number;    // 0..1, from the classifier's real margin
      basis: string[];       // which measurements produced it
    }

`performanceClassifier.classifyOnset` already returns a `confidence` margin
and a `scores` map. The hypotheses are aggregated from what it already
computes -- no new model, no new inference call.

**Proof of non-breakage.** The four existing modalities never enter the new
branch; their code path is byte-identical. If interpretation returns nothing,
the pass commits as it does today.

---

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

## Sequencing and why

1. **Step 1** -- one file, additive, visible immediately. Proves the method.
2. **Step 2** -- presentation of data that already exists. No pipeline risk.
3. **Step 3a** -- new type, read-only panel. Nothing wired.
4. **Step 5a** -- relay gap. Small, and it is the amendment that matters most.
5. **Step 4** -- interpretation. Touches live capture; go here only once the
   pattern is trusted.
6. **Step 3b, 5b, 6** -- wiring intent into realization, branching, emotion.

Steps 1, 2, 3a and 5a change no audio path and no commit path at all.

## Standing verification, every step

- `npx tsc --noEmit` -- src error count must stay at its pre-existing 1;
- `npm run build` -- must pass;
- `npm run seed:gate` -- no clause may regress without a signed waiver;
- for any file whose layout changes, a before/after diff of its handler set,
  as was done for the workstations rail.

## Open questions for the owner

1. Where should the Creative Intent panel live -- collapsible under the
   Expression Engine, in the Studio Intelligence drawer, or its own rail entry?
2. Vocal-to-Lyric (Amendment A.11) is not in this plan. It is the one item
   that may deserve a workstation, which the moratorium currently forbids.
   Confirm before it is planned.
3. Step 4 changes what happens after a Mimic pass. Confirm that holding the
   pass for a role choice is wanted, rather than committing and offering
   re-interpretation afterwards.
