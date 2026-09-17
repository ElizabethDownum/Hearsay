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
