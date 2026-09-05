# Plan 9 Task5A2 — preserve what the recipient did before the report changes it

**Authored-by:** root Codex GPT-6 · **Date:** 2026-09-05
**Base:** dc114da source, with common virtual R16/R17 corrections for the watch proofs.
**Spec:** docs/design-spec.md debrief/every-operation requirement; HTML R8/R9.
**Constraints:** task-5a2-outcome-history-constraints.md.
**Dependency:** separate review; actual R16/R17 and Task3/4/7A/5A1 predecessor
reconciliation → Task5A2 → full gates and separate code review → Task5B complete folds.
**Gate:** npm test; npm run lint; npm run typecheck; npm run app:build;
npm run soak; npm run mc. Keep each native exit and complete report comparison.
**Status:** complete proposal only; no source implementation or independent verdict.

## Why a second recording unit exists

Task5A1 adds exact artifact-claim and per-hop field-report-root associations. It does
not preserve physical execution outcomes. Terminal execution state loses workedDays
when an order expires; headquarters' actionLedger reflects only returned reports.
A no-report watch therefore needs a private record of the local result. Retain it
on the existing directive record, with its tick and the actual queued report/response
packet id. No global event id, message allocation or extra audible channel is needed.
Null packet id means no response/report was queued; it is not a guessed receipt time.
Legacy absent history is unrecorded, not evidence of no work.

The queue seam covers watch, posting, inquiry, interrogation, courier, observe/tell,
answers, cancellation, expiry and recruitment response call sites. Direct-player
refusal uses a separate immediate response and is recorded there exactly once.
The existing abort helper's no-report branch also retains its local refusal.
Never record a result merely because buildDirectiveReport was called for a projection.

## Task5A2 — exact recording and enforcement changes

**Model:** frontier_implementer for integration across execution/reporting; separate
frontier_reviewer or available top Claude review with the capacity substitution disclosed.
**Files:** src/sim/directives/types.ts, reports.ts, execution.ts;
tests/directives/outcome-history.test.ts (new), tests/directives/view.test.ts (additive).
No compiler/lint config or other suite modification. Root owns Git index and commits.

First add the exact new test file and the additive view-test hunks from the patch.
Run against actual predecessors before the source changes. The measured new-file RED
is 12 assertion failures + 3 controls. Keep actual RED output, never call a loader denial
RED. Then apply only the source hunks. Complete patch (including the two named prongs
and hidden-state twin extension):

```diff
--- a/src/sim/directives/types.ts
+++ b/src/sim/directives/types.ts
@@ -334,6 +334,14 @@
       | 'assignInformant' | 'courier' | 'meet' | 'host' | 'directive';
     tick: Tick;
   } | null;
+}
+
+/** Private execution history, never projected into a received brief or spoken report. */
+export interface DirectiveOutcomeRecord {
+  tick: Tick;
+  result: DirectiveExecutionResult;
+  /** Correlates the actual response/report packet; null when no packet was queued. */
+  reportMessageId: MessageId | null;
 }
 
 export interface DirectiveRecord {
@@ -365,6 +373,8 @@
     workedDays?: number[];
   } | null;
   receivedReports: { receivedAt: Tick; via: EntityId; report: DirectiveReportPayload }[];
+  /** Absent until an execution outcome is observed; legacy absence means unrecorded. */
+  outcomes?: DirectiveOutcomeRecord[];
 }
 
 export type ScrutinyCause =
--- a/src/sim/directives/reports.ts
+++ b/src/sim/directives/reports.ts
@@ -5,7 +5,7 @@
 import type { WorldState } from '../types';
 import { allocateNetworkMessage } from './state';
 import type {
-  DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord,
+  DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveOutcomeRecord, DirectiveRecord,
   DirectiveReportEvidence, DirectiveReportPayload, MessageId, SpokenNetworkPayload,
 } from './types';
 import { correlationOf } from './types';
@@ -67,6 +67,17 @@
   };
 }
 
+/** Save the actual local result before report policy/candor can omit or transform it. */
+export function recordDirectiveOutcome(
+  record: DirectiveRecord, result: DirectiveExecutionResult, tick: Tick,
+): DirectiveOutcomeRecord {
+  const outcome: DirectiveOutcomeRecord = {
+    tick, result: cloneSerializable(result), reportMessageId: null,
+  };
+  (record.outcomes ?? (record.outcomes = [])).push(outcome);
+  return outcome;
+}
+
 /** Queue through only the reply route physically retained in the received version. */
 export function queueDirectiveReport(
   world: WorldState,
@@ -77,24 +88,26 @@
   completedAt: Tick,
 ): MessageId | null {
   const route = record.received?.version.replyRoute ?? null;
-  if (route === null) return null;
   const seen = new Set<string>();
-  for (const id of route) {
+  for (const id of route ?? []) {
     if (id === record.recipient) {
       throw new Error(`directive report '${record.id}': received route contains self-hop '${id}'`);
     }
     if (seen.has(id)) throw new Error(`directive report '${record.id}': duplicate route actor '${id}'`);
     seen.add(id);
   }
+  const outcome = recordDirectiveOutcome(record, result, completedAt);
+  if (route === null) return null;
   const built = buildDirectiveReport(world, record, profile, result, rules);
   if (emptyReport(built.report)) return null;
   const availableAfter = Math.max(completedAt, profile.timing.reportAt ?? completedAt);
-  return allocateNetworkMessage(world, record.principal, record.recipient, [...route], {
+  outcome.reportMessageId = allocateNetworkMessage(world, record.principal, record.recipient, [...route], {
     kind: 'directive-report', directiveId: record.id, report: built.report,
     factRefs: built.factRefs,
     enemyAction: profile.candor === 'ordinary' || profile.candor === 'guarded'
       ? cloneSerializable(result.enemyAction ?? null) : null,
   }, availableAfter, null, null);
+  return outcome.reportMessageId;
 }
 
 /** HQ bookkeeping is driven by correlation, while completion facts come only from heard speech. */
--- a/src/sim/directives/execution.ts
+++ b/src/sim/directives/execution.ts
@@ -12,7 +12,7 @@
 import { trustBetween } from '../world';
 import { evaluateReceivedBrief, type ReceivedBriefInput } from './evaluator';
 import { projectBrief } from './mutation';
-import { queueDirectiveReport, buildDirectiveReport } from './reports';
+import { queueDirectiveReport, buildDirectiveReport, recordDirectiveOutcome } from './reports';
 import { perceivedScrutiny } from './scrutiny';
 import {
   allocateNetworkMessage, allocateProjectedVersionId, strictNextBeat, validateNetworkRoute,
@@ -111,7 +111,9 @@
   queueReport = true,
 ): void {
   record.execution = { state: 'aborted', changedAt: tick, dueAt: null, waiting: null };
-  if (queueReport) queueDirectiveReport(world, record, profile, refusalResult(record, reason), rules, tick);
+  const result = refusalResult(record, reason);
+  if (queueReport) queueDirectiveReport(world, record, profile, result, rules, tick);
+  else recordDirectiveOutcome(record, result, tick);
 }
 
 function scheduleDirectiveDue(world: WorldState, record: DirectiveRecord, due: Tick): void {
@@ -218,15 +220,18 @@
 
   if (directPlayerReceipt) {
     let report = null;
-    if (profile.commitment === 'refuse' && record.received!.version.brief.report !== 'none') {
-      report = buildDirectiveReport(world, record, profile,
-        refusalResult(record, 'the recipient refused the received brief'), rules).report;
+    const result = profile.commitment === 'refuse'
+      ? refusalResult(record, 'the recipient refused the received brief') : null;
+    const outcome = result === null ? null : recordDirectiveOutcome(record, result, tick);
+    if (result !== null && record.received!.version.brief.report !== 'none') {
+      report = buildDirectiveReport(world, record, profile, result, rules).report;
     }
     validateNetworkRoute(world, record.recipient, [record.principalId]);
-    allocateNetworkMessage(world, record.principal, record.recipient, [record.principalId], {
+    const responseId = allocateNetworkMessage(world, record.principal, record.recipient, [record.principalId], {
       kind: 'directive-response', directiveId: record.id,
       response: profile.commitment, report,
     }, tick, null, { kind: 'player-action', action: 'directive', tick });
+    if (outcome !== null) outcome.reportMessageId = responseId;
   } else if (profile.commitment === 'refuse') {
     queueDirectiveReport(world, record, profile,
       refusalResult(record, 'the recipient refused the received brief'), rules, tick);
--- a/tests/directives/view.test.ts
+++ b/tests/directives/view.test.ts
@@ -88,6 +88,10 @@
     };
     record.decision = PROFILE;
     record.execution = { state: 'aborted', changedAt: 45, dueAt: 60, waiting: null };
+    record.outcomes = [{ tick: 45, reportMessageId: null, result: {
+      outcome: 'hidden refusal', reason: 'private reason', evidence: [], source: 'dov',
+      uncertainty: 'high', reportedClaim: null, factRefs: [],
+    } }];
   }
   state.scrutiny.push({ observer: 'ada', principal: 'you', observedAt: 0, cause: 'confrontation' });
   for (const message of state.messages) {
@@ -663,6 +667,7 @@
 
 /** Every hidden name the constraints forbid the DESK SELECTOR from reading. */
 const FORBIDDEN_IN_SELECTOR: Prong[] = [
+  named('private outcome history', 'record', 'outcomes'),
   named('received (the mutated version)', 'record', 'received'),
   named('decision', 'record', 'decision'),
   named('execution', 'record', 'execution'),
@@ -712,6 +717,7 @@
  *  whether the record is reached through the raw world or through an imported helper under an
  *  alias, which is why these are NAME questions and not dotted-path patterns. */
 const FORBIDDEN_IN_APP: Prong[] = [
+  named('private outcome history', 'record', 'outcomes'),
   named('the raw directive substrate', 'world.network', 'directiveState'),
   named('received (the mutated version)', 'record', 'received'),
   named('decision', 'record', 'decision'),
```

Complete new test file:

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { initializeDirectiveReceipt } from '../../src/sim/directives/execution';
import { buildDirectiveReport, queueDirectiveReport } from '../../src/sim/directives/reports';
import { ensureDirectiveState, allocateNetworkMessage } from '../../src/sim/directives/state';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type { DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord } from '../../src/sim/directives/types';
import { hashWorld } from '../../src/sim/hash';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { runUntil } from '../../src/sim/step';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const world = buildWorld(miniTown(), 'outcome-history', RULES);
  enrollPlayer(world, { home: 'square' });
  world.npcs.ada!.traits = ['exaggerator'];
  world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  const record: DirectiveRecord = {
    id: 'd0', principal: 'player', principalId: 'you', recipient: 'ada', issuedAt: 0,
    handoff: { outboundVia: [], reportVia: [] },
    authored: { id: 'v0', parent: null, directiveId: 'd0', brief: {
      mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
      priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: 0, until: 120 }, report: 'full', reportBy: 120, purpose: null,
    }, claimedIssuer: 'you', replyRoute: ['you'], changedBy: null, changes: [] },
    received: null, decision: null, execution: null, receivedReports: [],
  };
  record.received = { tick: 0, version: structuredClone(record.authored), handoffFrom: 'you', messageId: 'm-original' };
  ensureDirectiveState(world).records.push(record);
  const profile: DirectiveDecisionProfile = {
    interpretation: record.authored.brief.mission, commitment: 'attempt', initiative: 'literal',
    risk: 'measured', method: { kind: 'observe', target: { kind: 'person', id: 'bez' } },
    timing: { actAt: 15, reportAt: 30 },
    disclosure: { outcome: true, reason: true, evidence: true, source: true, uncertainty: true },
    candor: 'ordinary',
  };
  const result: DirectiveExecutionResult = {
    outcome: 'answer heard', reason: 'heard the answer in person',
    evidence: [{ kind: 'observation', text: 'presence:bez:square:15' }],
    source: 'ada', uncertainty: 'low',
    reportedClaim: { id: 'c-heard', family: 'f-heard', parent: null, subject: 'bez', predicate: 'stole',
      object: null, count: 2, severity: 3, place: null, attribution: SOMEONE },
    factRefs: [{ asset: 'ada', factIndex: 0 }],
    enemyAction: { kind: 'watch-worked', subject: null, about: null, district: 'd0',
      scheduleStartDay: 0, guard: 'ada', venue: 'square', workedDay: 0, occurredAt: 15 },
  };
  return { world, record, profile, result };
}

describe('private directive outcomes survive the report channel', () => {
  it.each(['ordinary', 'guarded', 'omissive', 'doctored'] as const)(
    'retains the local result before %s candor and reporter traits', (candor) => {
      const { world, record, profile, result } = fixture();
      world.network.assets[0]!.turned = candor === 'doctored';
      profile.candor = candor;
      const expected = structuredClone(result);
      const id = queueDirectiveReport(world, record, profile, result, RULES, 15);
      expect(id).not.toBeNull();
      expect(record.outcomes).toEqual([{ tick: 15, result: expected, reportMessageId: id }]);
      const packet = world.network.directiveState!.messages.find((message) => message.id === id)!;
      expect(packet.payload.kind).toBe('directive-report');
      if (packet.payload.kind !== 'directive-report') throw new Error('report fixture');
      if (candor === 'ordinary') expect(packet.payload.report.evidence).toContainEqual({
        kind: 'claim', claimId: 'c-heard', reported: expect.objectContaining({ count: 4, severity: 4 }),
      });
      if (candor === 'guarded') expect(packet.payload.report.source).toBeNull();
      if (candor === 'omissive' || candor === 'doctored') {
        expect(packet.payload.report.reason).toBeNull();
        expect(packet.payload.enemyAction).toBeNull();
      }
    });

  it('retains a no-route outcome without allocating a report or message id', () => {
    const { world, record, profile, result } = fixture();
    record.received!.version.replyRoute = null;
    const before = world.network.directiveState!.nextMessage;
    expect(queueDirectiveReport(world, record, profile, result, RULES, 15)).toBeNull();
    expect(record.outcomes).toEqual([{ tick: 15, result, reportMessageId: null }]);
    expect(world.network.directiveState!.messages).toEqual([]);
    expect(world.network.directiveState!.nextMessage).toBe(before);
  });

  it('retains all-omitted outcomes without changing the omission policy', () => {
    const { world, record, profile, result } = fixture();
    profile.disclosure = { outcome: false, reason: false, evidence: false, source: false, uncertainty: false };
    expect(queueDirectiveReport(world, record, profile, result, RULES, 15)).toBeNull();
    expect(record.outcomes).toEqual([{ tick: 15, result, reportMessageId: null }]);
    expect(world.network.directiveState!.messages).toEqual([]);
  });

  it('building a spoken projection alone remains pure and creates no history', () => {
    const { world, record, profile, result } = fixture();
    const before = hashWorld(world);
    buildDirectiveReport(world, record, profile, result, RULES);
    expect(hashWorld(world)).toBe(before);
    expect(Object.hasOwn(record, 'outcomes')).toBe(false);
  });

  it('keeps a deep snapshot, including claim, physical action, evidence and fact references', () => {
    const { world, record, profile, result } = fixture();
    const expected = structuredClone(result);
    queueDirectiveReport(world, record, profile, result, RULES, 15);
    Object.assign(result.reportedClaim!, { count: 99 }); // exercise a runtime alias despite readonly types
    result.evidence[0]!.text = 'changed';
    result.factRefs[0]!.factIndex = 99;
    result.enemyAction!.venue = 'backroom';
    expect(record.outcomes?.[0]?.result).toEqual(expected);
    Object.assign(record.outcomes![0]!.result.reportedClaim!, { count: 7 });
    const packet = world.network.directiveState!.messages[0]!;
    expect(JSON.stringify(packet.payload)).not.toContain('"count":7');
  });

  it('links each repeated result occurrence to its own actual report packet', () => {
    const { world, record, profile, result } = fixture();
    const first = queueDirectiveReport(world, record, profile, result, RULES, 15);
    const second = queueDirectiveReport(world, record, profile, result, RULES, 30);
    expect(first).not.toBe(second);
    expect(record.outcomes).toEqual([
      { tick: 15, result, reportMessageId: first }, { tick: 30, result, reportMessageId: second },
    ]);
  });

  it('leaves rejected route validation atomic', () => {
    const { world, record, profile, result } = fixture();
    record.received!.version.replyRoute = ['ada'];
    const before = hashWorld(world);
    expect(() => queueDirectiveReport(world, record, profile, result, RULES, 15)).toThrow('self-hop');
    expect(hashWorld(world)).toBe(before);
  });

  it('does not add the private history to audible speech or destination receipt data', () => {
    const { world, record, profile, result } = fixture();
    const id = queueDirectiveReport(world, record, profile, result, RULES, 15)!;
    const speech = realizeNetworkForward(world, id,
      { venue: 'square', members: ['ada', 'you'] }, 30, RULES)!;
    expect(speech).not.toBeNull();
    expect(JSON.stringify(speech.spoken)).not.toContain('reportMessageId');
    expect(JSON.stringify(speech.spoken)).not.toContain('outcomes');
    expect(record.receivedReports).toHaveLength(1);
    expect(Object.keys(record.receivedReports[0]!).sort()).toEqual(['receivedAt', 'report', 'via']);
    expect(record.outcomes?.[0]?.reportMessageId).toBe(id);
  });

  it.each(['none', 'full'] as const)('records direct-player refusal even with report:%s', (policy) => {
    const { world, record, profile } = fixture();
    record.received!.version.brief.report = policy;
    profile.commitment = 'refuse';
    profile.timing.actAt = null;
    const original = allocateNetworkMessage(world, 'player', 'you', ['ada'],
      { kind: 'directive', version: record.received!.version }, 0, 120,
      { kind: 'player-action', action: 'directive', tick: 0 });
    const message = world.network.directiveState!.messages.find((row) => row.id === original)!;
    initializeDirectiveReceipt(world, record, profile, message, 0, RULES);
    const response = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive-response')!;
    expect(record.outcomes ?? []).toHaveLength(1);
    expect(record.outcomes?.[0]).toMatchObject({ tick: 0, reportMessageId: response.id,
      result: { outcome: 'refused', reason: 'the recipient refused the received brief' } });
    expect(response.payload).toMatchObject({ kind: 'directive-response', response: 'refuse',
      report: policy === 'none' ? null : expect.objectContaining({ outcome: 'refused' }) });
    expect(record.execution?.state).toBe('aborted');
  });

  it('records no false execution result for a direct acceptance response', () => {
    const { world, record, profile } = fixture();
    const original = allocateNetworkMessage(world, 'player', 'you', ['ada'],
      { kind: 'directive', version: record.received!.version }, 0, 120,
      { kind: 'player-action', action: 'directive', tick: 0 });
    const message = world.network.directiveState!.messages.find((row) => row.id === original)!;
    initializeDirectiveReceipt(world, record, profile, message, 0, RULES);
    expect(Object.hasOwn(record, 'outcomes')).toBe(false);
    expect(record.execution?.state).toBe('pending');
  });

  it('retains every real worked night after expiry even when the authored watch requests no reports', () => {
    const town = miniTown();
    town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
    for (const npc of town.npcs) {
      npc.traits = ['literalist'];
      npc.edges = npc.edges.filter((edge) => ['ada', 'bez'].includes(edge.to));
    }
    const world = buildWorld(town, 'unreported-watch-history', RULES);
    world.network.spymaster = 'ada';
    world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
    applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [],
      watches: [{ district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 }] });
    const record = world.network.directiveState!.records[0]!;
    const message = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
    if (message.payload.kind !== 'directive') throw new Error('watch fixture');
    // A lawful staged report policy; keep the planner's actual self-presence guidance.
    record.authored.brief.report = 'none';
    message.payload.version.brief.report = 'none';
    expect(record.authored.brief.guidance.some((row) => row.kind === 'expected-presence')).toBe(true);
    const replay = structuredClone(world);
    runUntil(world, 1, RULES);
    expect(record.received).not.toBeNull();
    runUntil(world, 1440 + 1141, RULES);
    expect(record.execution?.workedDays).toContain(1);
    const first = structuredClone(record.outcomes);
    runUntil(world, record.received!.version.brief.active.until + 1, RULES);
    expect(record.execution?.state).toBe('aborted');
    expect(Object.hasOwn(record.execution!, 'workedDays')).toBe(false);
    const work = record.outcomes?.filter((row) => row.result.enemyAction?.kind === 'watch-worked') ?? [];
    expect(work.length).toBeGreaterThan(0);
    expect(new Set(work.map((row) => row.result.enemyAction!.workedDay)).size).toBe(work.length);
    expect(record.outcomes?.slice(0, first?.length)).toEqual(first);
    expect(record.outcomes?.at(-1)?.result.outcome).toBe('refused');
    expect(record.outcomes?.every((row) => row.reportMessageId === null)).toBe(true);
    expect(world.network.directiveState!.messages.filter((row) => row.payload.kind === 'directive-report')).toEqual([]);
    expect(world.enemy.actionLedger ?? []).toEqual([]);
    runUntil(replay, world.tick, RULES);
    expect(hashWorld(replay)).toBe(hashWorld(world));
  });
});
```

## Acceptance and execution checklist

Self-checks: exactly 3 production files, 1 new test file, 1 additive existing test file;
15 new-file cases + 4 generated existing-prong cases = 19 new tests, no retirements.
The existing view suite rises 147→151 with both forbidden-name checks and both actual
seven-form firing proofs. Its hidden-state twin now flips the new private history.
Current virtual affected regression is 239/7. Both compiler configurations and virtual
lint pass. Preserve the actual future suite baseline; do not use today's 1780/114 as a
substitute for checking all later magic/prose additions.

Twelve paired full-world runs (three seeds × inert/none/outcome/full report policies)
have 81 new result rows, and every pre-existing field is identical after removing only
DirectiveRecord.outcomes. The R16/R17 proposals are identical on both sides. Evidence
hash and native logs are in the author report. At implementation re-run the paired
proof on actual predecessors as well as all six full gates. Messages, RNG, receipt
views, decisions, schedules and ordinary report content must not change from metadata.

Raw results are inputs before reporter transformation, including uncertain or false
answers. They are not omniscient truth about a claim. Keep that distinction in Task5B.
Repeated outcome occurrences retain separate packet associations; watch semantic
summaries deduplicate by actual action identity. Never erase raw occurrences by content.
Receipt time comes from physical speech, never report creation or scheduled delivery.

Expected commit subject: feat: preserve private directive outcome history
Report exact scope/count deltas, native output, source/report snapshot isolation,
invalid-route atomicity, silent reporting controls, complete simulation comparison and
all judgment calls. Separate code review must run its own native checks. No push.

## Author defect review and disclosed corrections

Pass 1 follows every reporting call: the queue captures before no-route/all-null exits;
direct refusal has one separately associated acknowledgement; direct acceptance has
no false work outcome. The pure builder stays pure. Data cloning is bounded per local
result, not a per-tick full-world clone. No new counter or random draw.
Pass 2 follows information outward: outcome history never enters payload projection,
receivedReports or the live desk. Both existing selector/app prong tables now prohibit
its name and carry their own firing tests; the twin includes a concrete hidden result.
Private history is read only by later terminal models, which must preserve the live
panel/import boundary without weakening the shipped scanner.

The first isolated watch test found 9 work results across 8 days: pending work at 2400,
attempt at 2415 reset the latch, and another work record at 2430. R17 is a separate
behavioral correction, not a recording-task workaround. On common R16/R17, each actual
worked night is retained through expiry with no report and no headquarters entry.
Two initial test-only TypeScript errors attempted direct writes to a readonly Claim;
the alias-isolation test now uses Object.assign to deliberately exercise runtime alias
mutation. No source contract was loosened. An initially guessed recruitment suite path
did not exist; final regression uses the actual recruitment-lifecycle suite.

## Deferred scope

Task5B complete operation models/timeline/semantic overlay and Task6 UI remain separate.
R16/R17 need their own reviews/gates. No actual magic/prose predecessor is claimed here.
Task5A1's association proposal is preserved unchanged. The generic history metadata
does not authorize new gameplay decisions, live hidden data access or broad scanner work.
