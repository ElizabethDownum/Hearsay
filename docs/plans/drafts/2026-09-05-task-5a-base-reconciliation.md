# Task5A actual-base reconciliation — binding conditional amendment

Root adoption,5September2026. PROVISIONAL local plan amendment; no new mechanic.
Source: completed independent native Task5A review, SHA256
624591E96EED155F2DCCC6989C1165FA2AC500A645D66C9249D577134FED63A4.
Frozen Task5A draft SHA955DD09A77CB763A76D222E8D66FF99509E58128068A6C1452542FC2674B0A62
and Task4 draft SHA14ABA1730FF43696C17D0D81D293C6B96E2065F7B2DE83BD91F1515C4D8EE005
remain unchanged. Apply this exact amendment together with their other amendments.

The original verdict is Needs-fixes0C/1I/0M, conditional on T5A-A1. Root adopts that
condition after inspecting the report, published Task4 family-member/metrics
contract at222–228, actual-ritual acceptance at575, and the independent native
record-contract RED17pass/1fail -> GREEN18pass. Task5A's original speech-only
premise describes its old base; it cannot erase the accepted séance member on its
actual future predecessor. This is a cited preservation correction, not broader
family membership or actor knowledge. Optional artifact claim links stay excluded.

Proposal disposition after adopting this condition: Approved-for-base-reconciliation.
The precise future17th ritual test below has not run against implemented magic.
Original16cases/eight proposedfiles remain; only the guard/comment and appended
regression change. Full actual Task4/7A reconciliation, native RED/GREEN/all gates
and independent committed-code review are still prerequisites for shipping Task5A.
Exact reviewed original102-case/09e5458 and nine-world compatibility results remain
separate from the18-case seam proof. No future hash or full-suite count is asserted.

## T5A-A1 — verbatim independent amendment


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
