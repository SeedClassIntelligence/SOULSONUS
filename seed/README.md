# `seed/` -- SoulSonus Constitutional Layer

This directory holds the original intent of SoulSonus and the machinery that
enforces it. It is not documentation. It is the standard the build is measured
against.

## Why this exists

The repository already governs *how agents work* (`CAS-doctrine.md`) and *what
counts as checked* (`CAS platform-audit-protocol.md`). Nothing governed *what
the product is supposed to be*. So every session optimised locally and
correctly, no pass ever had to answer "did we move away from the seed", and the
original understanding drifted out of the build one reasonable decision at a
time.

The audit protocol already names the fix:

> The fix isn't "look harder" or "be more thorough" -- those are instructions an
> agent can't actually execute against, because they don't define a stopping
> point. The fix is removing the agent's discretion over *what counts as checked
> in the first place.*

This directory does that for the seed.

## Files

| File | Role |
|---|---|
| `SRT-1.md` | **Constitutional text.** The original seed, sections I-XX, verbatim. Immutable. |
| `SRT-1-A.md` | **Amendment A.** Reconciliation of build and reclamation. Equal standing. |
| `clauses.json` | The seed compiled into 93 numbered clauses, each with a check that can fail. |
| `attestations.json` | Signed, dated, evidenced sign-offs for clauses no machine can measure. |
| `waivers.json` | Explicit, reasoned exceptions. Drift is permitted here -- never silently. |
| `baseline.json` | Last recorded conformance. Regression from it fails the gate. |

## The three rules

**1. The text is never edited to match the code.** The code is changed to match
the text. Corrections and refinements are appended as dated amendments, never
written in place over what came before. This is the rule that stops the seed
from being quietly rewritten into whatever was built.

**2. Existence is not wiring.** A clause with a `wired` check requires the
concept to appear in N distinct files. A type declared once and referenced
nowhere reports `DECLARED_NOT_WIRED`, not honored. This closes the exact failure
the audit protocol names -- both halves existing and never meeting in the middle.

**3. Unmeasurable is not assumed honored.** A clause that no grep can settle
reports `UNVERIFIED` until someone signs it in `attestations.json` with a date
and concrete evidence. Silence never counts as compliance.

## Use

```bash
npm run seed:audit              # full report, failing clauses first
npm run seed:audit -- --summary # one line per section
npm run seed:audit -- --all     # include honored clauses
npm run seed:gate               # CI: exit 1 on violation or unwaived regression
```

## Statuses

| | Meaning |
|---|---|
| `HONORED` | Every check passes. |
| `PARTIAL` | Some checks pass. The concept exists but is incompletely realised. |
| `ABSENT` | Nothing in the build answers this clause. |
| `VIOLATION` | The build actively contradicts the seed. Worse than absent. |
| `UNVERIFIED` | Not mechanically checkable, not yet attested. |

`VIOLATION` outranks `ABSENT` deliberately. A missing feature is work not yet
done. A violation is the build asserting something the seed forbids -- a
hardcoded demo collaborator presented as collaboration, a parser that terminates
creative language at `UNKNOWN`.

## Amending

Refinement is expected; silent redefinition is not.

1. Append the new text as `SRT-1-<LETTER>.md`, dated, verbatim.
2. State in its header which existing clauses it controls over, and why.
3. Add or revise clauses in `clauses.json` with the `amendment` field set.
4. Re-run the audit. If fidelity moved, that is now visible and recorded.
