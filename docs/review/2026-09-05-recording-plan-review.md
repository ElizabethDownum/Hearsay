# Independent Task5A recording proposal review — 2026-09-05

**Verdict: Needs-fixes — 0 Critical / 1 Important / 0 Minor.** The Important
finding is a plan-mandated future-predecessor regression, not a current gameplay
failure. The exact recording changes otherwise satisfy their narrow laws. Conditional
disposition: the proposal can be Approved-for-base-reconciliation after root adopts
T5A-A1 below verbatim and carries its actual-ritual regression into implementation.
Actual Task4/7A source reconciliation, native implementation gates and independent
code review remain required. Nothing in this report approves implemented Task5 code.

Reviewer: independent native Codex seat inheriting root capability, matching the
original author. No children, external calls, source/index/docs edits or commits.
Task3A remained the sole production writer. All reviewer files are under the named
review directory, plus this report.

## Exact authority, inputs and validation baseline

Read the complete frozen Task5A draft, report, constraints, all exact proposed code
and 16 cases, preparation/preflight/test/compatibility hosts and manifests. Read the
relevant design-spec debrief, speech, phase, serialization and no-omniscience laws;
the complete `.superpowers/sdd/plan11-constraints.md`; and the actual Task3/4 seams.

- Frozen Task5A draft SHA256:
  `955dd09a77cb763a76d222e8d66ff99509e58128068a6c1452542fc2674b0a62`.
- Embedded diff, original saved diff and independently regenerated diff are identical
  after ordinary text decoding; patch SHA256:
  `6cb405d3124901f9fe4963a861a7e20e02105ea40a60c504cabb437872f377b3`.
- All eight regenerated proposal texts match the original relative-source map and
  every per-file manifest hash. Six production files, two test files, exactly 16
  distinct new test identities. The existing artifact suite changes only by two
  added `claimId: soleBelief(world, 'ada').claim.id,` lines; no line or assertion is
  removed, and both original `toEqual` objects retain all previous keys.
- Validation source is committed `09e54582f0a5fc9505e396bd1910c800c7413fff`,
  snapshotted with `git archive` into the reviewer-owned directory. Its 227 source,
  test, runtime/config and required asset-manifest files remain byte-identical to
  that commit. No live partial Task3A source was read as a validation input.
- The copied preparation host is byte-identical to the author host. Its incidental
  `git rev-parse HEAD` finds outer documentation HEAD `20a342a`; this is explicitly
  **not** the source baseline. `baseline-manifest.json` and each native invocation
  bind the real source to `09e5458`.
- Before/after manifests prove all 114 protected historical Task5A files unchanged.
  Original Task4 bytes were read only. The original six-file snapshots remain
  probe inputs, never installation instructions over future magic source.

Evidence is under `.superpowers/sdd/task-5a-native-plan-review/`: `input-integrity.json`,
`baseline-manifest.json`, `protected-before.json`, `protected-after.json`,
`final-integrity.json`, and complete binary-captured stdout/stderr/exit/invocation
files. The active snapshot is `node_modules/hearsay-baseline` inside that directory.

## I1 — Task5A's explicit kind guard deletes Task4's séance family membership

**Severity: Important. Plan-mandated.** Locations:

- Task5A draft lines 203–215, particularly line 214, replaces the old claim-bearing
  guard with `(e.kind === 'inject' || e.kind === 'telling')`.
- Task5A premise line 33, constraints' “Keep the existing threadOf API speech-only”
  sentence, and new-case comment line 338 encode the stale predecessor assumption.
- Task4 draft lines 68–72 gives `SeanceRecord` an actual required `claimId`.
  Lines 222–228 explicitly require retaining séances in `threadOf`, with metrics
  narrowed separately so that family membership never invents living reach.
  Its actual-ritual acceptance at line 575 requires one séance in the family thread.

After Task4, Task5A's literal hunk silently filters that required record out. The
new return type still permits it, so this is not reliably caught by compilation.
The current102-case GREEN cannot cover a variant absent from the committed source.
This violates the debrief's operation/causal-chain requirement and Task5A's own
instruction to preserve the actual magic predecessor; the author’s narrow scope
does not authorize deleting a previously accepted family-thread member.

Independent seam proof retains all 16 original cases and adds two reviewer controls.
It supplies the exact published Task4 `magic-types.ts` body and only its séance
ChronicleEntry union arm as separately identified validation inputs. One control
stages a valid published record-contract row next to an actual minted paper viewing.
This is deliberately a record-contract fixture, **not** a claimed live séance route.
The second control proves the private-root twin exercises real observation, player
intel and enemy network/asking evidence, with empty-event controls.

Frozen Task5A selection, native `seam-red-native`:

```text
 × ... retains the published Task4 seance variant in its family while excluding exact-linked paper
   → expected [] to deeply equal [ Array(1) ]
 Test Files  1 failed (1)
      Tests  1 failed | 17 passed (18)
```

Native exit1. The only GREEN source change adds `|| e.kind === 'seance'` to that
guard. `seam-green-native`, native exit0:

```text
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

`prepare-seam-proof.py`, `reviewer-controls.txt`, the two separate seam source maps
and raw logs preserve this proof. The exact eight-file proposal maps were never
changed by the seam experiment.

## T5A-A1 — exact conditional amendment for controller adoption

This amendment preserves the approved predecessor's behavior. It adds no gameplay
mechanism or new production file. Do not edit the frozen Task4/5A author evidence.

Replace the Task5A replacement for `threadOf` with this complete block, only after
Task4 has actually added the `seance` variant:

```ts
/**
 * Injections, tellings and séances belonging to one story family, in recorded order.
 * Family membership does not imply a human heardBy list. Optional artifact claim
 * links remain separate debrief associations and do not join this family helper.
 */
export function threadOf(world: WorldState, family: RumorId): Extract<ChronicleEntry, { claimId: string }>[] {
  return world.chronicle.filter(
    (e): e is Extract<ChronicleEntry, { claimId: string }> =>
      (e.kind === 'inject' || e.kind === 'telling' || e.kind === 'seance')
      && world.claims[e.claimId]?.family === family,
  );
}
```

The binding `threadOf` law becomes: retain the actual predecessor's injection,
telling and séance family members; optional artifact claim links do not make paper
a member. Full debrief operation threads remain Task5B. Preserve Task4's metrics
kind narrowing and its existing success test unchanged. Change only the misleading
comment in the first original new recording case to `// exact-linked paper stays outside this family helper`.

In the already licensed new `tests/sim/debrief-recording.test.ts`, add this import:

```ts
import { seanceWorld } from './helpers/seance-town';
```

Append this **17th permanent case**, using the actual Task4 helper and actual ritual
action alongside a real document viewing. Retain all original 16 test identities
and assertions. This exact future test is proposed, not executed on the current
baseline; the runtime evidence above proves the narrower record seam separately.

```ts
it('preserves an actual séance family member while exact-linked paper stays outside the family helper', () => {
  const ritual = seanceWorld();
  applyAction(ritual, { kind: 'seance', tick: ritual.tick }, RULES);
  const departed = ritual.departed!;
  const ritualRow = ritual.chronicle.find((row) => row.kind === 'seance');
  expect(ritualRow).toBeDefined();
  expect(ritualRow).toMatchObject({
    kind: 'seance', claimId: departed.claimId, departedId: departed.id,
  });
  expect(threadOf(ritual, departed.secretId).filter((row) => row.kind === 'seance'))
    .toEqual([ritualRow]);

  const paper = paperWorld();
  applyShow(paper, 'a0', 'ada', paper.tick, [CIRCLE]);
  const viewing = artifactRows(paper).at(-1)!;
  const claim = linkedClaim(paper, viewing, 'ada');
  expect(paper.chronicle).toContain(viewing);
  expect(threadOf(paper, claim.family)).toEqual([]);
});
```

Inventory after adoption remains eight files/six production; new permanent cases
become17, not16. Actual implementation floor is actual predecessor +17 cases/+1
file, with future generated cases counted from actual output. Include
`tests/sim/seance.test.ts` and `tests/sim/chronicle.test.ts` in focused validation,
preserving the existing actual-ritual metrics/member assertions. Run meaningful
RED with the stale two-kind guard on that future base, then GREEN with the three
kinds; do not erase a predecessor variant or weaken its test to obtain GREEN.

## Charge dispositions

1. **PASS on the reviewed recording seam.** `deliverDocument` returns the exact
   mint result at its existing site. Four callers attach only that returned ID;
   forge, venue placement and avatar viewing omit the key. Identical same-tick
   papers map to distinct roots. Report roots are read after `projectPayload` and
   `replaceCarriedContent`, in the surviving spoken item order, and mapped into a
   fresh array before a later hop. Identical content does not perform any join.
2. **PASS.** No `SpokenNetworkPayload` or actor `Observation` gains roots. The raw
   observation projector constructs network observations explicitly. Native twin
   perturbation preserves speech while changing private metadata. The independent
   firing control proves network observation and both principal stores actually
   change with speech, remain unchanged with silence, and are equal across root
   twins. Existing field-report combined-state perturbation and positive controls
   also passed. No new trait/seed/price/resource/timing read or write is proposed.
3. **PASS.** Transient per-hop arrays and the chronicle array are independently
   owned; the real phase test mutates a returned event without changing its recorded
   row, then actually relays with omission and verifies earlier content remains.
   Original tests cover replay, refused/no-claim branches, empty report roots versus
   absent ordinary-speech state, and explicit mismatch versus legacy explanation.
   No new receipt time or hidden original content reconstruction is introduced.
4. **PASS for exact links/private-state compatibility; FAIL at the future family
   API seam until T5A-A1.** All nine complete worlds equal after stripping only
   `ArtifactRecord.claimId` and `NetworkSpeechRecord.reportRoots`. No intel/evidence/
   transport/claims/beliefs fields are stripped. Six actual viewing links and six
   actual rooted report speeches fire. `explainBelief` accepts exact new IDs;
   explicit different IDs cannot fall back to matching text.
5. **PASS.** Exact patch/input equivalence and assertion inventory are mechanically
   verified. Native original RED is12 assertion failures/4 passing controls;
   exact proposal+affected suites GREEN is102/5files, comprising16new+51artifact+
   5chronicle+11field-report+19forensics. The old99 is historical dc114da evidence;
   the three approved R20 cases account for the new total. Both compilers and all
   eight-file virtual lint pass with zero warnings and errors.
6. **CONDITIONAL on T5A-A1 and actual future seam reconciliation.** The omitted
   ordinary-presence case at Task5A line490 is compatible as written. Task3 lines
   587–602 changes source closure only for actual arcane residue atoms, explicitly
   preserving ordinary omission closure; Task4 also preserves ordinary presence
   closure. An empty ordinary envelope proves transport/source closure, never a
   residue receipt. Keep Task3's physical receipt/omission tests and Task4's
   night-visit tests; preserve the additive physical union arms, source closure
   guard, magic capture order and copied physical refs. The real future conflict
   found here is the séance `threadOf` contract, not an excuse to change omission
   mechanics. Actual Task4/7A reconciled source and all native gates still remain.

## Independently executed native results

All commands were executed by native processes with binary stdout/stderr capture
and separately recorded real process exits. Scripts were copied byte-identically
inside the isolated source snapshot, so their original output paths never target
author evidence. The final host was checked again after relocation.

`base-native` — original sixteen cases, committed source, native exit1:

```text
 Test Files  1 failed (1)
      Tests  12 failed | 4 passed (16)
   Start at  21:32:37
   Duration  1.24s (transform 295ms, setup 0ms, collect 767ms, tests 62ms, environment 0ms, prepare 95ms)
```

`regression-relocated` — exact proposal plus four affected suites, native exit0:

```text
 Test Files  5 passed (5)
      Tests  102 passed (102)
   Start at  21:40:34
   Duration  2.02s (transform 692ms, setup 0ms, collect 2.94s, tests 1.21s, environment 1ms, prepare 597ms)
```

`preflight-relocated` — both actual compiler configurations and exact virtual lint,
native exit0; eight results have zero warnings as well as zero errors:

```json
{
  "scope": "virtual recording proposal only; no implementation",
  "sourceFiles": 6,
  "tests": 16,
  "tsconfig.json": 0,
  "tsconfig.app.json": 0,
  "lintErrors": 0
}
```

`compatibility-relocated` — all nine complete source/proposal pairs, native exit0:

```json
{
  "scope": "exact current/proposal execution in memory; new chronicle metadata stripped only",
  "fullWorldPairs": 9,
  "linkedViewings": 6,
  "rootedSpeeches": 6,
  "allPreExistingStateEqual": true,
  "sha256": "500aec4aa531c9ea3d9fb74d7dbb343d73d44822fc6e1e643a52f1992bca22fa"
}
```

The final comparison byte digest equals the historical author digest; no broad
normalization or unrelated snapshot update was used. Initial passing results before
host relocation remain separately saved. The future-record seam RED/GREEN results
are separate evidence and do not alter the exact102-case proposal result.

## Proof-host failures and limits

- Initial setup hit a reviewer Windows path-separator KeyError before snapshot
  creation. Its dependent prepare command found no directory. The reviewer host
  then normalized manifest keys; no proposed game/test assertion changed.
- Initial native sandbox loads failed at the known esbuild ancestor-read boundary.
  Those logs are retained and are not counted as RED. Exact native escalation ran
  the licensed tests/comparison; no environment permission/config workaround was used.
- The first compiler snapshot omitted committed `assets/manifest.json`, causing
  exactly TS2307 in `app/src/assets.ts`. The original diagnostic/log is preserved.
  Adding only that byte-identical committed asset as a validation input fixed the
  host; both actual compiler configurations then passed. No source assertion changed.
- **Concurrent-suite contamination occurred and was corrected.** The first snapshot
  lived directly under the review directory, where root Vitest discovered duplicate
  `.test.ts` files during Task3A's focused RED. Root reported24 extra cases. The
  reviewer stopped test execution, verified absolute source/destination paths stayed
  inside the owned area, and used native `Move-Item -LiteralPath` to move the whole
  snapshot under its excluded `node_modules/hearsay-baseline`. No deletion or root
  configuration change occurred. Only reviewer virtual path identities/runner paths
  changed. A native root `vitest list --filesOnly --json` then exited0, listed116
  root test files, and contained zero review-snapshot paths. Root was notified to
  treat its contaminated RED separately. `relocation.json` and
  `root-discovery-proof.json` preserve this disposition. The exact proposal regression,
  compilers/lint and nine-world comparison were rerun successfully on the final host.
- No full production `npm test`, app build, soak or MC gate is claimed by this plan
  review. The scoped affected suites, both compiler configurations and nine-world
  compatibility proof are actual executions. Full gate authority and actual future
  magic implementation remain with the controller and separate implementation review.
- The permanent17th actual-ritual regression is complete proposed code based on the
  frozen Task4 helper/API. Only the record-contract seam was independently executable
  now; no claim is made that future full magic production ran or passed here.

Original protected evidence and pinned baseline were rehashed at review close.
