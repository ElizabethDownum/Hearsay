# Plan 9 Task 5A — exact causal associations for the debrief

**Authored-by:** root Codex (GPT-6) · **Date:** 2026-09-05
**Spec:** docs/design-spec.md, “The debrief — the intuition engine”
**Authoring base:** 6b651154c8c3f3263c22181d36f66b5379d8434d;
game/test source dc114da3006a75115784e4e894e880dd113226f5.
**Constraints:** task-5a-constraints.md (same directory).
**Dependency order:** Task 3 → 4 → 7A → 5A → 5B → 6/7B → 8.
**Status:** COMPLETE AUTHOR PROPOSAL; independent plan review and actual predecessor
reconciliation pending. No production implementation or full-task completion claimed.

This is the narrow first part of the audited Task 5. Its original “no new recording”
assumption is contradicted by the source and the spec's requirement to retain every
mutation. HTML R8 records the bounded amendment. Typed operation folds and semantic
calendar/overlay matching remain Task 5B; this proposal does not claim to supply them.

## Verified premises and the two missing associations

1. deliverDocument mints a fresh root family for every NPC viewing; four callers
   record artifact acts afterward without that claim ID. Two identical pages shown
   to one mind in one tick defeat a unique content-based join.
2. Final chronicle network speech already records the receipt tick and reported copy.
   No extra receipt timestamp is required. Intermediate field-report projection keeps
   each root only in the mutable payload; later omission changes positions and drops
   roots, while the earlier recorded spoken copy lacks their identities.
3. projectPayload and replaceCarriedContent validate the current field-report item
   count/order before attemptHop constructs NetworkSpeech. Snapshot roots there;
   phase recording must clone that array, not read the packet again later.
4. observationsFor constructs its network Observation explicitly from spoken fields.
   Root metadata is therefore excluded by structure. Native twin tests additionally
   perturb roots while holding speech fixed and compare actor feeds/intel/evidence.
5. Adding optional claimId makes the old generic `'claimId' in e` narrowing unsound.
   Preserve threadOf's existing injection/telling result type with explicit kinds.
   explainBelief uses the new exact link while retaining the old legacy fallback.
6. Proposed code was exercised against current source in memory: 16 authored cases;
   99 cases including the four affected existing suites; both compiler configs;
   virtual lint. Nine full-world pairs equal after removing only the new chronicle
   fields. This is proposal validation, not implemented gameplay or independent review.

## Task 5A1 — record the actual minted claim and each spoken item root

**Model:** frontier_implementer or the highest available Claude implementation seat,
resolved by the controller before dispatch; independent review at least the same tier.
**Files (six production, two tests):**
- src/sim/types.ts
- src/sim/artifacts.ts
- src/sim/directives/types.ts
- src/sim/directives/transport.ts
- src/sim/phases.ts
- src/sim/chronicle.ts
- tests/sim/artifacts.test.ts (two exact expected-record additions only)
- tests/sim/debrief-recording.test.ts (new, 16 cases)

**Goal:** preserve causal identity without changing what is acted, spoken or learned.
One bounded implementation chunk. Proposed scoped subject:
`feat: record exact document and report associations for the debrief`
The original Task 5 final subject remains reserved for completed Task 5B models.

**Before implementation:** independently reconcile the actual Task 4/7A predecessor.
Task 3/4 add chronicle variants, magic evidence and phase behavior. Preserve every
one of those changes. The six current full-file virtual snapshots are probe inputs,
never overwrite instructions for future files. Apply the additive hunks below after
checking each actual seam; stop and report a conflict that changes semantics.

**Tests first:** introduce the 16 exact new cases and the two exact schema expectation
updates. Run the new file against unchanged production: current measured result is
12 native assertion failures (missing claim/root associations) and four controls
passing. A config-loader failure is not RED. New future-base failures must be examined
on their own merits. Do not edit the production rules to fit a staged route.

**Implementation:** the following exact patch supplies all code and test bodies.
The schema expectation changes preserve toEqual and existing keys. No test is removed.

```diff
--- a/src/sim/types.ts
+++ b/src/sim/types.ts
@@ -127,6 +127,8 @@
   addressedTo: EntityId;
   messageId: string;
   spoken: NetworkSpeech['spoken'];
+  /** Private causal associations in spoken item order; never audible content. */
+  reportRoots?: string[];
   cause: NetworkSpeech['cause'];
   heardBy: { id: EntityId; addressed: boolean }[];
 }
@@ -149,6 +151,8 @@
   artifact: string;
   by: EntityId;
   to: EntityId | VenueId | null;
+  /** Exact claim minted by this NPC viewing; absent when no claim is minted. */
+  claimId?: ClaimId;
 }
 export type ChronicleEntry = TellingRecord | InjectRecord | AskingRecord | InstitutionRecord
   | VignetteRecord | NetworkSpeechRecord | ArtifactRecord;
--- a/src/sim/artifacts.ts
+++ b/src/sim/artifacts.ts
@@ -148,11 +148,12 @@
  */
 function deliverDocument(
   world: WorldState, artifact: Artifact, shower: EntityId, viewer: EntityId, tick: Tick,
-): void {
+): string {
   const family = `f${world.claimCounter}`;
   const claim = mintClaim(world, { ...artifact.spec, family, parent: null });
   world.claims[claim.id] = claim;
   ingestEvidence(world, viewer, { tick, speaker: shower, claim }, ARTIFACT_CREDENCE);
+  return claim.id;
 }
 
 /** The shared preconditions of both paper-in-hand verbs: a real, dry document the avatar holds. */
@@ -205,9 +206,9 @@
 
   // --- Effects (all validation passed) — the paper stays in the shower's hand. ---
   const shower = world.playerId!;
-  deliverDocument(world, artifact, shower, to, tick);
+  const claimId = deliverDocument(world, artifact, shower, to, tick);
   world.chronicle.push({
-    kind: 'artifact', tick, act: 'show', artifact: artifact.id, by: shower, to,
+    kind: 'artifact', tick, act: 'show', artifact: artifact.id, by: shower, to, claimId,
   });
 }
 
@@ -242,9 +243,9 @@
     // --- Effects (all validation passed) — the paper changes hands AND is read. ---
     artifact.heldBy = to;
     artifact.plantedAt = null;
-    deliverDocument(world, artifact, playerId, to, tick);
+    const claimId = deliverDocument(world, artifact, playerId, to, tick);
     world.chronicle.push({
-      kind: 'artifact', tick, act: 'plant', artifact: artifact.id, by: playerId, to,
+      kind: 'artifact', tick, act: 'plant', artifact: artifact.id, by: playerId, to, claimId,
     });
     return;
   }
@@ -443,9 +444,9 @@
     artifact.heldBy = finder;
     artifact.plantedAt = null;
     // The finder is their own source: nobody handed it over, and nobody is their own corroborator.
-    deliverDocument(world, artifact, finder, finder, tick);
+    const claimId = deliverDocument(world, artifact, finder, finder, tick);
     world.chronicle.push({
-      kind: 'artifact', tick, act: 'pickup', artifact: artifact.id, by: finder, to: null,
+      kind: 'artifact', tick, act: 'pickup', artifact: artifact.id, by: finder, to: null, claimId,
     });
   }
 
@@ -464,10 +465,12 @@
     if (hasReshown(world, id, holder)) continue;
 
     // The edge is the edge either way; only the substrate the viewing lands in differs.
+    let claimId: string | null = null;
     if (audience === world.playerId) showToAvatar(world, artifact, holder, circle.venue, tick);
-    else deliverDocument(world, artifact, holder, audience, tick);
+    else claimId = deliverDocument(world, artifact, holder, audience, tick);
     world.chronicle.push({
       kind: 'artifact', tick, act: 'reshow', artifact: id, by: holder, to: audience,
+      ...(claimId === null ? {} : { claimId }),
     });
   }
 }
--- a/src/sim/directives/types.ts
+++ b/src/sim/directives/types.ts
@@ -328,6 +328,8 @@
   addressedTo: EntityId;
   messageId: MessageId;
   spoken: SpokenNetworkPayload;
+  /** Private per-item roots captured at this hop, excluded from SpokenNetworkPayload. */
+  reportRoots?: string[];
   cause: {
     kind: 'player-action';
     action: 'tell' | 'ask' | 'sell' | 'recruit' | 'debrief'
--- a/src/sim/directives/transport.ts
+++ b/src/sim/directives/transport.ts
@@ -625,6 +625,11 @@
     addressedTo,
     messageId: message.id,
     spoken,
+    // projectPayload/replaceCarriedContent already validated this exact item order.
+    // Snapshot now: a later relay may omit or mutate the carried copy.
+    ...(message.payload.kind === 'field-report' ? {
+      reportRoots: message.payload.renderedItems!.map((item) => item.rootFingerprint),
+    } : {}),
     cause: cloneSerializable(message.cause),
   };
   if (final) receiveFinal(world, message, spoken, t, circle, rules);
--- a/src/sim/phases.ts
+++ b/src/sim/phases.ts
@@ -512,6 +512,7 @@
       kind: 'network-speech', tick: speech.tick, venue: speech.venue,
       speaker: speech.speaker, addressedTo: speech.addressedTo,
       messageId: speech.messageId, spoken: cloneSerializable(speech.spoken),
+      ...(speech.reportRoots === undefined ? {} : { reportRoots: [...speech.reportRoots] }),
       cause: cloneSerializable(speech.cause),
       heardBy: speech.circleMembers.filter((member) => member !== speech.speaker)
         .sort().map((id) => ({ id, addressed: id === speech.addressedTo })),
--- a/src/sim/chronicle.ts
+++ b/src/sim/chronicle.ts
@@ -2,15 +2,14 @@
 import type { Belief, ChronicleEntry, WorldState } from './types';
 
 /**
- * Every recorded event belonging to one story family, in recorded (tick) order. Only
- * claimId-bearing records (tellings, injects) belong to a single family — endings carry a
- * `claimIds` list spanning families, so the `'claimId' in e` guard rightly excludes them and
- * the narrowed return type keeps callers from reaching for fields an InstitutionRecord lacks.
+ * Injections and tellings belonging to one story family, in recorded (tick) order.
+ * Endings carry a `claimIds` list spanning families. Explicit kind checks keep this speech-lineage
+ * helper distinct from debrief operation threads and their optional artifact claim links.
  */
 export function threadOf(world: WorldState, family: RumorId): Extract<ChronicleEntry, { claimId: string }>[] {
   return world.chronicle.filter(
     (e): e is Extract<ChronicleEntry, { claimId: string }> =>
-      'claimId' in e && world.claims[e.claimId]?.family === family,
+      (e.kind === 'inject' || e.kind === 'telling') && world.claims[e.claimId]?.family === family,
   );
 }
 
@@ -34,28 +33,17 @@
   );
   if (telling) return telling;
   /**
-   * Plan 9: the fair-cop law reaches EVIDENCE too. A belief a document anchored was delivered by an
-   * artifact act, which is not a telling — showing paper is not speech, so `ArtifactRecord` carries
-   * neither a claim id nor a `heardBy` list. It is matched on what it does carry: the tick the page
-   * was put in front of this mind (`firstHeardAt`, which artifact ingestion sets to the act's tick),
-   * the viewer — named as `to` for a show/hand-over/re-show, and as `by` for a pickup, where the finder
-   * is their own source — AND the page itself.
-   *
-   * The page is the third term because the first two are not enough (review finding I-4): a beat can
-   * deliver TWO documents to one mind — a pickup and another holder's re-show resolve in the same
-   * beat-tail pass — and both beliefs then carry the same `firstHeardAt`. Matching on tick and viewer
-   * alone handed both of them the first record, so one belief was explained by a page it never read.
-   * The record's artifact must say what the belief says, field for field.
-   *
-   * Residual, lawful and deliberate: two documents with IDENTICAL text delivered to one viewer in one
-   * beat are indistinguishable BY CONTENT, so which of the two explanations each belief gets is
-   * arbitrary. Both answers are true statements about a page that really did put those words in that
-   * mind at that tick. Distinct pages, or distinct beats, resolve exactly.
+   * New document viewings carry the exact minted claim identity. Legacy records lack
+   * that association and retain the older tick/viewer/page-content fallback. Never use
+   * content to override an explicit different claim id: identical pages can be viewed
+   * by the same person in one beat and still mint distinct roots. This is explanation
+   * only; paper remains private and does not become an overheard utterance.
    */
   return world.chronicle.find(
     (e) => e.kind === 'artifact' && e.tick === belief.firstHeardAt
       && (e.to === npcId || (e.act === 'pickup' && e.by === npcId))
-      && pageSays(world, e.artifact, belief),
+      && (e.claimId === undefined ? pageSays(world, e.artifact, belief)
+        : e.claimId === belief.claim.id),
   ) ?? null;
 }
 
--- a/tests/sim/artifacts.test.ts
+++ b/tests/sim/artifacts.test.ts
@@ -252,6 +252,7 @@
     expect(artifactById(world, 'a0')).toMatchObject({ heldBy: 'you', plantedAt: null });
     expect(world.chronicle.filter((entry) => entry.kind === 'artifact').at(-1)).toEqual({
       kind: 'artifact', tick: DAY1, act: 'show', artifact: 'a0', by: 'you', to: 'ada',
+      claimId: soleBelief(world, 'ada').claim.id,
     });
   });
 
@@ -311,6 +312,7 @@
     expect(soleBelief(world, 'ada').credence).toBe(ARTIFACT_CREDENCE);
     expect(world.chronicle.filter((entry) => entry.kind === 'artifact').at(-1)).toEqual({
       kind: 'artifact', tick: DAY1, act: 'plant', artifact: 'a0', by: 'you', to: 'ada',
+      claimId: soleBelief(world, 'ada').claim.id,
     });
   });
 
--- /dev/null
+++ b/tests/sim/debrief-recording.test.ts
@@ -0,0 +1,304 @@
+import { describe, expect, it } from 'vitest';
+import { at } from '../../src/core/time';
+import { STANDARD_RULES as RULES } from '../../src/content/rules';
+import { applyForge, applyPlant, applyShow, resolveArtifacts } from '../../src/sim/artifacts';
+import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
+import { explainBelief, threadOf } from '../../src/sim/chronicle';
+import { captureEvidence } from '../../src/sim/counterintel';
+import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
+import { queueNetworkMessage, realizeNetworkForward } from '../../src/sim/directives/transport';
+import type { NetworkSpeech, ReportedFieldObservation } from '../../src/sim/directives/types';
+import { captureIntel } from '../../src/sim/fieldwork';
+import { cloneSerializable, hashWorld } from '../../src/sim/hash';
+import { observationsFor, type TickEvents } from '../../src/sim/perception';
+import { finishTick, prepareTick } from '../../src/sim/phases';
+import { runUntil, step } from '../../src/sim/step';
+import type { ArtifactRecord, NetworkSpeechRecord } from '../../src/sim/types';
+import { buildWorld, enrollPlayer } from '../../src/sim/world';
+import { miniTown } from './helpers/minitown';
+
+const SPEC = { subject: 'bez', predicate: 'stole', object: null, count: 0,
+  severity: 4 as const, place: 'square', attribution: 'someone' };
+const CIRCLE = { venue: 'square', members: ['ada', 'bez', 'you'] };
+
+function world() {
+  const fixture = miniTown();
+  fixture.npcs = fixture.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
+  for (const npc of fixture.npcs) { npc.traits = []; npc.edges = []; }
+  const value = buildWorld(fixture, 'debrief-recording', RULES);
+  enrollPlayer(value, { home: 'square' });
+  value.enemy.observers = [];
+  return value;
+}
+
+function paperWorld() {
+  const value = world();
+  applyForge(value, SPEC, 0, RULES);
+  value.tick = at(1, 8);
+  return value;
+}
+
+function artifactRows(value: ReturnType<typeof world>): ArtifactRecord[] {
+  return value.chronicle.filter((row): row is ArtifactRecord => row.kind === 'artifact');
+}
+
+function linkedClaim(value: ReturnType<typeof world>, row: ArtifactRecord, viewer: string) {
+  expect(row.claimId).toBeTypeOf('string');
+  const claim = value.claims[row.claimId!];
+  expect(claim).toMatchObject({ ...SPEC, parent: null });
+  expect(value.beliefs[viewer]![claim!.family]!.claim.id).toBe(row.claimId);
+  return claim!;
+}
+
+describe('artifact viewing records identify exactly the claim they minted', () => {
+  it('identical pages shown in one tick retain different exact claim links', () => {
+    const value = paperWorld();
+    applyForge(value, SPEC, 0, RULES);
+    applyShow(value, 'a0', 'ada', value.tick, [CIRCLE]);
+    applyShow(value, 'a1', 'ada', value.tick, [CIRCLE]);
+    const rows = artifactRows(value).filter((row) => row.act === 'show');
+    expect(rows).toHaveLength(2);
+    const claims = rows.map((row) => linkedClaim(value, row, 'ada'));
+    claims.forEach((claim, index) => {
+      expect(explainBelief(value, 'ada', claim.family)).toBe(rows[index]);
+      expect(threadOf(value, claim.family)).toEqual([]); // existing helper remains speech-only
+    });
+    expect(new Set(claims.map((claim) => claim.id)).size).toBe(2);
+    expect(rows.map((row) => row.artifact)).toEqual(['a0', 'a1']);
+    expect(value.artifacts!.map((artifact) => artifact.heldBy)).toEqual(['you', 'you']);
+  });
+
+  it('hand-over links the recipient copy without adding an overhearing record', () => {
+    const value = paperWorld();
+    applyPlant(value, 'a0', null, 'ada', value.tick, [CIRCLE]);
+    const row = artifactRows(value).at(-1)!;
+    expect(row).toMatchObject({ act: 'plant', by: 'you', to: 'ada' });
+    linkedClaim(value, row, 'ada');
+    expect(value.artifacts![0]!.heldBy).toBe('ada');
+    expect(value.chronicle.filter((entry) => entry.kind === 'telling')).toEqual([]);
+    expect(value.enemy.evidence).toEqual([]);
+  });
+
+  it('forge and venue plant omit the key, then the later pickup links its new claim', () => {
+    const value = paperWorld();
+    applyPlant(value, 'a0', 'square', null, value.tick, [CIRCLE]);
+    expect(artifactRows(value).every((row) => !Object.hasOwn(row, 'claimId'))).toBe(true);
+    resolveArtifacts(value, value.tick + 15, [CIRCLE]);
+    const row = artifactRows(value).at(-1)!;
+    expect(row).toMatchObject({ act: 'pickup', by: 'ada', to: null });
+    linkedClaim(value, row, 'ada');
+  });
+
+  it('a holder re-show links the new family, separate from the first viewing', () => {
+    const value = paperWorld();
+    value.npcs['ada']!.edges = [{ to: 'bez', kind: 'friend', trust: 0.8 }];
+    applyPlant(value, 'a0', null, 'ada', value.tick, [CIRCLE]);
+    const first = artifactRows(value).at(-1)!;
+    resolveArtifacts(value, value.tick + 15, [CIRCLE]);
+    const next = artifactRows(value).at(-1)!;
+    expect(next).toMatchObject({ act: 'reshow', by: 'ada', to: 'bez' });
+    expect(linkedClaim(value, next, 'bez').family)
+      .not.toBe(linkedClaim(value, first, 'ada').family);
+  });
+
+  it('a page returned to the avatar records a real viewing without inventing a claim', () => {
+    const value = paperWorld();
+    value.npcs['ada']!.edges = [{ to: 'you', kind: 'friend', trust: 0.8 }];
+    // Venue pickup is anonymous and does not count as a prior avatar viewing.
+    applyPlant(value, 'a0', 'square', null, value.tick, [CIRCLE]);
+    resolveArtifacts(value, value.tick + 15, [CIRCLE]);
+    const before = value.claimCounter;
+    resolveArtifacts(value, value.tick + 30, [CIRCLE]);
+    const row = artifactRows(value).at(-1)!;
+    expect(row).toMatchObject({ act: 'reshow', by: 'ada', to: 'you' });
+    expect(Object.hasOwn(row, 'claimId')).toBe(false);
+    expect(value.claimCounter).toBe(before);
+    expect(value.intel.log).toMatchObject([{ kind: 'hint', speaker: 'ada', reported: SPEC }]);
+  });
+
+  it('a refused viewing leaves no record, claim, or other state', () => {
+    const value = paperWorld();
+    const before = hashWorld(value);
+    expect(() => applyShow(value, 'a0', 'ada', value.tick, [])).toThrow();
+    expect(hashWorld(value)).toBe(before);
+  });
+
+  it('legacy viewing records keep their fallback, but an explicit mismatched link is never guessed away', () => {
+    const value = paperWorld();
+    applyShow(value, 'a0', 'ada', value.tick, [CIRCLE]);
+    const row = artifactRows(value).at(-1)!;
+    const claim = linkedClaim(value, row, 'ada');
+    delete row.claimId;
+    expect(explainBelief(value, 'ada', claim.family)).toBe(row);
+    row.claimId = 'a-different-claim';
+    expect(explainBelief(value, 'ada', claim.family)).toBeNull();
+  });
+
+  it('live forging and viewing records replay with the same explicit claim identities', () => {
+    const initial = world();
+    const live = cloneSerializable(initial);
+    const actions: Action[] = [{ tick: 0, kind: 'forge', spec: SPEC },
+      { tick: at(1, 8), kind: 'show', artifact: 'a0', to: 'ada' }];
+    const recorded: Action[] = [];
+    while (live.tick <= at(1, 8)) {
+      const frame = prepareTick(live, RULES);
+      finishTick(live, RULES, frame, () => {
+        for (const action of actions.filter((row) => row.tick === live.tick)) {
+          applyAction(live, action, RULES, frame);
+          recorded.push(cloneSerializable(action));
+        }
+      });
+    }
+    const shown = artifactRows(live).find((row) => row.act === 'show')!;
+    linkedClaim(live, shown, 'ada');
+    expect(recorded).toEqual(actions);
+    expect(hashWorld(runLogOn(cloneSerializable(initial), RULES, recorded, live.tick)))
+      .toBe(hashWorld(live));
+  });
+});
+
+const ASK: ReportedFieldObservation = { kind: 'asking', observedAt: 0, venue: 'square',
+  speaker: 'bez', addressedTo: 'ada', about: { subject: 'ada' },
+  overheard: false, authority: false };
+
+function reportWorld(items: { root: string; observation: ReportedFieldObservation }[], relay = true) {
+  const value = world();
+  for (const item of items) holdFieldObservation(value, 'player', 'ada',
+    { kind: 'reported', observation: item.observation }, item.root,
+    relay ? ['bez', 'you'] : ['you'], null, []);
+  queueUnqueuedFieldReports(value);
+  const message = value.network.directiveState!.messages[0]!;
+  return { value, message };
+}
+
+function speechEvents(speech: NetworkSpeech): TickEvents {
+  return { tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech] };
+}
+
+function reportRows(value: ReturnType<typeof world>): NetworkSpeechRecord[] {
+  return value.chronicle.filter((row): row is NetworkSpeechRecord => row.kind === 'network-speech');
+}
+
+describe('each spoken report carries private, per-item causal associations', () => {
+  it('two roots with identical received content stay distinct across two actual hops', () => {
+    const { value, message } = reportWorld([{ root: 'source-a', observation: ASK },
+      { root: 'source-b', observation: ASK }]);
+    const first = realizeNetworkForward(value, message.id,
+      { venue: 'square', members: ['ada', 'bez'] }, 15, RULES)!;
+    const second = realizeNetworkForward(value, message.id,
+      { venue: 'square', members: ['bez', 'you'] }, 30, RULES)!;
+    expect(first.reportRoots).toEqual(['source-a', 'source-b']);
+    expect(second.reportRoots).toEqual(first.reportRoots);
+    if (first.spoken.kind !== 'field-report') throw new Error('missing report');
+    expect(first.spoken.items[0]).toEqual(first.spoken.items[1]);
+    second.reportRoots![0] = 'mutated-after-speech';
+    expect(first.reportRoots).toEqual(['source-a', 'source-b']);
+    expect(message.payload.kind === 'field-report' && message.payload.renderedItems![0]!.rootFingerprint)
+      .toBe('source-a');
+  });
+
+  it('relay omission retains the remaining root at its new item index', () => {
+    const { value, message } = reportWorld([
+      { root: 'a-presence', observation: { kind: 'presence', observedAt: 0, venue: 'square', actor: 'bez' } },
+      { root: 'b-asking', observation: ASK },
+    ]);
+    value.npcs['bez']!.traits = ['vaguener'];
+    const first = realizeNetworkForward(value, message.id,
+      { venue: 'square', members: ['ada', 'bez'] }, 15, RULES)!;
+    const second = realizeNetworkForward(value, message.id,
+      { venue: 'square', members: ['bez', 'you'] }, 30, RULES)!;
+    expect(first.reportRoots).toEqual(['a-presence', 'b-asking']);
+    expect(second.reportRoots).toEqual(['b-asking']);
+    expect(second.spoken).toMatchObject({ kind: 'field-report', items: [{ observation: ASK }] });
+    expect(first.spoken.kind === 'field-report' && first.spoken.items.length).toBe(2);
+  });
+
+  it('an entirely omitted report records an empty association list and closes its sources', () => {
+    const { value, message } = reportWorld([{ root: 'presence-root',
+      observation: { kind: 'presence', observedAt: 0, venue: 'square', actor: 'bez' } }], false);
+    value.npcs['ada']!.traits = ['vaguener'];
+    const speech = realizeNetworkForward(value, message.id,
+      { venue: 'square', members: ['ada', 'you'] }, 15, RULES)!;
+    expect(speech.reportRoots).toEqual([]);
+    expect(speech.spoken).toMatchObject({ kind: 'field-report', items: [] });
+    expect(value.network.directiveState!.heldObservations[0]!.deliveredAt).toBe(15);
+  });
+
+  it('an unsent packet exposes no association event and leaves the chronicle untouched', () => {
+    const { value, message } = reportWorld([{ root: 'private-root', observation: ASK }]);
+    const before = cloneSerializable(value.chronicle);
+    expect(realizeNetworkForward(value, message.id,
+      { venue: 'square', members: ['ada', 'you'] }, 15, RULES)).toBeNull();
+    expect(value.chronicle).toEqual(before);
+    expect(message.payload.kind === 'field-report' && message.payload.renderedItems).toBeNull();
+  });
+
+  it('ordinary network speech omits report association state entirely', () => {
+    const value = world();
+    const id = queueNetworkMessage(value, 'player', 'ada', ['you'], {
+      kind: 'sketch-tip', principal: 'player', asset: 'ada', subject: 'bez', detail: 'a visitor', featureId: 'sf0',
+    }, 15, null, null);
+    const speech = realizeNetworkForward(value, id,
+      { venue: 'square', members: ['ada', 'you'] }, 15, RULES)!;
+    expect(Object.hasOwn(speech, 'reportRoots')).toBe(false);
+  });
+
+  it('private roots never enter spoken content, an observer feed, player intel or enemy evidence', () => {
+    const { value, message } = reportWorld([{ root: 'private-root-A', observation: ASK }], false);
+    const speech = realizeNetworkForward(value, message.id,
+      { venue: 'square', members: ['ada', 'you', 'bez'] }, 15, RULES)!;
+    expect(speech.reportRoots).toEqual(['private-root-A']);
+    const altered = cloneSerializable(speech);
+    altered.reportRoots = ['private-root-B'];
+    const events = speechEvents(speech);
+    const twinEvents = speechEvents(altered);
+    expect(observationsFor('bez', events)).toEqual(observationsFor('bez', twinEvents));
+    const twin = cloneSerializable(value);
+    value.network.spymaster = 'bez'; twin.network.spymaster = 'bez';
+    captureIntel(value, events, RULES); captureIntel(twin, twinEvents, RULES);
+    captureEvidence(value, events, RULES); captureEvidence(twin, twinEvents, RULES);
+    expect(value.intel).toEqual(twin.intel);
+    expect(value.enemy).toEqual(twin.enemy);
+    for (const view of [speech.spoken, observationsFor('bez', events), value.intel, value.enemy]) {
+      expect(JSON.stringify(view)).not.toContain('private-root-');
+      expect(JSON.stringify(view)).not.toContain('reportRoots');
+    }
+  });
+
+  it('the tick transaction copies each hop now, preserving earlier content after later omission', () => {
+    const { value, message } = reportWorld([
+      { root: 'a-presence', observation: { kind: 'presence', observedAt: 0, venue: 'square', actor: 'bez' } },
+      { root: 'b-asking', observation: ASK },
+    ]);
+    value.npcs['bez']!.traits = ['vaguener'];
+    value.playerVenue = 'backroom';
+    value.npcs['bez']!.schedule = [
+      { days: 'all', from: 0, to: 30, venue: 'square' },
+      { days: 'all', from: 30, to: 1439, venue: 'backroom' },
+    ];
+    value.tick = 15;
+    const events = step(value, RULES);
+    const first = reportRows(value).find((row) => row.messageId === message.id)!;
+    expect(first.reportRoots).toEqual(['a-presence', 'b-asking']);
+    const snapshot = cloneSerializable(first);
+    const emitted = events.networkSpeeches!.find((speech) => speech.messageId === message.id)!;
+    emitted.reportRoots![0] = 'caller-mutated-event';
+    expect(first).toEqual(snapshot);
+    runUntil(value, 31, RULES);
+    const rows = reportRows(value).filter((row) => row.messageId === message.id);
+    expect(rows).toHaveLength(2);
+    expect(rows[0]).toEqual(snapshot);
+    expect(rows[1]).toMatchObject({ tick: 30, addressedTo: 'you', reportRoots: ['b-asking'] });
+    expect(value.intel.log).toMatchObject([{ tick: 0, kind: 'asking' }]);
+  });
+
+  it('autonomous report chronology replays exactly through the normal transaction', () => {
+    const { value, message } = reportWorld([{ root: 'source-a', observation: ASK }], false);
+    value.tick = 15;
+    const initial = cloneSerializable(value);
+    runUntil(value, 16, RULES);
+    expect(reportRows(value).find((row) => row.messageId === message.id)?.reportRoots)
+      .toEqual(['source-a']);
+    expect(hashWorld(runLogOn(initial, RULES, [], 16))).toBe(hashWorld(value));
+  });
+});
```

## Acceptance and gate commands

- Current proposal has 16 new test identities and zero removed identities. Eventual
  suite floor is actual predecessor count +16, files +1. Two existing assertion
  bodies gain a field without changing their test identities.
- Same-tick identical pages map to their own fresh claims; hand-over, pickup and
  NPC re-show are exact. Avatar return creates only its existing hint and no claim.
- Report roots survive identical content, relay omission/reindexing, empty reports,
  real phase recording, later packet mutation, transient caller mutation and replay.
- No private root is spoken or observed. Failed/ordinary non-report sends omit state.
- Legacy fallback remains explicit, and an explicit wrong ID is never guessed away.
- Keep new state lazy. No-report/no-artifact worlds retain exact bytes. In worlds
  with these actions, only the additional recording metadata may differ in the
  before/proposal compatibility probe; claims/beliefs/intel/evidence remain equal.

Native focused command after implementation:
`node node_modules/vitest/vitest.mjs run tests/sim/debrief-recording.test.ts tests/sim/artifacts.test.ts tests/sim/chronicle.test.ts tests/directives/field-reports.test.ts tests/sim/forensics.test.ts`

Then every full gate in the constraints. Record all complete simulation measurement
blocks, including any serialization hashes affected by the explicit new fields.
Never broadly update snapshots or invent a future hash/count. Explain a changed
metric from the exact recording delta; gameplay drift is a finding.

Proposal tools retained inside .superpowers/sdd:
- task-5a-prepare-proposal.py: exact unique-anchor assembly, never source-path writes.
- task-5a-validation/vitest-proposal.config.mjs: virtual native test host; base mode
  HEARSAY_RECORDING_PROBE_BASE=1 loads tests only. Regression mode
  HEARSAY_RECORDING_PROBE_REGRESSION=1 includes four existing suites.
- task-5a-preflight.mjs: both actual compiler configs and ESLint on all eight files.
- task-5a-compatibility.mjs: nine complete before/proposal world pairs, actual paper
  and two-hop omission scenes, removes only new chronicle metadata before equality.

**Reusable-work check:** the virtual-source runner is a project-local script, useful
for previewing dependent plans without touching production. Cheapest accurate operator:
mechanical_worker after exact configuration is provided; author/reviewer owns judgments.
Do not create or modify a shared skill under this session's Hearsay-only write scope.

## Adversarial author reviews

Pass 1, forward: all loops are finite existing collection walks; ID/coin/timing scales
are unchanged. Every API comes from current repository code. Compiler probing found
an omitted sketch-tip principal in the test fixture and the old claimId narrowing;
the fixture gained its required association and the narrow existing consumer was
migrated. The regression host initially omitted Vitest globals; restore the real
configuration's globals flag, not source tests. Two exact expected record objects
required the new key; retain equality strength and original values.

Pass 2, reverse: capture timing occurs after projection and before any later hop;
empty lists differ from absence; transient and persistent arrays are independently
owned; no payload/Observation schemas gain roots. Exact claim identity prevents the
old identical-page ambiguity, with legacy fallback only on absent IDs. Avatar return
stays on intel and has no fabricated family. Live replay and full old-state equality
are native measured results, not hand-simulated expectations. No production change
was needed to pass an emergent route. Actual future predecessor remains unverified.

## Independent review and remaining work

Reviewer license: plan-authored code is NOT presumed correct; plan-mandated defects
are findings at full severity. Independently rerun the proposal tests/probes and cite
what ran. File-only reading is advisory, never a runtime approval. Verify hidden-data
boundaries, array snapshot ownership, exact claim association, legacy handling and
the two existing expectation migrations. Separate code review follows implementation.

Task 5B owns typed story/artifact/network/report/magic threads, actual chronology,
semantic counter-sketch matching and legacy unavailable-association display. No new
UI, magic mechanics, root IDs visible to actors, schema-wide migrations, counterfactual
replay or universal data-flow hardening is included here.
