# Plan 9 Task 3 accumulated native code review

**Verdict: Approved**
**Findings: 0 Critical / 0 Important / 0 Minor**

I found no correctness, security-boundary, termination, reachability, magnitude,
API-provenance, stage-calibration, or test-proof defect in the committed Task 3
range. This approval is limited to the accumulated committed implementation and
tests in `09e54582f0a5fc9505e396bd1910c800c7413fff..60506d9a582db60c60c627d6b42ec83f62ed709e`.

## Reviewed authority and source

- Review brief SHA-256: `F2C24B4F4BA6ADE67D6CECD6F342DE46211A43D966887208D0062B27C30E8938`.
- Frozen author draft SHA-256: `EBACFF982443BA604006D33CE62F5AD9AA11D95FE08E4C3DA70DB523A91176ED`.
- Scoped diff artifact SHA-256: `7F102805251DD464F5BE59193C8182648C6D23891E489AA78E3BF97BA4CE760B`.
- Task 3E report SHA-256: `6A7D31B88F31334E36044090E38A863C2CECF0B5DF1C9C6CDB7BE75DDEC86C03`.
- I read the author draft, A1 base reconciliation, all bound plan constraints,
  every implementation brief/report, the actual committed diff, and the affected
  production and test sources. I treated the authored complete code as a proposal
  to test, not as evidence that the implementation was correct.
- HEAD was `60506d9a582db60c60c627d6b42ec83f62ed709e` at every native gate. A final
  `git diff --exit-code HEAD -- src app assets tests` returned 0; see
  [`source-integrity.meta.json`](task-3-native-code-review/source-integrity.meta.json).
  The pre-existing dirty root documentation and separate Task 5B proposal files
  remained outside this review's writes.

## Code findings and boundary verification

The paid action validates the current integer tick, avatar, own-property venue,
exact next day, 15-minute alignment, half-open duration bounds, injected integer
price, affordability, and operation-id uniqueness before its first mutation. It
then debits once and appends one lazy window plus one chronicle record
([`magic.ts:25`](../../src/sim/magic.ts#L25)). The boundary tests exercise 16 invalid
action variants, missing rules/avatar/coin, three invalid prices, and both valid
edge windows while comparing the whole serialized world before and after rejection
([`scrying.test.ts:12`](../../tests/sim/scrying.test.ts#L12)).

Activation happens before the player phase, while scene capture happens after the
tick's actual utterances and askings have been resolved. This makes the first
window tick reachable and includes same-tick speech without reading history
([`phases.ts:617`](../../src/sim/phases.ts#L617),
[`magic.ts:72`](../../src/sim/magic.ts#L72)). The sensor consumes only the supplied
`TickEvents`, uses the purchased half-open interval, sees sorted live positions and
same-tick venue utterances/askings, and excludes network payloads and residue
([`perception.ts:132`](../../src/sim/perception.ts#L132)). The tests cover ticks just
outside and inside the interval, an empty/mismatched venue, stale speech, ordinary
circle behavior, no invented observer, a throwing chronicle getter, phase order,
live/replay equality, and untouched-world byte compatibility
([`scry-perception.test.ts:16`](../../tests/sim/scry-perception.test.ts#L16),
[`scrying.test.ts:50`](../../tests/sim/scrying.test.ts#L50)).

Each purchased window creates exactly one persistent trace at its first tick,
including an empty venue. `residueEvents` projects only its physical id, venue, and
creation tick; discovery and delivery latches cannot become a remote oracle
([`magic.ts:54`](../../src/sim/magic.ts#L54)). Ordinary perception emits residue only
for a real local actor after creation ([`perception.ts:82`](../../src/sim/perception.ts#L82)).
`rememberResidueSighting` validates the trace, venue, time, and witness, records one
first sighting per trace/witness, and reuses that first tick on later encounters
([`residue.ts:10`](../../src/sim/residue.ts#L10)).

Player and enemy principals receive distinct held roots because the hold fingerprint
includes the principal. A live attempt cannot duplicate; an omitted or terminal
attempt becomes queueable only on a later locally emitted residue observation
([`field-reports.ts:36`](../../src/sim/directives/field-reports.ts#L36)). At receipt,
the hold closes only if the actually spoken items include the exact four-field
residue atom ([`transport.ts:457`](../../src/sim/directives/transport.ts#L457)). Enemy
evidence preserves null speaker/addressee/claim/family and carries an optional
physical receipt; player intel receives only the reported physical atom
([`residue.ts:32`](../../src/sim/residue.ts#L32)). The seven mechanism tests cover
empty-tick delayed delivery, direct spymaster sighting, omission retry, terminal
retry, a pending-attempt control, the remote-oracle twin, principal independence,
empty spoken content, and two paid traces at one venue
([`scry-residue.test.ts:26`](../../tests/sim/scry-residue.test.ts#L26)).

The digest still has exactly its four licensed imports. It derives residue only
from enemy evidence plus the street map, emits one null-subject/null-family location
feature per venue, and does not infer a caster or rumor family
([`digest.ts:1`](../../src/sim/enemy/digest.ts#L1),
[`digest.ts:418`](../../src/sim/enemy/digest.ts#L418)). Physical reference identity
now participates in runaround equality, and nested residue data is copied rather
than aliased ([`digest.ts:132`](../../src/sim/enemy/digest.ts#L132),
[`digest.ts:368`](../../src/sim/enemy/digest.ts#L368)). The real digest tests prove
exact clones dedupe, different traces remain distinct, physical and legacy refs do
not collide, legacy behavior remains intact, and derived nested objects are isolated
([`scry-ref-runaround.test.ts:56`](../../tests/sim/scry-ref-runaround.test.ts#L56)).

The permanent shared fair-cop auditor requires a residue discriminant before legacy
dispatch, resolves the exact evidence and creation/sighting records, and, for remote
evidence, requires the exact heard field-report envelope and spoken atom
([`sketch-audit.ts:19`](../../tests/sim/helpers/sketch-audit.ts#L19)). Its suite has
direct and reported positive controls, 14 independently corrupted remote chains,
and the adversarial same-tick ordinary-asking twin that proves a stripped physical
ref cannot fall through to a legacy null-id path
([`sketch-faircop.test.ts:86`](../../tests/sim/sketch-faircop.test.ts#L86)). The two
pre-existing fair-cop tests retain their bodies and assertions. The forensics suite
changed only its helper import; its 19 cases and audit calls remain intact.

Magic provenance is an optional discriminant, so old rows retain absent keys. The
source helpers keep real NPC ids `scrying` and `seance` distinct from spells and do
not treat magic as an informant channel
([`provenance.ts:3`](../../src/intel/provenance.ts#L3)). Board routes retain actual
speech endpoints and a copied optional provenance; the web excludes magic carriers,
the informant ledger excludes magic rows/corroboration, and the report separates
magic from ordinary via buckets. Codex deductions reject endpoint-free séance rows
and deduplicate views of a physical telling only when a magic copy is present, so
no-magic histories keep their old counting behavior
([`board.ts:69`](../../src/intel/board.ts#L69),
[`web.ts:76`](../../src/intel/web.ts#L76),
[`ledger.ts:30`](../../src/intel/ledger.ts#L30),
[`report.ts:37`](../../src/intel/report.ts#L37),
[`codex.ts:44`](../../src/intel/codex.ts#L44)). Model and static-render tests cover
NPC/spell collisions, carrier and ledger exclusions, source buckets, scene-presence
classification, duplicate telling views, endpoint-free séance testimony, all five
existing panels, honest mixed-channel wording, registered residue text, and the
primitive icon fallback.

The implementation adds no entropy, dependency, configuration waiver, media, or
new content-art family. Its state growth is lazy; untouched worlds have neither a
`magic` key nor new row keys. Repeated operations remain separate paid windows and
traces, while the sketch magnitude is capped at one residue feature per venue and
does not increase player exposure because its subject is null. The two-cast test
pins the 30-coin/two-trace/one-feature case.

## Enforcement-first evidence

I inspected the scanner and physical auditor before substantive code review. The
allowlist is exactly:

```text
../../core/time
../rules
../rumors/claim
./state
```

The scanner's real pipeline is exercised by all four forbidden-import injections
and by line/block-comment controls. The first sandboxed focused command failed at
the known esbuild ancestor-read loader boundary before collection; the exact
licensed escalation then passed 24/24 tests in 2 files. Because the focused pass
preceded creation of the evidence directory, only its contemporaneous transcript is
preserved; raw buffers were not reconstructed by rerunning a green command. See
[`enforcement-first-transcript.md`](task-3-native-code-review/enforcement-first-transcript.md).
The later full-suite gate executed both enforcement files again with raw stdout,
stderr, and native exit captured.

## Independent native gates

All commands ran from `C:\Users\eliza\Desktop\ClaudeFiles\hearsay` with native
`npm.cmd`. Each metadata file records exact argv, cwd, UTC start/end, native exit,
and raw stdout/stderr paths.

| Gate | Native result | Raw evidence |
|---|---:|---|
| `npm.cmd test` | exit 0; 121 files, 1868 tests | [`meta`](task-3-native-code-review/npm-test.meta.json), [`stdout`](task-3-native-code-review/npm-test.stdout.log), [`stderr`](task-3-native-code-review/npm-test.stderr.log) |
| `npm.cmd run lint` | exit 0 | [`meta`](task-3-native-code-review/npm-lint.meta.json), [`stdout`](task-3-native-code-review/npm-lint.stdout.log), [`stderr`](task-3-native-code-review/npm-lint.stderr.log) |
| `npm.cmd run typecheck` | exit 0; engine and app TypeScript projects | [`meta`](task-3-native-code-review/npm-typecheck.meta.json), [`stdout`](task-3-native-code-review/npm-typecheck.stdout.log), [`stderr`](task-3-native-code-review/npm-typecheck.stderr.log) |
| `npm.cmd run app:build` | exit 0; 110 modules; JS 500.56 kB / 148.06 kB gzip | [`meta`](task-3-native-code-review/npm-app-build.meta.json), [`stdout`](task-3-native-code-review/npm-app-build.stdout.log), [`stderr`](task-3-native-code-review/npm-app-build.stderr.log) |
| `npm.cmd run soak` | exit 0; 1/1 | [`meta`](task-3-native-code-review/npm-soak.meta.json), [`stdout`](task-3-native-code-review/npm-soak.stdout.log), [`stderr`](task-3-native-code-review/npm-soak.stderr.log) |
| `npm.cmd run mc` | exit 0; 8 files, 15 tests | [`meta`](task-3-native-code-review/npm-mc.meta.json), [`stdout`](task-3-native-code-review/npm-mc.stdout.log), [`stderr`](task-3-native-code-review/npm-mc.stderr.log) |

The build retained Vite's warning for a chunk above 500 kB; no threshold or config
was changed. The exact emitted bundle remained `index-kKrWvCm3.js`, 500.56 kB and
148.06 kB gzip.

## Count reconciliation

The certified source baseline is 1783 tests in 114 files. The seven new Task 3 test
files execute 61 cases: scrying 27, perception 9, residue 7, runaround refs 5,
intel provenance 7, app provenance 4, and app session 2. The widened permanent
fair-cop suite adds 18 cases (2 positive parameter rows, 14 corruption rows, and 2
asking-twin cases). Those are the 79 authored Task 3 cases. Registry expansion adds
six more generated cases: one `VERB_TERM` case from 3B and five literal panel-term
hits from 3D. Thus `1783 + 79 + 6 = 1868`, and seven new files produce 121 total
files. No old test loss is hidden in that arithmetic.

Current related per-file output from the full native log is:

```text
tests/app/magic-session.test.ts             2
tests/sim/forensics.test.ts                19
tests/sim/sketch-faircop.test.ts           20
tests/sim/scrying.test.ts                  27
tests/sim/scry-residue.test.ts              7
tests/sim/scry-ref-runaround.test.ts         5
tests/sim/scry-perception.test.ts            9
tests/app/jargon.test.ts                   228
tests/app/magic-provenance.test.tsx          4
tests/intel/magic-provenance.test.ts         7
```

## Frozen stochastic comparison

I independently verified the comparator SHA-256
`99B1F00F7EDFA2824D8F9650C439E11A3D577D0DE264EB7A4A2CE48FE969C334`
and certified baseline hashes
`AE7E7EE3A8E05E11FD579F574B2D4726A41D96D98285B9A5390AF03C50152EFB`
(soak) and
`A1895B6E34D64A5DB41D5862661F8F3307C41B66B7D73CE707C76A79874AE12F`
(MC). The comparator ran against this review's raw logs and returned exit 0:

```text
reportBlocks: 10
deterministicLines: 230
allBlocksEqual: true
controls: known-good, changed-value, extra-output, missing-output
```

See [`comparison.json`](task-3-native-code-review/comparison.json) and the
[`comparator metadata`](task-3-native-code-review/comparator.meta.json).

## Limits of this approval

- The frozen stochastic comparison intentionally exercises the no-magic campaign
  reports. It proves those 10 complete reports are unchanged; it is not a many-seed
  magic balance study. Magic magnitude is covered by deterministic mechanism tests,
  including overlapping paid operations and per-venue feature deduplication.
- The current Task 3 stage deliberately adds no composer, button, or key binding.
  Engine replay and the real app session make `scry` executable and saveable, but a
  player cannot purchase it through the current shell. I treated that as the plan's
  explicit staging boundary, not as shipped end-user reachability.
- I did not perform manual browser, visual, keyboard, or accessibility inspection.
  The app build and server-rendered panel tests verify compilation and the specified
  provenance text/absence behavior, not final layout quality.
