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

## Step 0 -- Close the one path that loses a performance

**Serves** Amendment F.i, clause F.1. **Risk: lowest. One condition.**
**Recommended first, ahead of everything else in this plan.**

`captureRouting.ts:65`:

    const audible = tracks.filter((t) => !t.mute);
    if (!audible.length) return { kind: 'drop', reason: 'all_tracks_muted' };

and `StudioSessionContext.tsx:1622`:

    if (decision.kind === 'drop') continue;

If every track is muted and the creator performs, every event is discarded.
No channel is created, nothing is written, and nothing tells them. The take
is gone.

The routing is otherwise exactly right -- step 4 of `resolveCaptureTarget`
already creates a dedicated channel when no existing track can host a sound
type, which is Amendment F.ii working as intended. This one branch is the
exception.

The fix follows from what mute means. Mute is a monitoring decision: do not
play this back to me. It has never meant do not record me. So the muted case
should fall through to the same channel creation every other unhosted sound
gets, and the created channel can be muted to respect the monitoring
intent -- the performance is kept either way.

**Proof of non-breakage.** Every non-muted path through `resolveCaptureTarget`
is unchanged; a diff shows only the `all_tracks_muted` branch differing. The
`RouteDecision` union keeps `drop` so no consumer breaks.

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

What is added is a panel offered *after* the commit. Revised again
2026-09-01 under Amendment F: it is **not** scoped to `MIMIC`, `SING` and
`SPEAK`. Scoping it to the new modalities was wrong. The system can mishear
the third hit of a beatbox pass exactly as easily as it can misread a mimic,
and F.iv makes re-interpretation a permanent affordance on all captured
material from every modality and every input -- not a prompt shown once at
capture time.

So: any captured material can be re-read, at any time, from its track. The
panel surfaces itself after a pass on the modalities where the question is
most open, but it is reachable on every take. It does not block, and ignoring
it leaves the pass exactly as recorded.

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
are untouched -- capture runs first and identically for every modality, which
is clause F.4. Deleting the panel returns the app to current behaviour
exactly.

### Step 4 -- what is actually built, audited 2026-09-03

Audited against this section rather than against the clause checks, because
IV.3, VIII.2 and VIII.3 read honored while parts of this step were not built.
A clause passing is not this step passing.

Built and proven: ranked `RoleHypothesis` with confidence and a required
basis; the panel offered after the commit, never blocking; and, added during
this audit, a **Realize as** action per reading, which the mockup above ends
in and which the panel did not have -- it ranked the options and offered no
way to take any of them.

Still not built, and this step is **not complete** until they are:

- **Timing options.** "Keep my timing / Fix obvious errors / Snap to 1/16"
  is in the mockup and nothing implements it. The quantize modes exist in
  SRT-1 VII and in the header's `Q:` control; a per-pass choice that
  re-quantizes what was just committed does not.
- **Re-reading from a track.** F.iv makes re-interpretation a permanent
  affordance on all captured material -- "not a prompt shown once at capture
  time". It is currently only a prompt shown once at capture time. The
  per-track SONUS button reaches realization, not re-interpretation.

### Step 4 -- closed 2026-09-03, and what closing it turned up

Both open items are built, and both are verified in the browser rather than
by reading the code: `scripts/live-verification/test-51-timing-and-reread.cjs`
records a take through the microphone, re-reads a channel, applies each mode
and reads the result back out of session state -- 36 checks, three consecutive
clean runs.

**Timing options.** `lib/timingModes.ts` implements the three modes SRT-1 VII
names. Where the mockup above says "Snap to 1/16" the seed says groove --
"preserve microtiming while regularizing the beat" -- and the seed governs, so
the third mode straightens the beat and displaces it by the creator's own
measured pocket instead of hard-snapping the feel out of the take. The fourth
mode the seed names, reinterpretation, is in the same row and opens
realization, which is what "use the beatbox as rhythmic intent and generate a
polished production pattern" already is here. `types/daw.ts` now names all
four as `InterpretationMode`, and `TimingMode` narrows it rather than
restating it.

Two properties make the row safe to offer. Every mode reads from the performed
placement, kept on the note in `provenance.capturedTick` and never overwritten,
so the modes do not compound and `literal` is a real way back. And the write
goes through `updateTracksWithHistory` with a revision origin, so it is
undoable and lands in the tree -- the lesson from the realization Apply that
called `setTracks` directly.

**Re-reading from a track.** `interpretation.eventsFromTrack` rebuilds capture
events from the notes on a channel, and every lane carrying notes has a
re-read control beside its workstation and delete buttons. It changes nothing
on the track; it produces a reading, and it opens the bench so the reading is
somewhere the creator can see it.

Three defects were found by verifying rather than by reading, and all three
are fixed:

- **The panel never worked on a live take.** The microphone commits one onset
  at a time, so the pass was read from whatever arrived in the last call: after
  any real performance the panel said "One onset. Too little to read a musical
  role from." A pass is what is being read, so the pass is what accumulates.
- **The record button could not stop a take.** `dawState.isRecordingMic` was
  read in eight places on the performance bench and set by nothing, so the
  button read "● RECORD LOOP" while the microphone was open, and pressing it
  again returned early. It is set where the microphone is known to be open.
- **Live playback hard-quantized to the sixteenth.** Every note inside a step
  was triggered at the step's own edge, which made literal, assisted and groove
  sound identical whatever the project file said. Live playback now honours the
  exact tick, as the offline render always has.

One thing is stated rather than solved, per Amendment E. Straightening a roll
faster than the grid puts hits on top of each other; the notes all survive and
`literal` brings them back, but what plays has fewer hits in it. Groove counts
them and says so with the way back. Regularizing against the resolution the
material implies, rather than against a fixed sixteenth, is the better answer
and is not built -- it is the owner's call whether it is worth a step.

Open, and not this step's: `test-30-capture-undo` and `test-03-capture-e2e`
address capture buttons by names the bench no longer uses, and
`test-48-kit-plays-live` fails five checks identically with and without this
work.

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

### Step 6 -- closed 2026-09-03

Verified in the browser as well as in the suite:
`scripts/live-verification/test-52-expression.cjs` hums into the microphone,
reads the state back out of session state, overrules a dimension and asks the
intelligence to explain a change -- 22 checks. 44 unit assertions cover the
derivation and the control mapping.

**The reading.** `audio/expressionState.deriveExpression` takes a whole pass
and returns the seven dimensions SRT-1 V names, each with the measurement and
the mapping that produced it. Nothing is invented to fill a dimension out:
rate, intensity and their spreads come from the onsets; brightness and
proximity from the spectral centroid and the band energies; contour and spread
from the tracked fundamental. A dimension with nothing behind it is null and
named -- a beatbox take has no valence or tension, and a reading rebuilt from
notes on a track has no darkness or intimacy.

**The creator outranks it.** SRT-1 V lists "user-specified emotional intent"
among the inputs and Amendment B puts their perception above the machine's, so
a dimension the creator states replaces the measurement on that dimension,
carries their attribution, and can be handed back.

**The control variables.** `lib/expressionControls` maps the reading onto the
musical dimensions the section lists. Timbral brightness, dynamics,
reverberation and register become real settings on a channel strip; harmonic
tension and rhythmic density are stated as suggestions because this build
cannot apply them, and are not offered as something to click. A dimension
reading near the middle proposes nothing. The tempo is never moved on the
strength of a feeling, and the explanation says so. The state also rides with
the realization instruction beside the creator's measured feel -- built, and
not verifiable end to end here, because E05 does not answer in this
environment.

**A defect found by verifying it.** A hummed bassline was landing on the snare
channel with no pitch. `CaptureModality` had only MOUTH, BODY and KEYS, and
MOUTH restricts the classifier to kick/snare/hi-hat and switches pitch tracking
off -- so HUM, SING and MIMIC, which all armed MOUTH, could not produce a
pitched event at all. That is SRT-1 VIII's premise failing silently, and it is
why valence and tension read as unmeasurable on the material they exist for.
Added VOICE (tonal, pitch tracked) and MIMIC (the full taxonomy, pitch
tracked), kept identical between the live engine and the offline analyzer; the
seed is still recorded as a MOUTH take, because that is what it is.

Step 1 above says the opposite -- "`detectionEngine.ts` is untouched:
`CaptureModality` stays `MOUTH | BODY | KEYS` and all three new tabs are mouth
input." That assumption is what produced the defect. It is left standing where
it was written rather than edited to agree with the code; this is the note
that corrects it.

The gate test for this, `test-07-channel-separation`, could not run: it and two
others addressed capture buttons by names the bench no longer uses. They are
repaired and share one `recordTake` helper now. All five of its cases pass,
including both hum registers landing on melody and bass.

### Review of Steps 4 and 6 -- 2026-09-04

Re-read against the plan and against what runs, not against the commit
messages. Four findings, all fixed, and four things left standing that a
reader should know.

**Fixed.**

- *A proposal could be applied to a channel it did not name.* Committing a
  Studio Intelligence proposal resolved its target by instrument, or fell back
  to whatever the creator had selected, so a proposal reading "on Kick
  (Thump)" could write its settings elsewhere and then report having applied
  them to that other channel. The proposal's own `targetTrackId` is carried
  through and resolved first now.
- *The creator could only overrule a dimension the studio already had an
  opinion about.* SRT-1 V lists user-specified emotional intent as an input in
  its own right, not as a correction to a machine reading, and a percussive
  take is not a take the creator has nothing to say about. The say-row is
  offered on every dimension, measured or not.
- *A dimension the creator stated was still listed as unmeasured.* The state
  said, of the same dimension, both "nothing in this pass carried a pitch" and
  their reading. Their reading stands; the line is dropped, and handing the
  dimension back restores both the absence and the reason for it.
- *A false comment in the source.* `EXPRESSION_POLES` claimed to be in the
  order SRT-1 V writes them. Six are; valence is deliberately reversed so
  every axis runs negative to positive, and the comment now says so.

**Verified that had not been.** The three fields added to the project
snapshot -- the timing mode per track, the affective reading, the creator's
corrections -- were written and never proved to come back.
`test-53-state-survives-reload.cjs` saves through the session's own save,
reloads the page, reopens, and reads all of it back, including each note's
performed tick. 13 checks.

**Left standing, and why.**

- The reading rides with the ACE instruction beside the creator's measured
  feel, and cannot be verified end to end here: E05 does not answer in this
  environment. Built, unproven, and named as such.
- For the local routes -- SAMPLE, INSTRUMENT, SYNTH -- the reading reaches the
  render only through the intelligence's proposal, which the creator applies.
  It does not silently shape those routes.
- The timing row is offered with the reading, which is what "a per-pass choice
  that re-quantizes what was just committed" asks for. Dismissing the reading
  takes the row with it until the track is re-read. Nothing is lost by that --
  the mode persists and every note keeps its performed tick -- but a track
  sitting in groove carries no mark on its own lane saying so.
- `test-48-kit-plays-live` fails five checks identically with and without this
  work: the factory kit reports as loaded and plays nothing. Not this step's,
  not touched, and not fixed.


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

### Step 7 -- closed 2026-09-04

Built as described: a rail entry, opened by the same event, no new mechanism.
`test-54-vocal-to-lyric.cjs` hums into the microphone, opens it from the rail,
reads the cadence off the take, writes against it and keeps a line -- 20
checks. 29 unit assertions cover the syllable estimator, the seed and the lock.

**The seed.** `lib/lyricSeed.deriveLyricSeed` reads a take as a cadence: the
onsets are the syllabic rhythm, their velocities are the stress pattern, the
gaps the creator left are the phrases and therefore where the rhymes land, and
the tracked fundamental is the melodic fit. That is five of the six things
SRT-1 VI says Mode B preserves. The sixth, theme, is not derived -- nothing in
this build can infer what a hummed line is about, and a theme invented here
would be the studio putting words in the creator's mouth at the moment it
claims to be preserving their intent. It is theirs to state, and it says so.

**The four kinds stay four.** `LyricSourceKind` keeps a word that was heard, a
sound carrying cadence with no lexical content, a sung position, and what the
take is about apart from each other, on screen and in the type. Nothing in
this build recognises speech, so no position carries a word and the panel says
that rather than showing an empty column.

**The lock.** `lib/cadenceLock` is a gate, not a score: a proposal that changes
the syllable count, moves a beat inside a word, or moves the rhyme off the end
of the line is refused before it reaches the screen, and its text does not come
out of the gate. What the creator sees is that something was refused and why.
Their own writing is theirs -- the lock reports on it and does not veto it,
because E.3 governs what the studio proposes.

**One answer to how many syllables.** `handleAddLyricLine` wrote
`words.map((w) => w + '-')` into `LyricLine.syllables`, so a typed line's
"syllables" were its words with a hyphen glued on -- "electric" counted as one
-- and its emphasis was `i % 2 === 0`, an alternation nobody performed. The
demo lines shipped with splits typed by hand, so the panel looked right and
every line a creator actually wrote did not. Both now come from
`lib/syllables`, which agrees with the hand-typed split on the demo's first
line exactly, and the emphasis is the rule the lock enforces rather than a
pattern invented at the call site.

**Three things stated, not solved.**

- Writing lyrics needs a language model. The native brain reasons about the
  session and has no branch that writes verse, so the workstation says so and
  proposes nothing, rather than asking it anyway and reporting that the gate
  protected the creator from four lines that were never lyrics.
- The stress rule is a decision, and it is the owner's to confirm. English
  stress is not recoverable from spelling without a pronunciation dictionary
  this build does not have, so the lock enforces the one thing that is
  knowable -- a beat the creator hit lands on the start of a word. That refuses
  a good line built on "ig-NITE", whose stress is on its second syllable.
  Refusing a good line costs a suggestion; accepting one that moves their beat
  costs the take's cadence, which is why it is set this way. Say the word and
  it becomes advisory instead.
- The syllable estimator is an estimator. It reads "every" as three, and the
  person who typed the demo line sang it as two. Spelling does not decide
  this, which is why the count it read is shown rather than applied silently.

## Sequencing and why

1. **Step 0** -- one condition. Stops the capture path losing a take. First.
2. **Step 1** -- one file, additive, visible immediately. Proves the method.
3. **Step 2** -- presentation of data that already exists. No pipeline risk.
4. **Step 3a** -- new type, read-only panel. Nothing wired.
5. **Step 5a** -- relay gap. Small, and it is the amendment that matters most.
6. **Step 4** -- interpretation. Now additive and non-blocking, so it can move
   earlier than originally planned.
7. **Step 7** -- Vocal-to-Lyric workstation. Largest single piece; benefits from
   Creative Intent existing first, since theme and emotion feed lyric proposals.
8. **Step 3b, 5b, 6** -- wiring intent into realization, branching, emotion.

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

---

## Three absent clauses closed - 2026-09-04

Not plan steps. Three of the fourteen clauses reading ABSENT after Step 7 were
small and had everything they needed already recorded, so they were closed on
the owner's instruction. `test-55-three-clauses.cjs` checks all three where a
creator meets them -- 17 checks -- and 28 unit assertions cover the functions.

**XVIII.4 -- synthetic media disclosure reaches the release manifest.** The
provenance record shipped with a master listed every track's id, name, role,
note count and volume and said nothing about which of it a machine made. A
creator handing that file to a distributor or a rights body was handing over a
document that could not answer the one question asked of records like it.
`lib/syntheticDisclosure` reads it off the provenance already carried by the
notes and the tracks -- origin, renderer, session player, the track's own
sound origin -- names what it cannot see, and a project with nothing generated
into it gets a sentence saying so, because an absent disclosure and a
disclosure of nothing are different claims. It is written into the provenance
file and shown on the export screen before anything is sent.

**XIV.1 -- genre as a conditioning parameter, not an output label.** SRT-1 XIV
says genre "should not mean a simple classifier". `lib/genreGrammar` holds it
as rules across the nine dimensions the section names, and three rules are
enforced rather than described: nothing classifies the creator's material --
they name a grammar or there is none; a grammar conditions production and
never performance, so `conditionGenre` withholds any dimension the creator's
own preserve set holds; and what rides with a realization is the rules rather
than the word, so "neo-soul" is not left to whatever a model's training makes
of it. The seed's own sentence -- "the underlying creative identity remains
while production grammar changes" -- is the test, and the panel says which
dimensions were held back and why.

**III.4 -- one performance feeds several processors.** The processors existed
and each ran somewhere else: a pass was read for its role in one place, for its
affect in another, and as a cadence only when a workstation was opened, each
rebuilding its own view of the same onsets. `audio/expressionFanout` is the one
place a performance is read, and it reads it every way at once -- role,
affect, cadence -- off the same onsets, with no branch filling another's gaps.
The Vocal-to-Lyric workstation now offers the pass itself, at the fidelity the
microphone heard it, rather than only the notes it was written to.

The second half is the import path, where the seed's point bites hardest: a
file went to the spectral classifier or to the pitch transcriber, and whichever
the creator chose, the other was never asked. Both are asked now, and the one
the creator did not route to reports what it heard without writing a note --
the measurement recorded below says percussion never drove the transcriber to
produce a note at any threshold, so the two can safely read the same audio.
Committing what the second processor heard would be the fan-out destroying the
take it exists to protect, so it says how to keep it and leaves the decision
where it belongs.

Eleven clauses still read ABSENT. Four of them -- A.8, C.3, A.12 and XVII.2 --
are capabilities that exist and are verified, whose checks name a symbol
nothing in the code uses; changing a check to match an implementation is the
move that fakes conformance, so they are the owner's call and are left alone.
The other seven are product decisions: disclosure levels (XVII.3, C.1), a
collaborative state model (XV.1), analytics (XVI.1, XVI.3, XVI.4) and
monetization (XIX.1).

---

## Creative analytics, and the question they raise - 2026-09-05

XVI.1 and XVI.4, closed on the owner's instruction. `test-57-analytics.cjs`
drives both in the browser (15 checks) and 23 unit assertions cover the
derivations.

**The counts.** `lib/creativeAnalytics` reads the session's own record rather
than watching anything: the revision tree, the decision records, the relay
gaps and the tracks, all of which exist for their own reasons. There is no
telemetry, nothing is timed in the background, and an undo takes the analytics
back with it, because the tree is the record. Five of the six the seed names
are measured -- iteration frequency from the median gap between revisions
rather than the mean, so one long break does not describe the session;
sections repeatedly revised, by comparing which bars' notes changed between
consecutive revisions and mapping those bars to sections; abandoned ideas, from
rejected candidates, branches nothing came after, and sounds that stopped
appearing; preferred sounds, by survival across revisions; and workflow
patterns, from the sequence of revision origins.

The sixth, average project completion time, is named as unmeasurable rather
than approximated. A project records when it was saved and never when it was
begun, and nothing marks one finished, so any figure would be invented.

**The question.** `lib/creativeRecommendation` turns those counts into
something worth saying, and the seed's own example is written as a question --
"should I prioritize warmer timbres?" -- so that is the form: an observation
and a question, never a directive, and nothing acts on the answer by itself.
Three of anything is the floor, because the seed's word is "consistently" and
two is a coincidence. Where the creator has already said why they turned
something down, the relay gap is quoted verbatim rather than summarised: a
paraphrase of "that's not what I heard" is a lower-value signal than the
sentence itself (Amendment B), and the observation stays a count so the studio
never characterises their taste back at them.

**Nothing claims an audience.** XVI.3 is the one clause in this section still
absent, and it should be: nothing has been published from this build and
nothing measures listens, replays or skips. Asked about listeners, the
intelligence says there are none to know about and that a sentence about them
would be made up, rather than producing the seed's other example sentence off
data that does not exist.

## The four disclosure levels - 2026-09-05

XVII.3 and C.1, closed on the owner's instruction. `lib/disclosureLevels`
declares them and `test-58-disclosure-levels.cjs` checks them in the running
app (11 checks); 12 unit assertions cover the table and the mapping.

**Amendment A §16 is the fence, and it was built to first.** "The professional
DAW controls should NOT disappear... we should not turn SoulSonus into six
giant buttons. That would destroy much of what you've already built." So
nothing was removed, nothing was collapsed, and the first thing the browser
test asserts is that all fifteen specialist utilities are still on the rail --
before and after every level behaviour it exercises.

**§17's complaint is narrower than it looks.** "Your screenshot is not
fundamentally wrong. It is too simultaneous." The fix is hierarchy, and the
sentence that judges an implementation of it is "that preserves everything
while making SoulSonus feel substantially calmer".

So: every surface the app puts on screen is assigned a level, and the
assignment is enforced rather than described. The utilities rail types each
entry against the table, so a utility added without a declared level does not
compile; `unreachableSurfaces` reports anything the table does not account
for, because a surface belonging to no level is one refactor from being
dropped. Level 2 follows the work, by the amendment's own examples -- create
opens the expression engine, write opens the room for writing, build opens the
structure -- and a room that carries its own surfaces gets no opinion rather
than a guess at one. Level 4 is described to the creator as filed, never as
hidden.

**The creator outranks the hierarchy, and that took a fix.** Level 2 suggests
only until they choose; after that the choice is theirs in every room. It was
not: `StudioCanvas` unmounts on a room switch -- its own comment says so about
the editor tools -- so a bench they had picked was forgotten the moment they
looked at the mix, and the level put its own suggestion back in its place.
That is the organizing layer overruling the creator, which Amendment D
forbids. The open bench and the fact that they chose it live in the session
now, and the browser test walks two rooms and back to prove the level never
takes it off them.

**One contradiction the table itself exposed.** Vocal-to-Lyric was declared
level 2 -- reading a take as lyrics is writing, which is the amendment's own
example of a level 2 activity -- while being reachable only from the level 4
rail. Rather than relabel it to match where it happened to sit, the Write &
Record room now offers it too. It is still on the rail: a second door, not a
move.

## Saving and opening a named version - 2026-09-05

The reported defect was not real and is withdrawn above: no take was ever lost.
Verified three ways -- the snapshot in IndexedDB carries every note, calling
`handleOpenProject` directly restores every note, and the repaired test now
opens the version through its own button and gets all of them back.

Two real faults were in that path, and both are fixed.

- *A saved version reopened under a different name.* `buildSnapshot` wrote
  `dawState.projectName` -- the name the session happened to be carrying -- into
  a row saved under the name the creator typed. Saving "Take One" therefore
  produced a row called Take One whose own state still said the old name, and
  opening it put the creator in a project called something else. The snapshot
  now carries the name it is saved under.
- *A throw left the projects screen dead.* `save` and `open` set a `busy` flag
  that disables every control on that screen and cleared it on the line after
  the await, with no `finally`. Any failure -- a storage quota, a refused
  transaction -- left the flag set: no message, no retry, and the creator's only
  route back to their saved work greyed out. Both release it in a `finally` and
  report the error now.

Three test files were addressing controls that had been renamed and were timing
out before they measured anything: `test-21` (the OPEN button above), `test-24`
(a room renumbered to `2. WRITE & RECORD`) and, earlier, `test-31`. Repaired to
address the current controls, not weakened. `test-24` now passes end to end --
the recorded vocal take survives a reload byte for byte.

`test-15` is not repaired: it is written around a six-room layout with a BUILD
room that no longer exists, which is the second finding above rather than a
selector to swap.

## The collaborative state model - 2026-09-05

XV.1, the last of the three absent clauses that could be built honestly here.
`lib/collaborativeState` is the model; `test-59-collaborative-state.cjs` is 33
checks in the running app, 21 of them run against the module the app itself
loads rather than a copy compiled for a test.

**The clause is one sentence and it is not about a socket.** "A serious
implementation requires more than Socket.io. It needs a collaborative state
model." The easy half already existed -- a role union, a contribution record, a
screen. What was missing was the half that makes those mean anything when two
people are working: a log of who did what, when, to which track, producing
which version, that two machines can exchange and agree on.

So the seed's own chain is the file's shape, in its order: project ->
participants -> roles -> permissions -> assets -> tracks -> revisions ->
operations -> ownership/provenance. Three properties are asserted rather than
claimed -- two peers merge to the same state either way round, receiving the
same peer twice changes nothing, and everything both of them did survives it.

**Amendment F decides the two hardest rules.** There is no last-write-wins path
anywhere in the merge; it is a union, so no rule exists under which one
participant's take can replace another's. Two people who performed onto the
same track both keep their take and the collision is reported for a person to
settle by listening. And a capture is never refused out of the log: a
participant without permission to perform still has their audio kept, with the
refusal recorded beside it saying it was kept anyway. Losing a take to a
permission check is exactly the failure the amendment was written about.

**Permissions are enforced and refusals are recorded, not dropped.** A writer
who tries to mix is refused, the operation stays out of the log, and the
refusal stays in it -- the creator can see that someone tried.

**The five questions section XV names are answered off the log or not at all.**
Who added it, what changed, when, which version produced the final asset, and
what belongs to whom. An asset the log never saw gets `null` and a sentence
saying that is an absence of record, not an absence of work. The ledger reports
counts and tracks and refuses to compute a percentage: one capture can be the
song and forty mix tweaks can be nothing, and the section says this matters
financially and legally.

**There is still no transport, and it says so.** `unconfiguredTransport`
reports itself unconfigured and throws rather than silently succeeding at
publishing, and the collaboration screen reads that status instead of stating
it. The screen now reads the model rather than holding a list of its own, which
is why it has history on a project nobody has shared: the creator is a
participant like any other, and what they did is recorded the way a
collaborator's would be.

### Two defects in the revision tree, found by building on it

The version history XV asks for points at revisions, so the tree had to be
sound. It was not, and neither fault was visible from the screen.

- *Every commit made two revisions, kept one, and pointed it at the twin it
  threw away.* The revisions were built inside the `setRevisions` updater,
  which StrictMode invokes twice, and the current-revision ref was set from in
  there. The tree read as a row of orphans: no root at all, every parent id
  resolving to nothing, `childrenOf` always empty, `isBranchPoint` never true.
  The branch that clause XI.4 exists to keep was being recorded against a node
  that did not exist. Built outside the updater now; the same trap is
  documented forty lines below for undo and redo, which was fixed the same way
  earlier.
- *Every revision stored the state from before the edit it was named after.*
  The commit effect read `tracksRef.current`, and that ref is synced by an
  effect declared after it, so it held the previous render's tracks. Jumping
  back to a version would have restored the version before it. The effect has
  `tracks` and `sections` as its own dependencies; it uses them now.

Verified before and after by probe: 0 roots and 2 of 2 orphan parents before,
1 root and 0 orphans after, with the take present in the revision named for it.
`test-30`, `test-31` and `test-57` -- capture undo, the one undo stack, and the
analytics that count revisions -- pass after the change.

Two test files had drifted off renamed controls and were timing out before they
measured anything: `test-31` was clicking a rail label and a capture button
that no longer exist. Repaired to address the current controls, not weakened.

### Two findings held for the owner, not acted on

Both were turned up by repairing test selectors that had gone stale, and both
reproduce with this work stashed, so neither is caused by it. Neither is inside
XV.1, so under Reflex 10 they are proposed and held rather than fixed.

1. **Withdrawn, 2026-09-05. The take was never lost.** `test-21` reported a
   reopened version coming back with 0 captured notes. It was the test:
   `getByRole('button', { name: 'OPEN' })` matched a Songwriting Suite control
   sitting behind the modal -- its accessible name comes from a title reading
   "Open the full..." -- so the forced click landed on the backdrop and nothing
   opened. Called directly, `handleOpenProject` restored every note, and the
   row's own button restores every note now that the test addresses it. See
   the section below for what was actually wrong in that path.
2. **Arrangement sections are unreachable.** `test-33` addresses a `2. BUILD`
   room that no longer exists, and `SectionBuilder` -- which owns
   `#btn-add-section` -- is imported by `StudioCanvas` and never rendered, in
   this commit and in every commit checked back through the Create/Build
   fusion. Sections still exist in session state and revisions carry them; the
   controls for them are not on screen anywhere.

## The four naming clauses - 2026-09-05

A.8, C.3, A.12 and XVII.2 read ABSENT while the capabilities they name were
built and verified, because their checks looked for symbols nothing in the code
used. Closed on the owner's instruction, and closed the way CLAUDE.md says:
**the code was changed to match the text.** Not one line of `clauses.json` was
touched -- loosening a check to fit an implementation is the move that fakes
conformance, and it would have been available in about a minute.

**A.8 and C.3 -- the Interpretation layer.** It was 140 lines of JSX inside the
expression engine, so the thing the seed names had no name here.
`components/InterpretationPanel.tsx` is that panel, extracted whole. Per
CLAUDE.md §4 the handler set was diffed before and after: identical, five test
handles, and `test-51` passes unchanged.

**XVII.2 -- expression entry as a first-class surface.** The component was
called `UnifiedDeckBench` while rendering the words LIVE EXPRESSION ENGINE
across its own header, so the surface the clause names was called one thing on
screen and another everywhere else. Renamed to `LiveExpressionEngine`.

That clause also lists six ways in -- Talk, Sing, Hum, Beatbox, Mimic,
Upload -- and the surface offered five. Upload was reachable only from the
utilities rail, which is not "expression entry as a first-class surface": a
creator whose performance is already a file had to go looking. It is a tab now,
and it opens the same importer the rail does.

**A.12 -- explaining musical reasoning in creator terms.** This one needed a
concept rather than a rename. Read the amendment's own sentence again --
"I preserved that lift by widening the harmony and increasing rhythmic density
rather than increasing tempo" -- and it is three things: what was done, why,
and what was deliberately *not* done instead. The third is what makes it an
explanation rather than an announcement. The platform had six functions
producing sentences of this kind and no shared shape between them, so that
third part existed in one of the six, by accident. `lib/musicalRationale` is
the shape, with the rule that comes with it: a rationale whose `because` is
empty is not built at all, because an explanation with no reason is an
assertion. The intelligence now answers in its three parts rather than a run-on
sentence.

**One defect found while moving.** The performance pads had always read
`takeTrack.events?.length`, and `events` is not a field on `Track` -- so every
pad reported "0 events" however much had been performed on it. It was also the
one pre-existing `tsc` error this codebase has carried. The notes are on
`noteEvents`. **The src error count is now 0, not the 1 CLAUDE.md §4 names as
the baseline.**

### Review of XVI.1, XVI.4 and the E05 route - 2026-09-05

Five findings, all fixed, all with a test behind them now.

- *A section was reported as reworked when nothing in it changed.* The bar
  fingerprint was built in array order, so the same notes stored in a different
  order compared as different. Note order is not musical content and several
  edit paths rewrite the array without moving a note. Sorted before comparison.
- *The analytics recomputed the whole revision history on every captured
  onset.* `tracks` was an input that changed constantly and could not affect
  the output -- preference is measured by survival across revisions, so the
  latest revision is the reference and the live tracks are not. Removed, and
  proven equivalent before removing.
- *Words said about a take the creator kept were quoted as reasons they refused
  one.* A relay gap can be opened on an acceptance -- accepting a take does not
  mean it landed -- and the recommendation quoted every gap under an
  observation about rejections. Now only the gaps on candidates they turned
  down.
- *The service route held dead state.* `knownJobs` was written on every submit
  and read by nothing. Removed; `issuedPaths` is the real permission list, and
  it is capped now rather than growing for the life of the process.
- *A poll could answer with another job's row.* `query_result` returns a list,
  and the route fell back to the first row when the requested id was not in it,
  which would have reported a different job's state and its audio as this
  one's. The fallback is gone.

---

## The realization service route - 2026-09-04

Not a plan step. `e05Provider.ts` has addressed `/api/e05?action=...` since it
was written, and nothing in the repository implemented it: no `server.js`, no
`api/` directory, and a dev server with middleware for `/ort/` and nothing
else. So the fetch fell through to the SPA, came back as `index.html`, and the
provider's own guard reported NO_SERVICE_ROUTE. **That is why every realization
badge read NO ANSWER** -- not because ACE-Step was missing. A creator could run
`docker compose up`, have ACE healthy on :8001, and still have nothing for the
browser to talk to.

`server/e05Route.ts` is the missing half, mounted twice from one
implementation: a vite plugin in dev, and `server/index.ts` built to
`server.js` for production -- the file `npm run clean` has been deleting since
before it was written. It maps our request onto ACE-Step 1.5's async API and
maps the answer back, and decides nothing about music.

Three properties make it a service layer rather than a proxy. The host address
and the API key stay server-side, because ACE's `route_setup.py` admits only
localhost origins and a key in a client bundle is a key anyone can read.
`?action=audio` serves only paths this process saw ACE produce -- it reaches a
file-reading endpoint on the model host, and an unchecked path there is an
unchecked path on that host. And nothing invents a result: unreachable is
reported as unreachable, a failed job as failed with whatever reason the host
gave.

Verified end to end against `ace-stub.mjs`, which answers ACE's wire protocol
with a fixed tone and is **not a model**: `test-56-e05-route.cjs`, 14 checks.
The studio submitted a take, polled through a running state, fetched the
produced audio and built a candidate whose scores were measured against the
creator's own take -- 49.8 / 49.3 / 50 / 49.8, which is what a one-second tone
should score against a beatbox, and the first candidate in this project's
history produced by an actual round trip rather than asserted. The instruction
that arrived at the host carried the creator's measured expression, which is
clause V.4 working live rather than only in a unit test.

What this cannot prove is anything about realization quality: the stub
realizes nothing.

### Against the real ACE-Step host - 2026-09-04

Run afterwards, and it earned its keep immediately. The upstream project was
cloned, its dependencies installed from PyPI, and `acestep.api_server` started
on :8101 -- the real FastAPI server, its real routes, its real request model.
The service route was pointed at it and a job submitted through
`server.js`.

The host accepted it and named it (`de6d8207-1383-411e-...`), which settles
the contract questions the stub could only assume. Two things it settled that
the published API reference does not say, and both were defects here:

- **`result` is a JSON array, not an object.** A live server returns
  `[{"file": ..., "status": 2, ...}]`, because a job can be a batch. The route
  read `file` off an object, so on every *successful* job the path would have
  been undefined and the realization would have died with "the host reported
  success but returned no audio". The stub, written from the documentation,
  returned an object and could never have shown this. It now returns the array
  the server returns.
- **A failed entry carries the host's own `error`.** The route said "the host
  reported the job failed and gave no reason" while the host had given a
  paragraph naming exactly what went wrong. It carries the reason verbatim now,
  and no longer reports a seed of 0 for a job that never got one.

Both live payloads are now fixtures in the suite, so neither can come back.
Also verified from the cloned source rather than from a document: the API key
travels in `Authorization: Bearer <key>` (`acestep/api/http/auth.py`), and the
multipart file field is `src_audio` or `ctx_audio`, saved to a temp path
(`release_task_request_parser.py`) -- which is what the route sends, and why it
sends the file rather than a `src_audio_path` the host could not read.

**Generation itself could not run here, and the reason is not SoulSonus.**
This machine has no GPU and, more decisively, the model weights cannot be
fetched: HuggingFace is denied by the environment's egress policy (403 on
CONNECT), ModelScope and hf-mirror have no route, and `download.pytorch.org`
is blocked as well. The host reported this itself:

    ERROR: Failed to download main model: Both HuggingFace and ModelScope
    downloads failed.

So the route is verified end to end against a real server for status,
submission, the polling loop, the result shape and the failure path. What
remains unverified is one thing only: that a checkpoint with weights produces
audio the contract then scores. `scripts/live-verification/verify-real-ace.mjs`
is that last mile as one command, to be run on a machine that has them:

    ACE_STEP_ENDPOINT=http://localhost:8001 npm start &
    node scripts/live-verification/verify-real-ace.mjs http://localhost:8080

It reports what happened rather than deciding what should have: a host with no
weights prints "the ROUTE works, the DEPLOYMENT could not generate" and the
host's own reason, because those are two different findings.

Two corrections came out of checking the upstream project rather than
recalling it. `acestep-v15-base` and `acestep-v15-turbo` are the 2B family,
not 3.5-4B; the 4B models are the XL variants. And extract, lego and complete
are reachable on **both** base checkpoints, not only `xl-base` as this
codebase's contract said -- so a deployment can run the lighter 2B base and
keep all six tasks, while an `sft` or `turbo` checkpoint silently loses stem
extraction. `e05Contract.ts` and the inference-server README now say so.

`test-38-honest-candidates` asserted the route's absence as the honest state.
It now asserts the property that survives both worlds: the seam answers with a
service status rather than the app shell, and an unavailable answer names a
reason the app knows how to show.

---

## Measured findings - Basic Pitch on mouth material (2026-09-01)

Read-only measurement, no source changed. Ran `public/models/basic_pitch.onnx`
headless over the three seeds in `public/audio/test/`, decoded with the app's
own `decodeNotes` and the app's own named heads
(`StatefulPartitionedCall:1` = frame, `:2` = onset).

| seed | peak onset | peak frame | notes at default 0.50/0.30 |
|---|---|---|---|
| `test_kick_seed.wav` | 0.416 | 0.323 | 0 |
| `test_mouth_seed.wav` | 0.484 | **0.818** | 0 |
| `test_bass_seed.wav` | 0.512 | 0.691 | 1 (C2) |

Threshold sweep, onset 0.50 down to 0.25:

- **Kick stays silent at every threshold.** It never produced a note, all the
  way down to onset >= 0.25. Basic Pitch does not hallucinate pitch on
  percussion. **This is the discriminator the spectral classifier lacks** --
  the two can run in parallel over one take with no risk of the transcriber
  stealing percussive hits.
- **Mouth material is heard but rejected by the onset gate.** Peak frame
  activation 0.818 says the model is tracking strong sustained pitch. Peak
  onset 0.484 sits just under the 0.50 default, so nothing decodes. It fires
  at onset >= 0.30. A mouth attack is softer than a plucked string, and the
  default is tuned for instruments.
- **A single lower global threshold is not the fix.** The bass seed produced a
  note at 0.50, 0.45 and 0.40, then went *silent* at 0.35 and 0.30.
  `decodeNotes` requires a rising edge -- `onset[f] >= t && onset[f-1] < t` --
  so dropping the threshold below the preceding frame's value destroys the
  edge. Thresholds have to be chosen per material, not lowered globally.

**Limits of this evidence, stated plainly.** Three 2-second seeds, one
inference window each, one note each. This is directional, not a tuned
parameter set. Nothing here has been tested on a full multi-layer take.

**What it supports.** Running the spectral classifier and Basic Pitch in
parallel over the same take is sound: percussion goes to the classifier, pitch
to the transcriber, and neither has to make the discrimination the classifier
is documented as bad at. It does not yet support any specific threshold value.


---

## Correction - text2music has a place (2026-09-01)

An earlier note in this session called `text2music` "never used." That was
wrong, and Amendment G corrects it. The owner's instruction was to place
capabilities, not to remove them.

The placement follows from the contract, not from taste. `text2music` is the
only one of the six E05 tasks that appears in neither `SOURCE_AUDIO_TASKS` nor
`DURATION_LOCKED_TASKS`. It needs no performance to work from and invents its
own length. Every other task is anchored to the creator's audio.

So:

| Reached from | Offer |
|---|---|
| An empty session, nothing captured | `text2music` -- a way to start when there is nothing to start from |
| A session with a performance in it | the five anchored tasks, which preserve what was played |

Anything `text2music` produces enters labelled as AI-originated (clause
XVIII.3), so the creator can always tell which parts of a project came from
them. That labelling is what makes the offer honest instead of dilutive.
