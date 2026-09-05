# Task 2 forensics implementation report

Implemented by root Codex under the disclosed direct-continuation authority and
PROVISIONAL review sequencing recorded in task-2-root-execution-note.md and HTML R3/R4.
Base 7d5608ff4d1c314a66e83eba00cc27ef56b983fb; final dc114da3006a75115784e4e894e880dd113226f5.
Status: IMPLEMENTED AND LOCALLY GATED. Independent code review remains pending;
Task 1's R15 correction is also review-open. No push or release.

## Delivered behavior

The paper-backed answer says its medium. Optional document:true passes through
utterance observation and every direct/raw/projected/relayed/received enemy copy.
Ordinary speech has no own document key. The enemy receives distant observations
only after actual field-report speech, and each reporter's traits can still change
the claim. The pure digest's H10 reads only received answer evidence, names the
spoken hand (including the avatar), ignores SOMEONE and self-source, and retains
one first-answer reference per subject. No custody or world lookup, new import,
watch-forensics path, or exposure formula was added.

## Chunks and arithmetic

| Chunk | Commit | New tests | Native focused checks |
| --- | --- | ---: | --- |
| C1 spoken medium | 8fee45613eca1c141a58c5e7cdc0ab0ca1795140 | 4 | RED 2 failures + 2 controls; GREEN 33/3 |
| C2 pure tracing fold | 664e0a278c9da2593d0c1e12f544a2affebfc36c | 4 | RED 3 failures + 5 controls; GREEN 78/7 |
| C3 integration and relays | dc114da3006a75115784e4e894e880dd113226f5 | 8 | final forensics 16/16 |

1764/113 -> 1780/114, +16 tests in one new file, zero removals.
All production edits are the eight licensed files. The no-omniscience, counter-sketch,
fair-cop, determinism and existing enemy whole-array pillars remain unchanged;
exposure.ts and turncoats.ts are unchanged. C3 adds acceptance coverage for existing
kind-agnostic consumers, not a new production mechanism needing another RED cycle.

## Acceptance evidence and limits

- Actual staged order physically delivers, guard application compels an answer in
  the invitational room, guard report arrives, and the nightly feature has the
  right subject and exact ordinary answer reference. Existing full auditSketch
  runs on these real worlds. Avatar exposure adds one; identified remains false.
- Name-dropper redirects the disclosed hand; vaguener conceals it. A real re-show
  supplies the previous hand, not hidden hop-zero. Repeated rows/days dedupe.
- Real venue pickup names the finder and produces no trace; silent hand-over and
  re-show circulation produces none. No new H7 interrogation gate or schedule rule.
- Informant exposure saturates by existing key; an eroded asset flips only with
  the actual new subject feature. A walk-in's tip waits for physical speech.
- One live engine tick-transaction run records its own successful forge/hand-over
  actions, then runLogOn replays that log from the same staged initial enemy order.
  Both reach a real interrogation and hash identically. This is not two replays;
  it does not claim a generated-town/UI interrogation route (Task 8 still owns that).
- Both paper and ordinary reports traverse a second actual relay. Claim mutation
  composes over the previously spoken copy; the marker remains lazy and intact.
- Full serialization compatibility: an in-memory esbuild override loads the eight
  original source files from committed 7d5608f, without changing the checkout.
  12 full serialized snapshots across three seeds match current code exactly;
  ordinary-answer counts are 2/2/2, so the answer path is non-vacuous. Proof SHA-256
  bce84777db40d2f3e565d60fa679feb455f5849828d06ab226fcadceceafef30.
  Raw before/after bytes and proof are under task-2-no-forge/. The after side ran
  with HEAD664e0a2 and C3 test-only work present; production equals final dc114da.

## Disclosed judgments and fixture corrections

H5 retains its first supporting answer rather than accumulating later refs; H10
mirrors it. Unknown hands have district:null; no district is invented for the avatar.
The brief's illustrative attributor only fills unnamed attribution, so the existing
name-dropper tests named-source lying. The full private pillar auditor was copied
mechanically into forensics-audit.ts, function-byte verified, leaving its original
registration module untouched. Task 3's already-planned shared-auditor extraction
must consolidate this temporary duplicate and caller.

Initial C1 fixture omitted required venue:null for a hand-over; corrected before
actual missing-marker RED. C3 first run exposed two vehicle assumptions: pickup
occurs on the next beat, and ordinary hearsay precedes the new re-show family in
insertion order. Corrected tests wait for the lawful beat and select the actual
paper-backed family. No confidence value, formula, seed, gate or timing law changed.
Raw initial failures remain in task-2-root-logs; they are not presented as missing-
feature REDs. Exact C1/C2 patches and C3 committed diff are retained there/alongside.

## Final local gate

All six native commands ran at the committed final HEAD. Bundle index-hHcrttYf.js
490.61 kB /145.28 kB gzip; CSS unchanged. Soak150:94%,141/9; MC15/8.
Complete-report comparator: all10 blocks /230 deterministic lines match bd930cc,
with known-good/changed/extra/missing controls passing. Raw stdout/stderr and the
native exit for each command are in task-2-root-gate. No independent approval is
implied by root's own gate.

### c1-red-corrected (native exit 1)

```text

 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay

 ❯ tests/sim/forensics.test.ts (4 tests | 2 failed) 18ms
   × a letter is learned only through the words actually heard > paper: answer and direct spymaster observation preserve the medium lazily 6ms
     → expected false to be true // Object.is equality
   × a letter is learned only through the words actually heard > paper: remote evidence waits for a spoken report and survives its trait projection 7ms
     → expected false to be true // Object.is equality
   ✓ a letter is learned only through the words actually heard > ordinary hearsay: answer and direct spymaster observation preserve the medium lazily 1ms
   ✓ a letter is learned only through the words actually heard > ordinary hearsay: remote evidence waits for a spoken report and survives its trait projection 3ms

 Test Files  1 failed (1)
      Tests  2 failed | 2 passed (4)
   Start at  12:43:25
   Duration  1.07s (transform 267ms, setup 0ms, collect 640ms, tests 18ms, environment 0ms, prepare 89ms)

```

### c2-red (native exit 1)

```text

 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay

 ❯ tests/sim/forensics.test.ts (8 tests | 3 failed) 74ms
   × forensics follows the hand named in testimony > a real interrogation traces a direct hand-over to the avatar with a fair-cop reference 41ms
     → expected [] to have a length of 1 but got +0
   × forensics follows the hand named in testimony > a name-dropper can blame another hand; the digest trusts the answer as spoken 15ms
     → expected [] to match object [ { subject: 'cyn' } ]
   ✓ forensics follows the hand named in testimony > a vaguener can hide the hand even while admitting that the answer came from paper 13ms
   × forensics follows the hand named in testimony > repeated answers and later digests dedupe by kind and disclosed subject 1ms
     → expected [] to have a length of 1 but got +0
   ✓ a letter is learned only through the words actually heard > paper: answer and direct spymaster observation preserve the medium lazily 1ms
   ✓ a letter is learned only through the words actually heard > paper: remote evidence waits for a spoken report and survives its trait projection 1ms
   ✓ a letter is learned only through the words actually heard > ordinary hearsay: answer and direct spymaster observation preserve the medium lazily 0ms
   ✓ a letter is learned only through the words actually heard > ordinary hearsay: remote evidence waits for a spoken report and survives its trait projection 0ms

 Test Files  1 failed (1)
      Tests  3 failed | 5 passed (8)
   Start at  12:48:23
   Duration  1.18s (transform 289ms, setup 0ms, collect 689ms, tests 74ms, environment 0ms, prepare 84ms)

```

### c3-relay (native exit 0)

```text

 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay

 ✓ tests/sim/forensics.test.ts (16 tests) 174ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  12:55:25
   Duration  1.31s (transform 309ms, setup 0ms, collect 692ms, tests 174ms, environment 0ms, prepare 92ms)

```

### tests (native exit 0)

```text
   ✓ offer execution validation and replay pins > (t5) a session that chooses an ask + advances 2 days hashes equal to a fresh loadSession  2442ms
   ✓ requested-beat local offer > a token-bound present target executes at the offered tick and replays exactly  513ms
   ✓ advance result and remote activity > an autonomous courier delivery never creates an offer or interruption  482ms
   ✓ advance result and remote activity > a hands-off Coronation stops at lost-clock on the coronation dawn, not one tick past  7310ms
   ✓ advance result and remote activity > loadSession stops at the same terminal death tick as live advance  12721ms

 Test Files  114 passed (114)
      Tests  1780 passed (1780)
   Start at  12:58:04
   Duration  28.70s (transform 10.10s, setup 0ms, collect 56.31s, tests 216.24s, environment 27ms, prepare 25.49s)

```

### lint (native exit 0)

```text

> hearsay@0.0.1 lint
> eslint .

```

### typecheck (native exit 0)

```text

> hearsay@0.0.1 typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.app.json

```

### build (native exit 0)

```text
> vite build

vite v7.3.6 building client environment for production...
transforming...
✓ 107 modules transformed.
rendering chunks...
computing gzip size...
../dist/index.html                   1.06 kB │ gzip:   0.54 kB
../dist/assets/index-WAkZKZ13.css    5.26 kB │ gzip:   1.54 kB
../dist/assets/index-hHcrttYf.js   490.61 kB │ gzip: 145.28 kB
✓ built in 1.15s
```

### soak (native exit 0)

```text
attempts histogram: 1→141  2→9
first-try failures by invariant: connected:4  keystone-2routes:1  scenario-castable:1  secrets-valid:3  speakable:4

 ✓ tests/world/soak.report.test.ts (1 test) 3105ms
   ✓ validator soak — 150 seeds > every seed serves a valid town within budget; prints the distribution  3104ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  12:58:43
   Duration  3.72s (transform 90ms, setup 0ms, collect 189ms, tests 3.10s, environment 0ms, prepare 89ms)

```

### mc (native exit 0)

```text
    turned/day:   0 2 3 3 3 3 3 3 3 3 3 3
    exposure/day: 0 0 0 0 0 0 0 0 0 0 0 0

 ✓ tests/harness/coronation.report.test.ts (1 test) 21940ms
   ✓ Coronation MC observation report (npm run mc) > runs the three usurper-damage archetypes over the seed batch and prints trajectories  21939ms

 Test Files  8 passed (8)
      Tests  15 passed (15)
   Start at  12:58:48
   Duration  22.93s (transform 644ms, setup 0ms, collect 4.44s, tests 55.87s, environment 1ms, prepare 983ms)

```

### comparison (native exit 0)

```text
    "tests/harness/digest-cost.report.test.ts > digest cost at campaign scale — 12 days (npm test; on-demand DIGEST_DAYS=40) > measures nightly-step wall ms vs evidence length; prints the table + day-40 extrapolation",
    "tests/harness/montecarlo.report.test.ts > Monte Carlo report (npm run mc) > runs both archetypes over the seed batch and prints the distribution table",
    "tests/harness/pressure-escalation.report.test.ts > exposure escalation — before/after pressure MC observation (npm run mc) > runs a day-0 informant provocation over the seed batch and prints score/pressure/order trajectories",
    "tests/harness/procgen.report.test.ts > procgen pacing probe (npm run mc) > canny reads the town and clears the gatekeeper that strands the patient whisperer",
    "tests/harness/procgen.report.test.ts > procgen pacing probe (npm run mc) > enemy-active: the nightly digest builds a sketch from the campaign it observes",
    "tests/harness/procgen.report.test.ts > procgen pacing probe (npm run mc) > same fixture, different world seed → a different claim count (butterfly, 2 days)",
    "tests/harness/vignette-reach.report.test.ts > vignette reachability probe (npm run mc) > fires micro-scenes across procgen towns with a bankrupt-blitz bot — prints per-def counts",
    "tests/harness/watch-window.report.test.ts > watch-window retune — evening-flow measurement (npm run mc) > measures public-venue utterance exposure per candidate window; prints table + verdict",
    "tests/world/soak.report.test.ts > validator soak — 150 seeds > every seed serves a valid town within budget; prints the distribution"
  ]
}
```
