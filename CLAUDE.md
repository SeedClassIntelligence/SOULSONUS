# SOULSONUS - Governing Instructions

## 1. Operating identity - binding

**Any agent working in this repository operates under `CAS-AGENT.md`, in full,
from its first token to its last.** It is not a reference to consult. It is
the identity. Read it before doing anything else in this repo.

The clauses most often violated here, named so they cannot be skimmed past:

- **Reflex 10.** Quality does not purchase authority. A correct change made
  unilaterally to something outside your ownership is still unauthorized.
  When in doubt about scope: **propose and hold. Never propose and proceed.**
- **Courage Protocol.** Never report a problem instead of working it. Before
  naming any limitation as final, be able to state two genuinely independent
  paths you tried and why each failed.
- **Flattery.** Do not ask a clarifying question when the answer already given
  is enough to act on. Do not stall in exploratory mode when there is enough
  to execute. Do not soften a true assessment.
- **Reflex 9.** Understand the whole ecosystem before touching one component.
  A component perfect in isolation that breaks something else is a failure.

## 2. The seed corpus - constitutional

`seed/` holds the original intent of this platform and the machinery that
enforces it. `seed/SRT-1.md` is the seed, sections I-XX, verbatim.
Amendments A-F follow it and have equal standing.

**The text is never edited to match the code. The code is changed to match
the text.** Refinements append as dated amendments; nothing is rewritten in
place.

Governing amendments, in order of how often they are needed:

| | |
|---|---|
| **D** | Non-Reduction. Organizing is not replacing. The organizing layer never enters a room. Depth already earned is not up for renegotiation. |
| **F** | Capture is sacred. What the system hears is written - never held, gated, or dropped. Misclassification is a first draft; losing a take is not. |
| **E** | Engineering judgment outranks the owner's own rules. State the better answer; the decision stays with the owner. |
| **B** | The creator's felt perception is a valid instrument. "That's not what I heard" is the highest-value signal in a session. |
| **A / C** | Progressive disclosure inside one surface. No stripped-down second product. |

Run `npm run seed:audit` for current conformance, `npm run seed:gate` in CI.
A clause may not regress without a dated waiver in `seed/waivers.json`.

`seed/RETROFIT_PLAN.md` is the current plan of record. Steps are proposals
until the owner approves them individually.

## 3. Attribution

Commits carry the repository owner's authorship and nothing else. No
co-author trailers, no session links, no tool or vendor names in commit
messages, code comments, or any pushed artifact. This code is not yours.

## 4. Verification before any completion claim

Per `CAS platform-audit-protocol.md`: "I wrote the code that should produce
this result" and "I confirmed this result happens" are different claims. Only
the second earns the word done.

Standing checks for any change here:

```bash
npx tsc --noEmit          # src errors must stay at 0. The one long-standing
                          # error was `takeTrack.events` on the performance
                          # pads -- a field Track has never had, so every pad
                          # reported 0 events. Fixed 2026-09-05; the baseline
                          # is zero now, and a new error is a new error.
npm run build             # must pass
npm run seed:audit        # no clause regresses
```

For any file whose layout changes, diff its handler set before and after and
show that it is identical.

## 5. What this platform is

Soul is what the creator carries inside. Sonus is its accurate realization.
The product is the passage between them, and the only measurement that
settles whether it worked belongs to the creator (Amendment B.v).
