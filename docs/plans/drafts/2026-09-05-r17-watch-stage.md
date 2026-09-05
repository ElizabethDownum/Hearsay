# Plan 9 supplement R17 — work begins after the watch starts

**Authored-by:** root Codex GPT-6 · **Date:** 2026-09-05
**Base:** dc114da source plus the separately proposed R16 evaluator correction.
**Spec:** docs/design-spec.md local action/physical observation law; HTML R9/R17.
**Constraints:** r17-watch-stage-constraints.md.
**Dependency:** independent plan review → actual R16 base → R17 → six gates and
separate code review. Neither predecessor nor this draft is certified implemented.
**Gate:** npm test; npm run lint; npm run typecheck; npm run app:build;
npm run soak; npm run mc (capture each actual exit, compare complete reports).

## Measured premise

settleDirectiveApplications checks location and time for a watch but accepts pending
and deferred execution states. A normal tick loop records work at 2400 while the
order is still pending. Its later attempt at 2415 resets workedDays, so 2430 records
the same night again. The raw recording probe exposed this existing mechanism;
it did not create it. In-memory before/after recordings preserve all old fields.
The recipient must have started the requested action before its work can complete.

## R17 — bind completion to the execution stage

**Model:** frontier_implementer; **Review:** separate frontier_reviewer or the
available top Claude reviewer, with any capacity substitution disclosed.
**Files:** src/sim/directives/execution.ts;
tests/directives/watch-execution-stage.test.ts (new). Root owns Git index/commits.

Add this exact test file first. Measured RED on the common R16 proposal is 3 failures
and 1 control: both premature states incorrectly report work, and the complete
window queues two reports. The attempted-state control already passes.

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { settleDirectiveApplications } from '../../src/sim/directives/execution';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { runUntil } from '../../src/sim/step';
import { buildWorld } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const town = miniTown();
  town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) {
    npc.traits = ['literalist'];
    npc.edges = npc.edges.filter((edge) => ['ada', 'bez'].includes(edge.to));
  }
  const world = buildWorld(town, 'watch-execution-stage', RULES);
  world.network.spymaster = 'ada';
  world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [],
    watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 }] });
  const record = world.network.directiveState!.records[0]!;
  const message = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
  expect(realizeNetworkForward(world, message.id, { venue: 'square', members: ['ada', 'bez'] }, 0, RULES)).not.toBeNull();
  expect(record.received).not.toBeNull();
  return { world, record };
}

describe('a watch completion belongs to an attempted watch', () => {
  it.each(['pending', 'deferred'] as const)('does not count a %s order as performed attention', (state) => {
    const { world, record } = fixture();
    record.execution = { state, changedAt: 0, dueAt: null, waiting: null };
    settleDirectiveApplications(world, 2400, RULES);
    expect(record.execution.workedDays ?? []).toEqual([]);
    expect(world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report')).toEqual([]);
  });

  it('still records an attempted watch when the guard physically occupies the post', () => {
    const { world, record } = fixture();
    record.execution = { state: 'attempted', changedAt: 2385, dueAt: null, waiting: null, workedDays: [] };
    settleDirectiveApplications(world, 2400, RULES);
    expect(record.execution.workedDays).toEqual([1]);
    const reports = world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report');
    expect(reports).toHaveLength(1);
    settleDirectiveApplications(world, 2415, RULES);
    expect(world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report')).toHaveLength(1);
  });

  it('the complete first watch window produces one real work report after execution starts', () => {
    const { world, record } = fixture();
    runUntil(world, 2581, RULES);
    expect(record.execution?.workedDays).toEqual([1]);
    const reports = world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report'
      && row.payload.directiveId === record.id && row.payload.enemyAction?.kind === 'watch-worked');
    expect(reports).toHaveLength(1);
    if (reports[0]!.payload.kind !== 'directive-report') throw new Error('watch fixture');
    expect(reports[0]!.payload.enemyAction!.occurredAt).toBeGreaterThan(record.execution!.changedAt);
  });
});
```

Then apply the one-clause patch; do not overwrite the entire execution module:

```diff
--- a/src/sim/directives/execution.ts
+++ b/src/sim/directives/execution.ts
@@ -859,6 +859,7 @@
         abortRecord(world, record, record.decision, tick, rules, 'rendezvous window missed');
       }
     } else if (application.kind === 'enemy-watch'
+      && record.execution.state === 'attempted'
       && record.execution.changedAt < tick
       && tick % CONVERSATION_BEAT === 0
       && dayOf(tick) >= application.startDay
```

## Acceptance, self-checks and verification

One clause, two files, 2 table cases + 2 standalone cases = 4 added tests. Verify
the insertion anchor occurs exactly once and all actual predecessor changes remain.
Native virtual GREEN is 4/4, with 30 passing cases including execution and enemy-order
suites; both compiler configs and lint pass. Implementation must rerun all six gates,
with +4 tests/+1 file relative to its actual predecessor. Explain any changed complete
soak/MC result; do not pre-claim unchanged metrics or retune expectations blindly.
Retain raw logs, exact commit, count disposition, judgment calls and review verdict.
Commit subject: fix: count watch work only after execution starts

## Author defect reviews and scope

Pass 1 follows receipt→scheduled attempt→physical work: state stays pending until
attemptDirective installs the watch, which uses attempted. Adapted is a generic
mission state, not an enemy-watch application state. Failed/deferred/refused work
must not qualify merely because the actor happened to occupy the room.
Pass 2 reads the completed test backward: report time follows changedAt, repeat
settlement preserves one report, physically present attempted control passes.
The full-loop fixture uses actual authored guidance and outcome report policy;
the common R16 proposal is disclosed, not silently edited into production.
All old position/time guards stay; this does not redesign watch policy or cancellation.
No broad scanner work. Raw outcome history and terminal semantic deduplication remain
Task5A2/5B. Independent review must challenge plan-mandated defects at full severity.
