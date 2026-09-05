# Plan 9 supplement R16 — a guard knows where they are standing

**Authored-by:** root Codex GPT-6 · **Date:** 2026-09-05
**Spec:** docs/design-spec.md (local perception and fair-cop failure); HTML review R16.
**Base:** dc114da3006a75115784e4e894e880dd113226f5 source, documentation HEAD b3873b6.
**Constraints:** r16-constraints.md. **Dependency:** separate plan review → R16 →
full gates and separate code review; raw-outcome recording then uses the repaired watch.
**Gate:** npm test; npm run lint; npm run typecheck; npm run app:build;
npm run soak; npm run mc. Capture each native exit independently.
**Status:** complete author proposal, not implemented or independently approved.

## Re-verified premises

The evaluator marks an expected-presence advisory contradicted when the expected
person is missing from the local feed. execution.ts intentionally excludes the actor
from that feed. counterintel.ts authors a guard's own expected presence at their post.
A full normal tick-loop control with the actual unchanged report:'outcome' policy
defers through the first watch window with this advisory and works after removing
only the advisory. The correction uses the already supplied recipient/local venue;
it does not expose any additional world information.

## R16 — repair the self-presence contradiction

**Model:** frontier_implementer (highest available suitable implementation seat).
**Review:** separate frontier_reviewer or the available top Claude reviewer, with
the seat substitution disclosed; plan authorship does not grade its own code.
**Files:** src/sim/directives/evaluator.ts;
tests/directives/self-presence.test.ts (new). Root owns the Git index.

First add the complete test file below and run it against the unchanged evaluator.
The measured baseline is 3 assertion failures and 7 passing controls: self-presence
method, eight-dimensional parity, and real watch work. A loader denial is not RED.
Then apply exactly this one-clause patch:

```diff
--- a/src/sim/directives/evaluator.ts
+++ b/src/sim/directives/evaluator.ts
@@ -117,6 +117,7 @@
 
   const contradicted = guidance.some((row) => row.kind === 'expected-presence'
     && input.local.tick >= row.at && input.local.venue === row.venue
+    && row.person !== input.recipient.id
     && !input.local.observations.observations.some((observation) =>
       observation.kind === 'presence' && observation.actor === row.person && observation.venue === row.venue));
   const personPresent = (id: EntityId): boolean => input.local.circleMembers.includes(id);
```

Complete new test file:

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { evaluateReceivedBrief, type ReceivedBriefInput } from '../../src/sim/directives/evaluator';
import type { AdvisoryGuidance, DirectiveBrief } from '../../src/sim/directives/types';
import type { Observation } from '../../src/sim/perception';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { hashWorld } from '../../src/sim/hash';
import { runUntil } from '../../src/sim/step';
import { buildWorld } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const brief: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
  priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
  guidance: [], active: { from: 0, until: 240 }, report: 'full', reportBy: 180, purpose: null,
};
function input(guidance: AdvisoryGuidance[], observations: Observation[] = []): ReceivedBriefInput {
  return { directiveId: 'd0', messagePrincipal: 'enemy', handoffFrom: 'issuer',
    version: { id: 'v0', parent: null, directiveId: 'd0', brief: { ...brief, guidance },
      claimedIssuer: 'issuer', replyRoute: ['issuer'], changedBy: null, changes: [] },
    recipient: { id: 'guard', faction: 'none', rivals: [], knownFactions: { guard: 'none' },
      traits: ['literalist'], mice: null, relationshipToIssuer: 0.8, strikes: 0, turned: false },
    local: { tick: 15, venue: 'square', circleMembers: ['guard', 'issuer'],
      observations: { observer: 'guard', tick: 15, observations } },
    perceivedScrutiny: 0, stage: 'execution' };
}
const expected = (person: string, venue = 'square', at = 0): AdvisoryGuidance =>
  ({ kind: 'expected-presence', person, venue, at });
const seen: Observation = { kind: 'presence', tick: 15, venue: 'square', actor: 'other' };
const cases: { name: string; guidance: AdvisoryGuidance[]; observations: Observation[]; method: 'observe' | 'hold' }[] = [
  { name: 'self is present at the supplied local venue without a self observation',
    guidance: [expected('guard')], observations: [], method: 'observe' },
  { name: 'another person still requires an observation',
    guidance: [expected('other')], observations: [], method: 'hold' },
  { name: 'an actually observed other person satisfies the advisory',
    guidance: [expected('other')], observations: [seen], method: 'observe' },
  { name: 'future guidance is not prematurely treated as contradicted',
    guidance: [expected('other', 'square', 16)], observations: [], method: 'observe' },
  { name: 'advisory at a different venue keeps its existing behavior',
    guidance: [expected('other', 'backroom')], observations: [], method: 'observe' },
  { name: 'self presence cannot override an avoided venue',
    guidance: [expected('guard'), { kind: 'avoid-venue', venue: 'square' }], observations: [], method: 'hold' },
  { name: 'self presence cannot override a not-before instruction',
    guidance: [expected('guard'), { kind: 'not-before', tick: 16 }], observations: [], method: 'hold' },
  { name: 'self presence cannot override a not-after instruction',
    guidance: [expected('guard'), { kind: 'not-after', tick: 14 }], observations: [], method: 'hold' },
];

describe('expected presence uses an actor’s own location without inventing a self observation', () => {
  it.each(cases)('$name', ({ guidance, observations, method }) => {
    const value = input(guidance, observations);
    expect(evaluateReceivedBrief(value, RULES).method.kind).toBe(method);
  });

  it('self guidance has the same eight-dimensional decision as no contradiction, and the input remains pure', () => {
    const value = input([expected('guard')]);
    const bytes = JSON.stringify(value);
    expect(evaluateReceivedBrief(value, RULES)).toEqual(evaluateReceivedBrief(input([]), RULES));
    expect(JSON.stringify(value)).toBe(bytes);
    expect(value.local.observations.observations).toEqual([]);
  });

  it('the standard authored watch actually works through the full tick loop without removing its guidance', () => {
    const fixture = miniTown();
    fixture.npcs = fixture.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
    for (const npc of fixture.npcs) {
      npc.traits = ['literalist'];
      npc.edges = npc.edges.filter((edge) => ['ada', 'bez'].includes(edge.to));
    }
    const initial = buildWorld(fixture, 'self-presence-watch', RULES);
    initial.network.spymaster = 'ada';
    initial.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    initial.enemy.observers = [{ id: 'bez', vigilance: 1 }];
    applyEnemyDecision(initial, { day: 0, features: [], inquiries: [], interrogations: [],
      watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 }] });
    const replay = structuredClone(initial);
    const record = initial.network.directiveState!.records[0]!;
    expect(record.authored.brief.guidance).toContainEqual({
      kind: 'expected-presence', person: 'bez', venue: 'square', at: 2400,
    });
    expect(record.authored.brief.report).toBe('outcome');
    runUntil(initial, 1440 + 1141, RULES); // first complete authored watch window
    expect(record.received).not.toBeNull();
    expect(record.execution?.workedDays ?? []).toContain(1);
    const report = initial.network.directiveState!.messages.find((message) =>
      message.payload.kind === 'directive-report' && message.payload.directiveId === record.id);
    expect(report).toBeDefined();
    runUntil(replay, initial.tick, RULES);
    expect(hashWorld(initial)).toBe(hashWorld(replay));
  });
});
```

## Acceptance and execution instructions

Before editing verify the source clause occurs exactly once, no worker owns these
paths, and current production differs from dc114da only by reconciled predecessor
changes. Never overwrite a later evaluator migration with a frozen whole-file copy.
Self-check: 8 table cases + 2 standalone cases = 10 new tests, no retired tests.
Run the new file and existing evaluator/enemy-orders suites: authored virtual result
39 passing cases across 3 files. Run both real compiler configurations, lint, build,
full suite, soak and MC at the implemented commit. Current suite floor is 1780/114;
on this exact source alone the expected new floor is 1790/115.

Compare every complete simulation report with the prior baseline, not selected
lines. This repairs real enemy behavior and may move metrics. Any change must be
explained and independently reviewed; do not claim unchanged metrics in advance.
If a changed emergent expectation is untraceable, stop with evidence. Do not weaken
the existing sim to make the new guard behave like the defective predecessor.

Record exact native RED/GREEN logs, actual commit identity, file/count deltas,
judgment calls and full gate output in the implementation report. No push.
Commit subject: fix: let a guard satisfy their own presence advisory

## Author defect review and disclosures

Pass 1 (mechanism outward): the venue and time guards still precede the self check;
other people remain observation-dependent. The self exception cannot override an
avoided venue or not-before/not-after constraints. No new mutable global or loop.
Pass 2 (tests upward): the full-loop test preserves authored self guidance and the
actual default outcome report policy. The initial test mistakenly expected 'full';
source and a fresh default-policy control disproved that fixture assertion. It now
asserts 'outcome' without changing policy. The initial before-work assertion was
also moved to the first complete watch window. No game timing was changed.
The cloned-run equality check proves deterministic execution from equal state; it
is not labeled live-own-action-log replay. Isolated author runs are not production
implementation or an independent review. No settings/configuration edit is licensed.

## Deferred scope

Raw directive-outcome history is Task5A2, kept separate from this behavioral repair.
Debrief folds/UI remain Task5B/6. No unrelated directive policy redesign is included.
