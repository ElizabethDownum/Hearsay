# Task 5B magic story identity correction — exact versioned proposal

13 September 2026. Proposal-only correction to the independent Important finding.
Status: ready for fresh independent re-review; no production approval is claimed.

## Behavior and boundary

A valid exact-keyed historical claim must supply its séance event's family even if
a second malformed dictionary entry repeats that claim's internal ID. The current
proposal permits that second object to overwrite the event lookup and move the
ritual into an unrelated family. Guard the event lookup insertion with
`world.claims[claim.id] === claim`. Only the exact retained dictionary value can
supply event identity. The retained-version display, source claim dictionary and
existing family sorting stay as before; this unit does not remove raw alias data.

The guard applies to the single existing shared lookup for injection, telling,
linked document viewing and séance events. It makes no content, time, place,
parent, speaker or family guess. Existing missing/exact-ID-mismatch séance guards
and unresolved-event behavior remain byte-identical. Historical price, receipt
completeness, physical facts and magic.ts are unchanged.

## Fixed source and dependencies

Actual archive base: `152f2a0d788d7166150ba31b25090f3aa21d199c`, 351 files.
The original magic proposal and its independent Needs-fixes review are immutable
inputs. The fixed 29-body map includes 10 debrief models, 10 debrief test bodies and
nine named future Task 5A/T5A-A1/5A2/R16/R17 recording/watch overlays. The latter are
not actual production source. All 27 bodies outside the two targets below remain
byte-identical. Preserve the source map and actual-versus-future provenance in
`task-5b-magic-identity-validation/source-inventory.json` and its fixed input copy
of `overlay-provenance.json` when composing or implementing later.

| Fixed input | SHA-256 |
| --- | --- |
| `task-5b-magic-threads-author-draft.md` | `ac53a998f44d916bc936c4b80e5fa3d8c3a79d33ee752c4d925e1966b6816963` |
| `task-5b-magic-threads-author-report.md` | `b04cde374e5dd72de8a0aed1c8466627f9b19812417568987fb5be286cd4f7ce` |
| `task-5b-magic-threads-constraints.md` | `af1500f183bd623d3f2e6220aef5ce43115bb1855cdad0752bd48834061b7a1d` |
| `file-inventory.json` | `0236cac7bdf29fff654218ece5d9148ddb9a1b15bcbbac4db87b969a82410687` |
| `final-green.source-map.json` | `381e423f592dc4fbc30b4b8d95773fcf9770b6a3ffe03d0cea1e3500ae0c0fe7` |
| `task-5b-magic-threads-native-review-2026-09-13.md` | `23379c0fe4bd49c788977e253f6cfa5bbbe8b3f65513e44b14e946838a852ed0` |

The independently approved physical 198 model remains a transitive proposal input.
Nothing in this correction supersedes actual-base reconciliation, the recording
predecessors' code reviews, or the remaining whole Task 5B review.

## Exact task for the executor

After this correction receives independent proposal approval, replace exactly the
two corresponding bodies in the frozen 29-body magic map with the complete bodies
below. A bounded transcription worker may install the approved model later under
the controller's actual-HEAD-bound brief. Keep every other mapped body and all
existing 240 test identities/assertions. The added import and appended one-case
regression are the only test additions; there are no migrations or removals.

Before writing production, reconcile against the actual approved recording/watch
predecessors and compare the frozen maps. Do not overwrite subsequent approved
composition work. Treat a new material overlap as a controller reconciliation task;
do not weaken the identity requirement or a test to force an exact transcription.

| Corrected target | SHA-256 | Bytes |
| --- | --- | --- |
| `src/sim/debrief/stories.ts` | `3ea92f3bd6253a5b9a907a6925fbac39b80da887c197ca9767577fca87495eb2` | 7684 |
| `tests/debrief/magic.test.ts` | `a324a91c2ec7dfb5f1d9623f6e2f8804d44badc0d562ad676067f35b8817699c` | 21930 |

### Complete `src/sim/debrief/stories.ts`

```ts
import type { SeanceRecord } from '../magic-types';
import { TICKS_PER_DAY } from '../../core/time';
import type { Artifact } from '../artifacts';
import { cloneSerializable } from '../hash';
import { diffClaims, type Claim, type FieldChange } from '../rumors/claim';
import { STANCE } from '../rumors/propagation';
import type { ArtifactRecord, Belief, InjectRecord, TellingRecord, WorldState } from '../types';

export interface StoryVersion {
  claim: Claim;
  parentState: 'root' | 'recorded' | 'missing' | 'other-family';
  changes: FieldChange[] | null;
}
export interface StoryEvent {
  chronicleIndex: number;
  record: InjectRecord | TellingRecord | ArtifactRecord | SeanceRecord;
  claimId: string;
  /** Null means the parent was not retained; [] means no content changed. */
  changes: FieldChange[] | null;
  changedBy: string | null;
}
export interface StoryThread {
  kind: 'story';
  id: string;
  family: string;
  versions: StoryVersion[];
  events: StoryEvent[];
  originEventIndexes: number[];
  artifactIds: string[];
  beliefs: { npc: string; belief: Belief }[];
  lastActivityAt: number | null;
  /** No recorded activity leaves this unknown, rather than inventing a death date. */
  died: boolean | null;
  becameEvidence: number[];
}

/** Current family lineage plus every retained injection, speech, linked paper viewing and séance receipt. */
export function storyThreads(world: WorldState): StoryThread[] {
  const families = new Map<string, StoryThread>();
  const versions = new Map<string, StoryVersion>();
  for (const claim of Object.values(world.claims).sort((a, b) => a.id.localeCompare(b.id))) {
    const parent = claim.parent === null ? null : world.claims[claim.parent];
    const parentState = claim.parent === null ? 'root' : !parent ? 'missing'
      : parent.family === claim.family ? 'recorded' : 'other-family';
    const version: StoryVersion = { claim: cloneSerializable(claim), parentState,
      changes: parentState === 'root' ? [] : parentState === 'recorded' ? diffClaims(parent!, claim) : null };
    // Only the exact retained dictionary value can supply event identity; aliases remain visible versions.
    if (world.claims[claim.id] === claim) versions.set(claim.id, version);
    const thread: StoryThread = families.get(claim.family) ?? { kind: 'story', id: 'story:' + claim.family,
      family: claim.family, versions: [], events: [], originEventIndexes: [], artifactIds: [],
      beliefs: [], lastActivityAt: null, died: null, becameEvidence: [] };
    thread.versions.push(version); families.set(claim.family, thread);
  }
  world.chronicle.forEach((row, chronicleIndex) => {
    if (row.tick > world.tick || (row.kind !== 'inject' && row.kind !== 'telling' && row.kind !== 'artifact' && row.kind !== 'seance')) return;
    if (row.claimId === undefined) return;
    if (row.kind === 'seance' && world.claims[row.claimId]?.id !== row.claimId) return;
    const version = versions.get(row.claimId);
    if (!version) return;
    const thread = families.get(version.claim.family)!;
    const changes = row.kind === 'seance' ? [] : cloneSerializable(version.changes);
    thread.events.push({ chronicleIndex, record: cloneSerializable(row), claimId: row.claimId, changes,
      changedBy: row.kind !== 'seance' && changes !== null && changes.length > 0 ? (row.kind === 'telling' ? row.speaker : row.by) : null });
    if ((row.kind === 'inject' || row.kind === 'artifact') && version.parentState === 'root') {
      thread.originEventIndexes.push(chronicleIndex);
    }
    if (row.kind === 'artifact' && !thread.artifactIds.includes(row.artifact)) thread.artifactIds.push(row.artifact);
    thread.lastActivityAt = Math.max(thread.lastActivityAt ?? row.tick, row.tick);
  });
  for (const [npc, store] of Object.entries(world.beliefs).sort(([a], [b]) => a.localeCompare(b))) {
    if (!world.npcs[npc]) continue;
    for (const [family, belief] of Object.entries(store)) {
      families.get(family)?.beliefs.push({ npc, belief: cloneSerializable(belief) });
    }
  }
  world.enemy.evidence.forEach((entry, index) => {
    // Family is immutable lineage metadata, not the reported subject or a content guess.
    if (entry.family !== null) families.get(entry.family)?.becameEvidence.push(index);
  });
  for (const thread of families.values()) {
    thread.events.sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex);
    thread.artifactIds.sort();
    thread.died = thread.lastActivityAt === null ? null
      : world.tick - thread.lastActivityAt >= 2 * TICKS_PER_DAY
        && !thread.beliefs.some((row) => row.belief.credence >= STANCE.REPEAT);
  }
  return [...families.values()].sort((a, b) => a.family.localeCompare(b.family));
}

/** Retained speech or ritual receipts can lack an identifiable claim; never silently discard them. */
export function unresolvedStoryEvents(world: WorldState): { chronicleIndex: number; record: InjectRecord | TellingRecord | SeanceRecord }[] {
  return world.chronicle.flatMap((row, chronicleIndex) =>
    row.tick <= world.tick && (row.kind === 'inject' || row.kind === 'telling' || row.kind === 'seance') && (!world.claims[row.claimId] || (row.kind === 'seance' && world.claims[row.claimId]!.id !== row.claimId))
      ? [{ chronicleIndex, record: cloneSerializable(row) }] : []);
}

export interface ArtifactEvent {
  chronicleIndex: number;
  record: ArtifactRecord;
  claim: Claim | null;
  family: string | null;
  claimLink: 'linked' | 'missing-claim' | 'unrecorded' | 'not-a-viewing';
}
export interface ArtifactThread {
  kind: 'artifact';
  id: string;
  artifactId: string;
  /** Current custody and immutable paper text, distinct from each interpretation. */
  artifact: Artifact | null;
  events: ArtifactEvent[];
  storyFamilies: string[];
}

function isNpcViewing(world: WorldState, row: ArtifactRecord): boolean {
  if (row.act === 'pickup') return row.by !== world.playerId;
  if (row.act === 'show' || row.act === 'reshow') return row.to !== null && row.to !== world.playerId;
  return row.act === 'plant' && row.to !== null && row.to !== world.playerId && Object.hasOwn(world.npcs, row.to);
}

/** Exact Task5A1 claim ids connect fresh viewing families; identical text is never an identity join. */
export function artifactThreads(world: WorldState): ArtifactThread[] {
  const threads = new Map<string, ArtifactThread>();
  const get = (id: string): ArtifactThread => {
    const row: ArtifactThread = threads.get(id) ?? { kind: 'artifact', id: 'artifact:' + id, artifactId: id,
      artifact: null, events: [], storyFamilies: [] };
    threads.set(id, row); return row;
  };
  for (const artifact of world.artifacts ?? []) get(artifact.id).artifact = cloneSerializable(artifact);
  world.chronicle.forEach((row, chronicleIndex) => {
    if (row.kind !== 'artifact' || row.tick > world.tick) return;
    const thread = get(row.artifact);
    const claim = row.claimId === undefined ? null : world.claims[row.claimId] ?? null;
    const claimLink = row.claimId === undefined ? isNpcViewing(world, row) ? 'unrecorded' : 'not-a-viewing'
      : claim === null ? 'missing-claim' : 'linked';
    thread.events.push({ chronicleIndex, record: cloneSerializable(row), claim: cloneSerializable(claim),
      family: claim?.family ?? null, claimLink });
    if (claim && !thread.storyFamilies.includes(claim.family)) thread.storyFamilies.push(claim.family);
  });
  for (const thread of threads.values()) {
    thread.events.sort((a, b) => a.record.tick - b.record.tick || a.chronicleIndex - b.chronicleIndex);
    thread.storyFamilies.sort();
  }
  return [...threads.values()].sort((a, b) => a.artifactId.localeCompare(b.artifactId));
}
```

### Complete `tests/debrief/magic.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyAction } from '../../src/sim/campaign';
import { threadOf } from '../../src/sim/chronicle';
import { magicThreads, type ScryThread, type SeanceThread } from '../../src/sim/debrief/magic';
import { storyThreads, unresolvedStoryEvents } from '../../src/sim/debrief/stories';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { captureScryIntel } from '../../src/sim/magic';
import { runUntil, step } from '../../src/sim/step';
import { scryWorld } from '../sim/helpers/scry-world';
import { seanceWorld, nightVisitWorld } from '../sim/helpers/seance-town';

function bought() {
  const world = scryWorld();
  applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
  return world;
}
function captured() { const world = bought(); world.tick = 1440; step(world, R); return world; }
function delivered() { const world = captured(); runUntil(world, 1486, R); return world; }
function ritual() {
  const world = seanceWorld(); world.tick = 15;
  applyAction(world, { tick: 15, kind: 'seance' }, R); return world;
}
function scry(world: ReturnType<typeof bought>): ScryThread {
  const thread = magicThreads(world).operations.find((row) => row.spell === 'scrying');
  if (thread?.spell !== 'scrying') throw new Error('missing scry operation'); return thread;
}
function seance(world: ReturnType<typeof ritual>): SeanceThread {
  const thread = magicThreads(world).operations.find((row) => row.spell === 'seance');
  if (thread?.spell !== 'seance') throw new Error('missing séance operation'); return thread;
}

describe('recorded magic operations and distinct acquisition facts', () => {
  it('an untouched world creates no magic operations or lazy state', () => {
    const world = scryWorld(); const before = hashWorld(world);
    expect(magicThreads(world)).toEqual({ operations: [], unassociatedIntel: [], residuesWithoutOperation: [] });
    expect(hashWorld(world)).toBe(before); expect(world.magic).toBeUndefined();
  });
  it('a successful purchase records the actual scheduled target/window and unknown historical price', () => {
    const world = bought();
    expect(scry(world)).toMatchObject({ operation: 's0', recordState: 'recorded', price: { state: 'unrecorded' },
      records: [{ record: { kind: 'scry', tick: 0, venue: 'hall', day: 1, from: 0, to: 60 } }],
      window: { from: 1440, to: 1500, phase: 'scheduled' }, captureState: 'none-recorded', intel: [] });
  });
  it('rejected scry and séance actions add no operations', () => {
    const world = scryWorld(); const before = hashWorld(world);
    expect(() => applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 2, from: 0, to: 60 }, R)).toThrow();
    expect(hashWorld(world)).toBe(before); expect(magicThreads(world).operations).toEqual([]);
    const dead = seanceWorld(); dead.coin = 0;
    expect(() => applyAction(dead, { tick: 0, kind: 'seance' }, R)).toThrow();
    expect(magicThreads(dead).operations).toEqual([]);
  });
  it('actual captures retain provenance, exact indexes and their immediate observation time', () => {
    const world = captured(); const thread = scry(world);
    expect(thread.window?.phase).toBe('active'); expect(thread.captureState).toBe('recorded');
    expect(thread.intel.length).toBeGreaterThan(0);
    for (const row of thread.intel) {
      expect(row.entry).toEqual(world.intel.log[row.entryIndex]);
      expect(row).toMatchObject({ association: 'linked', learnedAt: 1440 });
      expect(row.entry.provenance).toEqual({ kind: 'magic', spell: 'scrying', operation: 's0' });
    }
  });
  it('a paid but uninformative expired window stays none-recorded without an invented death or refund', () => {
    const world = bought(); world.tick = 1440;
    captureScryIntel(world, { tick: 1440, positions: {}, utterances: [], askings: [] });
    world.tick = 1500;
    expect(scry(world)).toMatchObject({ window: { phase: 'elapsed' }, captureState: 'none-recorded', intel: [],
      price: { state: 'unrecorded' } });
  });
  it('past the half-open window no later sensor capture is attributed to the purchase', () => {
    const world = bought(); world.tick = 1500;
    captureScryIntel(world, { tick: 1500, positions: { guard: 'hall' }, utterances: [], askings: [] });
    expect(scry(world).intel).toEqual([]);
  });
  it('actual residue creation and discovery precede actual remote receipt', () => {
    const world = captured(); const held = scry(world).residue;
    expect(held).toMatchObject({ association: 'linked', created: [{ record: { act: 'created', tick: 1440 } }],
      observed: [{ record: { act: 'observed', tick: 1440, observer: 'guard' } }], evidence: [] });
    expect(held.reports.length).toBeGreaterThan(0);
    runUntil(world, 1486, R);
    expect(scry(world).residue.evidence[0]).toMatchObject({ entry: { speaker: null, residue: { witness: 'guard' } },
      arrival: { observedAt: 1440, learnedAt: 1485, timing: 'report' } });
  });
  it('direct principal residue acquisition stays direct and does not fabricate a report route', () => {
    const world = bought(); world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
    world.tick = 1440; step(world, R);
    expect(scry(world).residue.evidence[0]).toMatchObject({ arrival: { timing: 'direct', learnedAt: 1440, reportMessageId: null } });
  });
  it('an actual later digest is separate from residue observation and receipt', () => {
    const world = delivered();
    expect(scry(world).residue.evidence[0]!.features).toEqual([]);
    const features = enemyDigest(world.enemy, 1, R).features.filter((row) => row.kind === 'arcane-residue');
    world.enemy.decisions = [{ day: 1, features, inquiries: [], watches: [], interrogations: [] }]; world.enemy.sketch = features;
    expect(scry(world).residue.evidence[0]!.features[0]).toMatchObject({ recordedDay: 1,
      reference: { resolution: 'resolved', attentionIds: [] } });
    world.enemy.decisions[0]!.day = 0;
    expect(scry(world).residue.evidence[0]!.features[0]).toMatchObject({ recordedDay: 0, reference: { resolution: 'late' } });
  });
  it('removing an actual physical receipt keeps its acquisition unknown despite the operation and trace', () => {
    const world = delivered(); const entry = world.enemy.evidence.find((row) => row.kind === 'arcane-residue')!;
    if (entry.kind !== 'arcane-residue') throw new Error('missing residue');
    world.chronicle = world.chronicle.filter((row) => row.kind !== 'network-speech' || row.messageId !== entry.receipt!.messageId);
    expect(scry(world).residue).toMatchObject({ association: 'linked', evidence: [{ arrival: { learnedAt: null, timing: 'unrecorded' } }] });
  });
  it('duplicate physical receipts retain the existing feature ambiguity', () => {
    const world = delivered(); const receipt = world.chronicle.find((row) => row.kind === 'network-speech')!;
    world.chronicle.push(cloneSerializable(receipt));
    const features = enemyDigest(world.enemy, 1, R).features.filter((row) => row.kind === 'arcane-residue');
    world.enemy.decisions = [{ day: 1, features, inquiries: [], watches: [], interrogations: [] }]; world.enemy.sketch = features;
    expect(scry(world).residue.evidence[0]!.features[0]!.reference.resolution).toBe('ambiguous');
  });
  it('duplicate operation IDs expose every record and refuse one arbitrarily selected window', () => {
    const world = captured(); const record = world.chronicle.find((row) => row.kind === 'scry')!;
    world.chronicle.push({ ...record, venue: 'away' });
    expect(scry(world)).toMatchObject({ recordState: 'ambiguous', window: null, captureState: 'uncertain' });
    expect(scry(world).records).toHaveLength(2);
    expect(scry(world).intel.every((row) => row.association === 'ambiguous' && row.learnedAt === null)).toBe(true);
  });
  it.each(['trace', 'creation'] as const)('missing %s history does not establish the operation-to-residue link', (missing) => {
    const world = captured();
    if (missing === 'trace') world.magic!.traces = [];
    else world.chronicle = world.chronicle.filter((row) => row.kind !== 'residue' || row.act !== 'created');
    expect(scry(world).residue.association).toBe('unrecorded');
  });
  it.each(['trace', 'creation'] as const)('duplicate %s history stays ambiguous', (duplicate) => {
    const world = captured();
    if (duplicate === 'trace') world.magic!.traces.push(cloneSerializable(world.magic!.traces[0]!));
    else world.chronicle.push(cloneSerializable(world.chronicle.find((row) => row.kind === 'residue' && row.act === 'created')!));
    expect(scry(world).residue.association).toBe('ambiguous');
  });
  it('a wrong-venue same-ID trace cannot become an operation fact', () => {
    const world = captured(); world.magic!.traces[0]!.venue = 'away';
    expect(scry(world).residue.association).toBe('inconsistent');
  });
  it('retained capture provenance without an operation record stays explicitly unassociated', () => {
    const world = captured(); world.chronicle = world.chronicle.filter((row) => row.kind !== 'scry');
    const history = magicThreads(world);
    expect(history.operations).toEqual([]); expect(history.unassociatedIntel.length).toBeGreaterThan(0);
    expect(history.unassociatedIntel.every((row) => row.association === 'unrecorded' && row.learnedAt === null)).toBe(true);
    expect(history.residuesWithoutOperation[0]!.association).toBe('unrecorded');
  });
  it('mutable pending windows cannot fabricate missing operation records', () => {
    const world = bought(); world.chronicle = [];
    expect(world.magic!.scries).toHaveLength(1); expect(magicThreads(world).operations).toEqual([]);
  });
  it('unknown physical residue IDs remain orphaned rather than joined by shared venue and time', () => {
    const world = captured(); world.magic!.traces[0]!.id = 'other';
    expect(magicThreads(world).residuesWithoutOperation[0]!.residueId).toBe('other');
    expect(scry(world).residue.traces).toEqual([]);
  });
  it('a retained raw physical report survives as unassociated residue when its operation and trace records are missing', () => {
    const world = captured(); world.magic!.traces = [];
    world.chronicle = world.chronicle.filter((row) => row.kind !== 'scry' && row.kind !== 'residue');
    expect(world.network.directiveState!.heldObservations.length).toBeGreaterThan(0);
    const history = magicThreads(world);
    expect(history.operations).toEqual([]);
    expect(history.residuesWithoutOperation[0]).toMatchObject({ residueId: 's0', association: 'unrecorded' });
    expect(history.residuesWithoutOperation[0]!.reports.length).toBeGreaterThan(0);
  });
  it('an NPC channel named scrying is human without explicit magic provenance', () => {
    const world = captured(); const magic = world.intel.log.find((row) => row.provenance?.spell === 'scrying')!;
    const human = cloneSerializable(magic); delete human.provenance; human.via = 'scrying'; world.intel.log.push(human);
    expect(scry(world).intel.map((row) => row.entryIndex)).not.toContain(world.intel.log.length - 1);
    expect(magicThreads(world).unassociatedIntel).toEqual([]);
  });
  it.each(['outside-window', 'wrong-venue', 'wrong-kind'] as const)('%s provenance is retained as inconsistent, not acquired', (fault) => {
    const world = captured(); const entry = world.intel.log.find((row) => row.provenance?.spell === 'scrying')!;
    if (fault === 'outside-window') entry.tick = 1439;
    if (fault === 'wrong-venue') entry.venue = 'away';
    if (fault === 'wrong-kind') entry.kind = 'edge-read';
    expect(scry(world).intel.some((row) => row.association === 'inconsistent' && row.learnedAt === null)).toBe(true);
  });
  it('an invalid retained window exposes no computed active interval', () => {
    const world = bought(); const record = world.chronicle.find((row) => row.kind === 'scry')!;
    if (record.kind !== 'scry') throw new Error('missing purchase'); record.to = record.from;
    expect(scry(world)).toMatchObject({ window: null, captureState: 'uncertain' });
  });
});

describe('séance is receipt of a historical root and edge', () => {
  it('a real ritual retains one operation, its historical claim, exact edge and two received rows', () => {
    const world = ritual(); const thread = seance(world);
    expect(thread).toMatchObject({ recordState: 'recorded', receiptState: 'complete',
      claim: { state: 'retained-root', value: { id: world.departed!.claimId, parent: null } } });
    expect(thread.intel).toHaveLength(2);
    expect(thread.intel.every((row) => row.learnedAt === 15 && row.association === 'linked')).toBe(true);
    expect(thread.records[0]!.record.edge).toEqual(world.departed!.edge);
  });
  it('the actual story event records later receipt without a new version or invented origin', () => {
    const world = seanceWorld(); const before = cloneSerializable(world.claims);
    const existing = storyThreads(world).find((row) => row.family === world.departed!.secretId)!;
    const origins = existing.originEventIndexes;
    world.tick = 15; applyAction(world, { tick: 15, kind: 'seance' }, R);
    const thread = storyThreads(world).find((row) => row.family === world.departed!.secretId)!;
    const event = thread.events.find((row) => row.record.kind === 'seance')!;
    expect(event).toMatchObject({ claimId: world.departed!.claimId, changes: [], changedBy: null, record: { tick: 15 } });
    expect(thread.originEventIndexes).toEqual(origins); expect(world.claims).toEqual(before);
    expect(thread.versions).toHaveLength(existing.versions.length); expect(thread.lastActivityAt).toBe(15);
  });
  it('a missing historical claim keeps the actual séance event in unresolved stories', () => {
    const world = ritual(); delete world.claims[world.departed!.claimId];
    expect(seance(world).claim).toEqual({ state: 'missing', value: null });
    expect(unresolvedStoryEvents(world).some((row) => row.record.kind === 'seance')).toBe(true);
  });
  it('a malformed parent never attributes a human mutation to the dead', () => {
    const world = ritual(); world.claims[world.departed!.claimId] = { ...world.claims[world.departed!.claimId]!, parent: 'missing-parent' };
    expect(seance(world).claim.state).toBe('inconsistent');
    const event = storyThreads(world).flatMap((row) => row.events).find((row) => row.record.kind === 'seance')!;
    expect(event).toMatchObject({ changes: [], changedBy: null });
  });
  it('a missing magic edge row is incomplete rather than reconstructed from the current departed', () => {
    const world = ritual(); world.intel.log = world.intel.log.filter((row) => row.provenance?.spell !== 'seance' || row.kind !== 'edge-read');
    expect(seance(world).receiptState).toBe('incomplete'); expect(seance(world).intel).toHaveLength(1);
  });
  it('duplicate actual magic rows remain ambiguous instead of selecting the first', () => {
    const world = ritual(); world.intel.log.push(cloneSerializable(world.intel.log.find((row) => row.provenance?.spell === 'seance')!));
    expect(seance(world).receiptState).toBe('ambiguous'); expect(seance(world).intel).toHaveLength(3);
  });
  it('duplicate ritual operation records retain both and no uniquely attributed historical claim', () => {
    const world = ritual(); world.chronicle.push(cloneSerializable(world.chronicle.find((row) => row.kind === 'seance')!));
    expect(seance(world)).toMatchObject({ recordState: 'ambiguous', receiptState: 'ambiguous', claim: { state: 'ambiguous', value: null } });
    expect(seance(world).records).toHaveLength(2);
  });
  it.each(['edge', 'reported', 'human-speaker'] as const)('a corrupt %s magic receipt is explicit inconsistency', (fault) => {
    const world = ritual(); const entry = world.intel.log.find((row) => row.provenance?.spell === 'seance'
      && row.kind === (fault === 'edge' ? 'edge-read' : 'utterance'))!;
    if (fault === 'edge') entry.edgeFrom = 'invented';
    if (fault === 'reported') entry.reported!.subject = 'invented';
    if (fault === 'human-speaker') entry.speaker = 'seance';
    expect(seance(world).receiptState).toBe('inconsistent');
  });
  it('an NPC called seance cannot stand in for the missing explicitly marked receipt', () => {
    const world = ritual();
    for (const row of world.intel.log) if (row.provenance?.spell === 'seance') delete row.provenance;
    expect(seance(world)).toMatchObject({ receiptState: 'incomplete', intel: [] });
  });
  it('a mismatched retained claim ID cannot masquerade as the ritual historical root', () => {
    const world = ritual(); const id = world.departed!.claimId;
    world.claims[id] = { ...world.claims[id]!, id: 'other-root' };
    expect(seance(world).claim.state).toBe('inconsistent');
    expect(storyThreads(world).flatMap((row) => row.events).some((row) => row.record.kind === 'seance')).toBe(false);
    expect(unresolvedStoryEvents(world).some((row) => row.record.kind === 'seance')).toBe(true);
  });
  it('same operation text across spells cannot collapse two distinct channels', () => {
    const world = ritual(); world.coin = 15;
    applyAction(world, { tick: 15, kind: 'scry', venue: 'chapel-d0', day: 1, from: 0, to: 15 }, R);
    const record = world.chronicle.find((row) => row.kind === 'scry')!;
    if (record.kind !== 'scry') throw new Error('missing purchase'); record.operation = seance(world).operation;
    const operations = magicThreads(world).operations;
    expect(operations).toHaveLength(2); expect(new Set(operations.map((row) => row.id)).size).toBe(2);
    expect(operations.find((row) => row.spell === 'scrying')!.intel).toEqual([]);
  });
  it('an actual same-place night visit never becomes proof that its observer saw the ritual', () => {
    const world = nightVisitWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); runUntil(world, 46, R);
    expect(world.chronicle.some((row) => row.kind === 'night-visit')).toBe(true);
    const history = magicThreads(world);
    expect(history.operations).toHaveLength(1); expect(history.operations[0]!.spell).toBe('seance');
    expect(history.residuesWithoutOperation).toEqual([]);
    expect(JSON.stringify(history)).not.toContain('nightVisit');
  });
  it('future ritual records and magic rows do not backdate into the retained current reader', () => {
    const world = ritual(); world.tick = 0;
    expect(magicThreads(world).operations).toEqual([]); expect(magicThreads(world).unassociatedIntel).toEqual([]);
    expect(storyThreads(world).flatMap((row) => row.events).some((row) => row.record.kind === 'seance')).toBe(false);
  });
});

it('all nested operation, record, claim, edge, report, trace, reference and intel output is detached', () => {
  const world = delivered();
  const features = enemyDigest(world.enemy, 1, R).features.filter((row) => row.kind === 'arcane-residue');
  world.enemy.decisions = [{ day: 1, features, inquiries: [], watches: [], interrogations: [] }]; world.enemy.sketch = features;
  const before = hashWorld(world); const expected = magicThreads(world); const changed = magicThreads(world);
  expect(changed).toEqual(expected);
  const thread = changed.operations[0]!;
  thread.records[0]!.record.venue = 'changed'; thread.intel[0]!.entry.actor = 'changed';
  if (thread.spell !== 'scrying') throw new Error('missing scry');
  thread.residue.traces[0]!.trace.seenBy[0]!.observer = 'changed';
  thread.residue.observed[0]!.record.observer = 'changed';
  thread.residue.evidence[0]!.entry.residue.witness = 'changed';
  thread.residue.evidence[0]!.arrival.learnedAt = 99999;
  thread.residue.evidence[0]!.features[0]!.reference.ref.residue!.witness = 'changed';
  thread.residue.evidence[0]!.features[0]!.reference.evidenceIndexes.push(999);
  thread.residue.reports[0]!.held[0]!.observer = 'changed';
  expect(hashWorld(world)).toBe(before); expect(magicThreads(world)).toEqual(expected);
  const dead = ritual(); const deadBefore = hashWorld(dead); const deadExpected = magicThreads(dead);
  const ritualThread = magicThreads(dead).operations[0]!;
  if (ritualThread.spell !== 'seance') throw new Error('missing ritual');
  Reflect.set(ritualThread.claim.value!, 'subject', 'changed'); ritualThread.records[0]!.record.edge.from = 'changed';
  const story = storyThreads(dead).flatMap((row) => row.events).find((row) => row.record.kind === 'seance')!;
  if (story.record.kind !== 'seance') throw new Error('missing story'); story.record.edge.to = 'changed';
  expect(hashWorld(dead)).toBe(deadBefore); expect(magicThreads(dead)).toEqual(deadExpected);
});

it('a malformed alias claim cannot steal a séance from its exact retained root family', () => {
  const world = ritual(); const claimId = world.departed!.claimId;
  const exactRoot = world.claims[claimId]!;
  world.claims['malformed-alias-key'] = {
    ...exactRoot, id: claimId, family: 'unrelated-family', subject: 'unrelated-subject',
  };
  const before = hashWorld(world);
  expect(seance(world).claim).toMatchObject({ state: 'retained-root', value: { family: exactRoot.family } });
  expect(threadOf(world, exactRoot.family).filter((row) => row.kind === 'seance')).toHaveLength(1);
  const threads = storyThreads(world);
  expect(threads.filter((thread) => thread.events.some((event) => event.record.kind === 'seance'))
    .map((thread) => thread.family)).toEqual([exactRoot.family]);
  expect(threads.flatMap((thread) => thread.events).filter((event) => event.record.kind === 'seance'))
    .toMatchObject([{ claimId, changes: [], changedBy: null, record: { tick: 15, claimId } }]);
  expect(threads.find((thread) => thread.family === 'unrelated-family')!.originEventIndexes).toEqual([]);
  expect(unresolvedStoryEvents(world).some((row) => row.record.kind === 'seance')).toBe(false);
  expect(hashWorld(world)).toBe(before); expect(storyThreads(world)).toEqual(threads);
});
```

## Acceptance and native commands

- Reproduce the original reviewer probe against the frozen map: one failure and
  one passing parent-damage control, with the failing family `unrelated-family`
  instead of the exact root family `s0`.
- Preserve all 240 original cases and assertions. The permanent regression must
  fail against the frozen story body, giving 240 passed / 1 failed, then pass with
  the corrected body, giving exactly 241 passed. No test body differs between
  this RED and GREEN. The original suite alone also passes 240 in the new host.
- Both original reviewer controls pass after correction. Four additional controls
  cover aliases inserted before/after the canonical root, deletion of the exact
  root, and an ID-inconsistent exact root. Retained alias versions remain detached;
  no alias gains an event, origin event or activity date.
- Both actual TypeScript configurations and scoped lint on all 29 bodies must pass
  without errors or warnings. Math.random, Date.now, argumentless new Date, and
  forbidden content imports must each fire at both actual magic/story model paths.
- Preserve all 533 original inventory entries, 20 fixed inputs/copies, 351 archive
  files, and every immutable native source/command/stdout/stderr/exit record.

Commands run from the isolated author checkout with PowerShell 7 and python -X utf8.
Use the controller's normal narrow native-read escalation for this native-owned
archive; the sandbox cannot read its nested source directories. Never change ACLs,
install dependencies, or change compiler/lint/project configuration.

```text
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py reviewer-red tests reproduced-failure
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py baseline tests inherited-240
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py red tests permanent-red
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py green tests corrected-241
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py reviewer-green tests reviewer-control-green
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py adjacent tests adjacency-green
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py green preflight native-actual-compilers-scoped-lint
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py root firing mandatory-firing
python -X utf8 .superpowers/sdd/task-5b-magic-identity-validation/run.py root audit final-integrity
```

These are recorded invocations, not permission to overwrite their evidence. For
re-review create an independently owned host/cache and new prefixes. Import the
fixed green map; do not reuse this author's mutable Vitest cache. The integrated
map is `green/corrected-241.source-map.json`; `green-map.json` has identical bytes.
See the author report for the evidence caveat about the sandbox compiler attempt.

No gameplay, schema, UI, terminal/calendar composition, full-game/build/soak/Monte
Carlo or production source change belongs to this correction. No arbitrary damaged
history recovery is promised. Independent re-review must precede composition's
adoption of this replacement.
