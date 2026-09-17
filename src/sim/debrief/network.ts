import type { Tick } from '../../core/time';
import type { NetworkPayload, SpokenNetworkPayload } from '../directives/types';
import type { Principal } from '../network/types';
import { cloneSerializable, stableStringify } from '../hash';
import type { NetworkSpeechRecord, WorldState } from '../types';

export interface SpokenCopyChange {
  path: string;
  beforePresent: boolean;
  afterPresent: boolean;
  before: unknown;
  after: unknown;
}

/** An actual speaking event, including an empty report and overheard audiences. */
export interface NetworkThreadStage {
  chronicleIndex: number;
  tick: Tick;
  venue: string;
  speaker: string;
  addressedTo: string;
  heardBy: NetworkSpeechRecord['heardBy'];
  copy: SpokenNetworkPayload;
  /** Null means no earlier retained copy exists; [] means equal consecutive copies. */
  changes: SpokenCopyChange[] | null;
  /** Null means legacy/malformed association; do not match items by guessed position. */
  reportRoots: string[] | null;
  /** Only comparable complete root sets can prove an omission at this stage. */
  omittedRoots: string[] | null;
}

export interface NetworkThread {
  kind: 'network';
  id: string;
  messageId: string;
  principal: Principal | null;
  createdAt: Tick | null;
  origin: string | null;
  /** The packet's retained route, not a claim that every leg was traversed. */
  plannedRoute: string[] | null;
  /** Current carried data, never mislabelled as the pristine original. */
  carriedCopy: NetworkPayload | null;
  transport: 'in-transit' | 'delivered' | 'failed' | 'unrecorded';
  transportAt: Tick | null;
  stages: NetworkThreadStage[];
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Stable value diff. Presence is explicit so null and an absent field remain different. */
export function spokenCopyChanges(before: SpokenNetworkPayload, after: SpokenNetworkPayload): SpokenCopyChange[] {
  return reportValueChanges(before, after);
}

/** The same value diff also compares individual root-associated report items. */
export function reportValueChanges(before: unknown, after: unknown): SpokenCopyChange[] {
  const changes: SpokenCopyChange[] = [];
  const visit = (a: unknown, b: unknown, path: string, aPresent: boolean, bPresent: boolean): void => {
    if (aPresent && bPresent && stableStringify(a) === stableStringify(b)) return;
    if (aPresent && bPresent && object(a) && object(b)) {
      for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
        visit(a[key], b[key], path + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1'),
          Object.hasOwn(a, key), Object.hasOwn(b, key));
      }
      return;
    }
    changes.push({ path, beforePresent: aPresent, afterPresent: bPresent,
      before: aPresent ? cloneSerializable(a) : null,
      after: bPresent ? cloneSerializable(b) : null });
  };
  visit(before, after, '', true, true);
  return changes;
}

function rootsOf(row: NetworkSpeechRecord): string[] | null {
  if (row.spoken.kind !== 'field-report') return null;
  const roots = row.reportRoots;
  if (roots === undefined || roots.length !== row.spoken.items.length
    || new Set(roots).size !== roots.length) return null;
  return [...roots];
}

/**
 * Terminal-only model: retain every actual network copy, even when its live packet
 * is unavailable in a legacy save. Never turn a scheduled route into a speaking event.
 * Generic copy changes are descriptive; different onwardTo values are not called lies.
 */
export function networkThreads(world: WorldState): NetworkThread[] {
  const packets = new Map((world.network.directiveState?.messages ?? []).map((row) => [row.id, row]));
  const speeches = new Map<string, { row: NetworkSpeechRecord; index: number }[]>();
  world.chronicle.forEach((row, index) => {
    if (row.kind !== 'network-speech') return;
    const group = speeches.get(row.messageId) ?? [];
    group.push({ row, index });
    speeches.set(row.messageId, group);
  });
  const result: NetworkThread[] = [];
  for (const id of new Set([...packets.keys(), ...speeches.keys()])) {
    const packet = packets.get(id);
    const rows = [...(speeches.get(id) ?? [])].sort((a, b) => a.row.tick - b.row.tick || a.index - b.index);
    const stages: NetworkThreadStage[] = [];
    for (const { row, index } of rows) {
      const previous = stages.at(-1);
      const roots = rootsOf(row);
      const omitted = roots !== null && previous?.reportRoots !== null && previous?.reportRoots !== undefined
        ? previous.reportRoots.filter((root) => !roots.includes(root)) : null;
      stages.push({ chronicleIndex: index, tick: row.tick, venue: row.venue,
        speaker: row.speaker, addressedTo: row.addressedTo, heardBy: cloneSerializable(row.heardBy),
        copy: cloneSerializable(row.spoken),
        changes: previous === undefined ? null : spokenCopyChanges(previous.copy, row.spoken),
        reportRoots: roots, omittedRoots: omitted });
    }
    result.push({ kind: 'network', id: 'network:' + id, messageId: id,
      principal: packet?.principal ?? null, createdAt: packet?.createdAt ?? null,
      origin: packet?.origin ?? null, plannedRoute: packet ? [...packet.route] : null,
      carriedCopy: packet ? cloneSerializable(packet.payload) : null,
      transport: !packet ? 'unrecorded' : packet.deliveredAt !== null ? 'delivered'
        : packet.failedAt !== null ? 'failed' : 'in-transit',
      transportAt: packet?.deliveredAt ?? packet?.failedAt ?? null, stages });
  }
  return result.sort((a, b) => (a.createdAt ?? a.stages[0]?.tick ?? 0)
    - (b.createdAt ?? b.stages[0]?.tick ?? 0) || a.messageId.localeCompare(b.messageId));
}
