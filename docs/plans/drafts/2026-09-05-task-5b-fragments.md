# Partial Task5B model fragments — not an executable full plan

Authored-by: root Codex GPT-6, 2026-09-05. Actual production remains dc114da.
These fragments do not implement the full debrief. All operation families, semantic
overlay, terminal composition and independent review remain open. Preserve actual
predecessor changes; never install a frozen whole-file snapshot over later work.

Knowledge chronology uses Task5A1 and the exact planned Task3 provenance module/type
in memory: ten native cases, both compiler configurations and lint pass. Unknown
legacy arrival dates stay unknown. Original board append order is preserved.

Network history uses Task5A1 in memory: fourteen native cases, both compilers and
lint pass, including actual two-hop reports and addressed/overheard audience records.
Each speaking event retains its actual tick; a planned route invents no events.
Missing/malformed root links stay unknown; explicit empty copies prove known omissions.
Generic copy differences are descriptive, not automatic claims that a speaker lied.

The initial thirteen-case synthetic pass used an incorrect string-array audience.
Source inspection caught it before acceptance; final code retains the actual
{id,addressed} shape, deep-copies nested audience objects, tests their isolation and
adds a real transport-pipeline case. The initial log is retained. These are author
probes, not independent review or a production RED/GREEN sequence for new modules.

## Knowledge module (src/sim/debrief/knowledge.ts)

```ts
import type { Tick } from '../../core/time';
import type { IntelEntry } from '../../intel/entry';
import { sourceOf } from '../../intel/provenance';
import type { ReportedFieldObservation } from '../directives/types';
import { cloneSerializable, stableStringify } from '../hash';
import type { WorldState } from '../types';

/** When a specific recorded board row actually reached the player. */
export interface CounterKnowledge {
  entryIndex: number;
  learnedAt: Tick | null;
  messageId: string | null;
  /** An unknown receipt remains visible at the terminal, but never backdates into a calendar. */
  timing: 'direct' | 'report' | 'unrecorded';
}

type CounterEntry = Pick<IntelEntry, 'kind' | 'tick' | 'venue' | 'via' | 'overheard'
  | 'speaker' | 'addressedTo' | 'mode' | 'authority' | 'claimId' | 'family'
  | 'reported' | 'about' | 'actor'>;

function key(row: CounterEntry): string {
  return stableStringify([row.kind, row.tick, row.venue, row.via, row.overheard,
    row.speaker, row.addressedTo, row.mode, row.authority, row.claimId, row.family,
    row.reported, row.about, row.actor]);
}

/** Exact counter-relevant part of ingestPlayerItem's existing projection. No trait reapplication. */
function reportedKey(observation: ReportedFieldObservation, via: string): string | null {
  const base = { tick: observation.observedAt, venue: observation.venue, via,
    overheard: true, speaker: null, addressedTo: null, mode: null, authority: false,
    claimId: null, family: null, reported: null, about: null, actor: null };
  if (observation.kind === 'utterance') return key({ ...base, kind: 'utterance',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    mode: observation.mode, claimId: observation.claimId, family: observation.family,
    reported: observation.reported });
  if (observation.kind === 'asking') return key({ ...base, kind: 'asking',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    authority: observation.authority, about: observation.about,
    family: 'family' in observation.about ? observation.about.family : null });
  if (observation.kind === 'presence') return key({ ...base, kind: 'presence', actor: observation.actor });
  return null;
}

/**
 * Reconstruct board arrival times from the speeches the avatar actually heard, including
 * overheard reports and their own transmissions. A report need not have finished its route.
 * Repeated identical rows consume repeated receipt occurrences, preserving multiplicity.
 * This associates equivalent board rows with receipt dates, not hidden causal root identities.
 * Task 5A's explicit roots, separately, identify per-item mutation paths.
 */
export function counterKnowledge(world: WorldState): CounterKnowledge[] {
  const receipts = new Map<string, { tick: Tick; messageId: string }[]>();
  const avatar = world.playerId;
  if (avatar !== null) for (const row of world.chronicle) {
    if (row.kind !== 'network-speech' || row.spoken.kind !== 'field-report') continue;
    if (row.speaker !== avatar && !row.heardBy.some((hearer) => hearer.id === avatar)) continue;
    for (const item of row.spoken.items) {
      const fingerprint = reportedKey(item.observation, row.speaker);
      if (fingerprint === null) continue;
      const list = receipts.get(fingerprint) ?? [];
      list.push({ tick: row.tick, messageId: row.messageId });
      receipts.set(fingerprint, list);
    }
  }
  const consumed = new Map<string, number>();
  const knowledge: CounterKnowledge[] = [];
  world.intel.log.forEach((entry, entryIndex) => {
    if (entry.kind !== 'utterance' && entry.kind !== 'asking' && entry.kind !== 'presence') return;
    if (sourceOf(entry).kind !== 'informant') {
      knowledge.push({ entryIndex, learnedAt: entry.tick, messageId: null, timing: 'direct' });
      return;
    }
    const fingerprint = key(entry);
    const offset = consumed.get(fingerprint) ?? 0;
    const receipt = receipts.get(fingerprint)?.[offset];
    if (receipt === undefined) {
      knowledge.push({ entryIndex, learnedAt: null, messageId: null, timing: 'unrecorded' });
      return;
    }
    consumed.set(fingerprint, offset + 1);
    knowledge.push({ entryIndex, learnedAt: receipt.tick, messageId: receipt.messageId, timing: 'report' });
  });
  return knowledge;
}

/** Retain the real board's append order; counterSignals depends on earlier askings. */
export function counterLogThrough(world: WorldState, through: Tick): IntelEntry[] {
  const knowledge = counterKnowledge(world);
  return knowledge.filter((row) => row.learnedAt !== null && row.learnedAt <= through)
    .map((row) => cloneSerializable(world.intel.log[row.entryIndex]!));
}
```

## Knowledge tests

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import type { IntelEntry } from '../../src/intel/entry';
import { counterSignals } from '../../src/intel/countersketch';
import { counterKnowledge, counterLogThrough } from '../../src/sim/debrief/knowledge';
import { blankIntel } from '../../src/sim/fieldwork';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { runUntil } from '../../src/sim/step';
import type { NetworkSpeechRecord } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const asking = (over: Partial<IntelEntry> = {}): IntelEntry => ({
  ...blankIntel(), tick: 0, venue: 'square', via: 'ada', kind: 'asking', overheard: false,
  speaker: 'bez', addressedTo: 'ada', authority: true, about: { subject: 'ada' }, ...over,
});
const receipt = (tick: number, messageId = 'm0', over: Partial<NetworkSpeechRecord> = {}): NetworkSpeechRecord => ({
  kind: 'network-speech', tick, venue: 'backroom', speaker: 'ada', addressedTo: 'you',
  messageId, cause: null, heardBy: [{ id: 'you', addressed: true }], spoken: {
    kind: 'field-report', onwardTo: null, items: [{ factRefs: [], observation: {
      kind: 'asking', observedAt: 0, venue: 'square', speaker: 'bez', addressedTo: 'ada',
      overheard: false, authority: true, about: { subject: 'ada' },
    } }],
  }, ...over,
});

function world() {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of fixture.npcs) { npc.traits = []; npc.edges = []; }
  const value = buildWorld(fixture, 'debrief-knowledge', RULES);
  enrollPlayer(value, { home: 'backroom' });
  value.enemy.observers = [];
  return value;
}

describe('the debrief calendar uses receipt time without changing board order', () => {
  it('a day-two report does not put day-zero questioning on the earlier board', () => {
    const value = world();
    value.intel.log.push(asking());
    value.chronicle.push(receipt(2880));
    expect(counterKnowledge(value)).toEqual([{ entryIndex: 0, learnedAt: 2880, messageId: 'm0', timing: 'report' }]);
    expect(counterSignals(counterLogThrough(value, 2879))).toEqual([]);
    expect(counterSignals(counterLogThrough(value, 2880))).toMatchObject([{ kind: 'questioning' }]);
    expect(value.intel.log[0]!.tick).toBe(0);
  });

  it('duplicate content consumes duplicate arrivals, not the earliest date twice', () => {
    const value = world();
    value.intel.log.push(asking(), asking(), asking());
    value.chronicle.push(receipt(1440, 'm1'), receipt(4320, 'm2'));
    expect(counterKnowledge(value).map((row) => row.learnedAt)).toEqual([1440, 4320, null]);
    expect(counterLogThrough(value, 2879)).toHaveLength(1);
    expect(counterLogThrough(value, 5000)).toHaveLength(2);
  });

  it('an overheard intermediate report counts before its route finishes', () => {
    const value = world();
    value.intel.log.push(asking());
    const row = receipt(15, 'm0', { addressedTo: 'bez', heardBy: [{ id: 'you', addressed: false }] });
    if (row.spoken.kind !== 'field-report') throw new Error('missing report');
    row.spoken.onwardTo = 'someone-else';
    value.chronicle.push(row);
    expect(counterKnowledge(value)[0]).toMatchObject({ learnedAt: 15, timing: 'report' });
  });

  it('an unheard packet does not date an unexplained remote row', () => {
    const value = world();
    value.intel.log.push(asking());
    value.chronicle.push(receipt(15, 'm0', { addressedTo: 'bez', heardBy: [{ id: 'bez', addressed: true }] }));
    expect(counterKnowledge(value)[0]).toMatchObject({ learnedAt: null, timing: 'unrecorded' });
  });

  it('self and dossier observations are immediate, while magic uses explicit provenance', () => {
    const value = world();
    value.intel.log.push(asking({ via: 'self', tick: 15 }), asking({ via: 'dossier', tick: 30 }),
      asking({ via: 'scrying', tick: 45, provenance: { kind: 'magic', spell: 'scrying', operation: 's0' } }),
      asking({ via: 'scrying', tick: 60 }));
    expect(counterKnowledge(value).map((row) => row.learnedAt)).toEqual([15, 30, 45, null]);
  });

  it('a player transmission is known even though speakers do not appear in heardBy', () => {
    const value = world();
    value.intel.log.push(asking({ via: 'you' }));
    value.chronicle.push(receipt(15, 'm0', { speaker: 'you', addressedTo: 'bez', heardBy: [] }));
    expect(counterKnowledge(value)[0]).toMatchObject({ learnedAt: 15, timing: 'report' });
  });

  it('retains arrival append order so a late authority report does not retroactively compel an earlier row', () => {
    const value = world();
    value.intel.log.push(asking({ via: 'self', tick: 30, kind: 'utterance', mode: 'answer',
      speaker: 'ada', addressedTo: 'bez', authority: false, about: null }), asking());
    value.chronicle.push(receipt(1440));
    expect(counterLogThrough(value, 1440)).toEqual(value.intel.log);
    expect(counterSignals(counterLogThrough(value, 1440)).map((signal) => signal.kind)).toEqual(['questioning']);
  });

  it('matches the carried reported copy rather than the raw original words', () => {
    const value = world();
    const wrong = asking({ about: { subject: 'you' } });
    value.intel.log.push(wrong, asking());
    value.chronicle.push(receipt(15));
    expect(counterKnowledge(value).map((row) => row.learnedAt)).toEqual([null, 15]);
  });

  it('a real delayed physical receipt retains observation time in intel and arrival time in the calendar', () => {
    const value = world();
    holdFieldObservation(value, 'player', 'ada', { kind: 'raw', observation: {
      kind: 'asking', tick: 0, venue: 'square', speaker: 'bez', addressedTo: 'ada',
      about: { subject: 'ada' }, overheard: false, authority: true,
    } }, null, ['you'], null, []);
    queueUnqueuedFieldReports(value);
    runUntil(value, 1440, RULES);
    expect(value.intel.log).toEqual([]);
    value.playerVenue = 'square';
    runUntil(value, 1441, RULES);
    const known = counterKnowledge(value);
    expect(known).toEqual([{ entryIndex: 0, learnedAt: 1440, messageId: 'm0', timing: 'report' }]);
    expect(value.intel.log[0]!.tick).toBe(0);
    expect(counterLogThrough(value, 1439)).toEqual([]);
  });

  it('the fold is deterministic and leaves source state unchanged', () => {
    const value = world();
    value.intel.log.push(asking()); value.chronicle.push(receipt(15));
    const before = hashWorld(value);
    expect(counterKnowledge(value)).toEqual(counterKnowledge(cloneSerializable(value)));
    counterLogThrough(value, 15)[0]!.about = { subject: 'caller-mutated' };
    expect(hashWorld(value)).toBe(before);
  });
});
```

## Network module (src/sim/debrief/network.ts)

```ts
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
```

## Network tests

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { networkThreads, spokenCopyChanges } from '../../src/sim/debrief/network';
import { allocateNetworkMessage, ensureDirectiveState } from '../../src/sim/directives/state';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import type { SpokenNetworkPayload } from '../../src/sim/directives/types';
import { hashWorld } from '../../src/sim/hash';
import type { NetworkSpeechRecord } from '../../src/sim/types';
import { runUntil } from '../../src/sim/step';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const report = (roots: string[]): Extract<SpokenNetworkPayload, { kind: 'field-report' }> => ({
  kind: 'field-report', onwardTo: null,
  items: roots.map((id) => ({ observation: { kind: 'presence', observedAt: 3,
    venue: 'square', actor: id }, factRefs: [] })),
});
function speech(messageId: string, tick: number, roots?: string[]): NetworkSpeechRecord {
  return { kind: 'network-speech', tick, venue: 'square', speaker: 'ada', addressedTo: 'bez',
    heardBy: [{ id: 'bez', addressed: true }, { id: 'cyn', addressed: false }],
    messageId, spoken: report(roots ?? ['unlinked']), cause: null,
    ...(roots === undefined ? {} : { reportRoots: [...roots] }) };
}
const fixture = () => buildWorld(miniTown(), 'network-debrief-thread', RULES);

describe('network debrief threads retain actual speaking history', () => {
  it('leaves an untouched world untouched and returns no invented operations', () => {
    const world = fixture(); const before = hashWorld(world);
    expect(networkThreads(world)).toEqual([]);
    expect(hashWorld(world)).toBe(before);
    expect(world.network.directiveState).toBeUndefined();
  });

  it('a queued route has no invented stage or receipt', () => {
    const world = fixture();
    allocateNetworkMessage(world, 'player', 'ada', ['bez', 'cyn'],
      { kind: 'invitation-response', invitationId: 'i0', response: 'accept' }, 15, null, null);
    expect(networkThreads(world)[0]).toMatchObject({ plannedRoute: ['bez', 'cyn'],
      transport: 'in-transit', transportAt: null, stages: [] });
  });

  it('keeps orphan legacy speech with unknown transport metadata', () => {
    const world = fixture(); world.chronicle.push(speech('missing', 30));
    expect(networkThreads(world)[0]).toMatchObject({ messageId: 'missing', principal: null,
      createdAt: null, origin: null, plannedRoute: null, carriedCopy: null,
      transport: 'unrecorded', transportAt: null,
      stages: [{ tick: 30, heardBy: [{ id: 'bez', addressed: true }, { id: 'cyn', addressed: false }],
        reportRoots: null, changes: null }] });
  });

  it('distinguishes actual failed delivery from an untraversed planned leg', () => {
    const world = fixture(); const state = ensureDirectiveState(world);
    const id = allocateNetworkMessage(world, 'enemy', 'ada', ['bez', 'cyn'],
      { kind: 'invitation-response', invitationId: 'i0', response: 'refuse' }, 15, null, null);
    state.messages[0]!.failedAt = 60;
    world.chronicle.push(speech(id, 15, ['r0']));
    expect(networkThreads(world)[0]).toMatchObject({ transport: 'failed', transportAt: 60,
      plannedRoute: ['bez', 'cyn'], stages: [{ tick: 15 }] });
    expect(networkThreads(world)[0]!.stages).toHaveLength(1);
  });

  it('uses the actual transmission tick instead of a reported observation date', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 1440, ['r0']));
    const stage = networkThreads(world)[0]!.stages[0]!;
    expect(stage.tick).toBe(1440);
    expect(stage.copy).toMatchObject({ items: [{ observation: { observedAt: 3 } }] });
  });

  it('orders equal-tick copies by original chronicle position and preserves identical occurrences', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 45, ['r0']), speech('m0', 30, ['r0']), speech('m0', 30, ['r0']));
    expect(networkThreads(world)[0]!.stages.map((row) => row.chronicleIndex)).toEqual([1, 2, 0]);
    expect(networkThreads(world)[0]!.stages[1]!.changes).toEqual([]);
  });

  it('identifies omitted roots without guessing from shifted item positions', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 15, ['r0', 'r1']), speech('m0', 30, ['r1']));
    const stages = networkThreads(world)[0]!.stages;
    expect(stages[1]!.reportRoots).toEqual(['r1']);
    expect(stages[1]!.omittedRoots).toEqual(['r0']);
    expect(stages[1]!.copy).toEqual(report(['r1']));
  });

  it('an explicitly empty spoken report proves omission of its prior known items', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 15, ['r0']), speech('m0', 30, []));
    expect(networkThreads(world)[0]!.stages[1]).toMatchObject({ reportRoots: [], omittedRoots: ['r0'] });
  });

  it.each(['missing', 'wrong-count', 'duplicate'] as const)('keeps %s association unknown rather than inventing an item match', (kind) => {
    const world = fixture(); const row = speech('m0', 30, ['r0', 'r1']);
    if (kind === 'missing') delete row.reportRoots;
    if (kind === 'wrong-count') row.reportRoots = ['r0'];
    if (kind === 'duplicate') row.reportRoots = ['r0', 'r0'];
    world.chronicle.push(speech('m0', 15, ['r0']), row, speech('m0', 45, []));
    const stages = networkThreads(world)[0]!.stages;
    expect(stages[1]!.reportRoots).toBeNull();
    expect(stages[1]!.omittedRoots).toBeNull();
    expect(stages[2]!.omittedRoots).toBeNull();
    expect(stages[1]!.copy).toEqual(row.spoken);
  });

  it('returns deep-owned copies without changing the source or shared audiences', () => {
    const world = fixture(); world.chronicle.push(speech('m0', 15, ['r0']), speech('m0', 30, []));
    const before = hashWorld(world); const threads = networkThreads(world);
    threads[0]!.stages[0]!.heardBy[0]!.id = 'changed';
    threads[0]!.stages[0]!.reportRoots!.push('changed');
    threads[0]!.stages[0]!.copy.onwardTo = 'elsewhere';
    const diff = threads[0]!.stages[1]!.changes!.find((row) => row.path === '/items')!;
    (diff.before as unknown[]).length = 0;
    expect(hashWorld(world)).toBe(before);
    expect(threads[0]!.stages[0]!.copy).toMatchObject({ items: [{ observation: { actor: 'r0' } }] });
  });

  it('describes nested copy changes without calling every changed field a lie', () => {
    const before: SpokenNetworkPayload = { kind: 'directive-response', directiveId: 'd0',
      response: 'refuse', onwardTo: 'cyn', report: null };
    const after = { ...before, onwardTo: null, response: 'attempt' as const };
    expect(spokenCopyChanges(before, after)).toEqual([
      { path: '/onwardTo', beforePresent: true, afterPresent: true, before: 'cyn', after: null },
      { path: '/response', beforePresent: true, afterPresent: true, before: 'refuse', after: 'attempt' },
    ]);
  });

  it('reads real two-hop field-report speech with stable roots and an actual addressed audience', () => {
    const town = miniTown();
    town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
    for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
    const world = buildWorld(town, 'real-network-debrief', RULES);
    enrollPlayer(world, { home: 'square' });
    world.playerVenue = 'backroom';
    world.enemy.observers = [];
    world.npcs.bez!.schedule = [
      { days: 'all', from: 0, to: 30, venue: 'square' },
      { days: 'all', from: 30, to: 1439, venue: 'backroom' },
    ];
    holdFieldObservation(world, 'player', 'ada', { kind: 'raw', observation: {
      kind: 'presence', tick: 0, venue: 'square', actor: 'bez',
    } }, null, ['bez', 'you'], null, []);
    queueUnqueuedFieldReports(world);
    const held = world.network.directiveState!.heldObservations[0]!;
    const id = held.queuedIn!;
    expect(id).not.toBeNull();
    world.tick = 15;
    runUntil(world, 31, RULES);
    const thread = networkThreads(world).find((row) => row.messageId === id)!;
    expect(thread.transport).toBe('delivered');
    expect(thread.transportAt).toBe(30);
    expect(thread.stages.map((row) => row.tick)).toEqual([15, 30]);
    expect(thread.stages.map((row) => row.reportRoots)).toEqual([[held.rootFingerprint], [held.rootFingerprint]]);
    expect(thread.stages[1]!.heardBy).toContainEqual({ id: 'you', addressed: true });
    expect(thread.stages[1]!.omittedRoots).toEqual([]);
  });
});
```

## Expanded checkpoint: six partial modules, 62 isolated cases

This continuation adds directive histories, actual nightly digests, ordinary enemy
evidence arrival and semantic attention. Test counts are 10 knowledge +14 network
+11 directive/timeline +9 evidence arrival +18 attention =62. Both compiler
configurations, virtual lint and literal workspace lint pass. Full transport and
watch execution probes use virtual Task5A1/5A2 and common R16/R17 predecessors;
these dependencies are proposals, not implemented features.

The source snapshot is production dc114da with explicitly composed metadata and
provenance additions. Task5A1 report roots are preserved when Task5A2 adds private
outcomes. This is still not an executable complete Task5B plan. Remaining work:
story/artifact/magic operation folds, magic physical receipt branches, exact
evidence-to-feature linkage, calendar composition, terminal-only view and independent
review. Current evidence code intentionally covers legacy speech variants only;
the future magic union expansion requires explicit reconciliation, not a cast.

Semantic matching keeps performed attention distinct from authored orders and
headquarters' returned accounts. Repeated views of one asking or one guard/post/night
episode do not create extra actions. Watch matching corroborates a work episode in
the watch window, not continuous staffing or the truth of every reported minute.
Absent history remains unavailable. Signal indexes refer to the original log after
receipt filtering; player-authored cards remain ungraded.

The engine's actual compulsion rule requires authority and an invitational venue.
The player's broader inferred compelled-answer signal remains unchanged. The model
requires an actual same-beat authority asking and answer at an invitational venue
before corroborating compulsion. It uses no feature-count distance or key/id equality.

The evidence fold follows the real append structure: directly heard report envelope
then contiguous projected evidence children. It preserves multiplicity and does not
recursively ingest a nested envelope that was only described. Missing legacy speech
or a mismatched child batch stays undated. Physical magic receipts remain a named gap.

Author preflight caught an unused test destructure and a missing required overheard
field in a new fixture. The latter produced one compiler diagnostic and a real
stableStringify failure (61/62). Exact fixture corrections yielded62/62 and clean
compiler/lint checks. No simulation mechanism or previous expectation was weakened.
Raw failed and final logs are retained in task-5b-attention-validation.

## Directive histories module (src/sim/debrief/directives.ts)

```ts
import type { BriefVersion, DirectiveOutcomeRecord, DirectiveRecord, NetworkPayload } from '../directives/types';
import type { Principal } from '../network/types';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';
import { networkThreads, type NetworkThread } from './network';

/** Private terminal history; no part of this reader is a live directive-desk selector. */
export interface DirectiveThread {
  kind: 'directive';
  id: string;
  directiveId: string;
  principal: Principal;
  principalId: string;
  recipient: string;
  issuedAt: number;
  authoredCopy: BriefVersion;
  deliveredCopy: DirectiveRecord['received'];
  latestRun: DirectiveRecord['execution'];
  /** Null means history was not recorded, never that no work occurred. */
  localResults: DirectiveOutcomeRecord[] | null;
  /** These are returned accounts, which can differ from the local results. */
  returnedAccounts: DirectiveRecord['receivedReports'];
  messageIds: string[];
}

/** Association metadata joins operations; this function does not feed an NPC's knowledge. */
function directiveOf(world: WorldState, payload: NetworkPayload): string | null {
  switch (payload.kind) {
    case 'directive': return payload.version.directiveId;
    case 'directive-report': case 'directive-response': return payload.directiveId;
    case 'handler-brief': case 'field-report': return payload.sourceDirectiveId;
    case 'invitation': case 'invitation-response':
      return world.network.invitations?.find((row) => row.id === payload.invitationId)?.sourceDirectiveId ?? null;
    case 'recruitment-approach': case 'recruitment-response':
      return world.network.directiveState?.recruitmentApproaches
        .find((row) => row.id === payload.approachId)?.sourceDirectiveId ?? null;
    case 'compartment-fact': case 'sketch-tip': return null;
  }
}

/** Build network history once, and link exact packet identities rather than similar prose. */
export function directiveHistories(world: WorldState): { directives: DirectiveThread[]; messages: NetworkThread[] } {
  const messages = networkThreads(world);
  const linked = new Map<string, Set<string>>();
  const link = (directiveId: string, messageId: string): void => {
    const group = linked.get(directiveId) ?? new Set<string>();
    group.add(messageId); linked.set(directiveId, group);
  };
  for (const message of world.network.directiveState?.messages ?? []) {
    const directiveId = directiveOf(world, message.payload);
    if (directiveId !== null) link(directiveId, message.id);
  }
  // Orphaned legacy speech can still explicitly name its directive. A handler copy
  // or unrelated packet with no retained association remains in the messages list.
  for (const message of messages) for (const stage of message.stages) {
    if (stage.copy.kind === 'directive' || stage.copy.kind === 'directive-report'
      || stage.copy.kind === 'directive-response') link(stage.copy.directiveId, message.messageId);
  }
  const directives = (world.network.directiveState?.records ?? []).map((record): DirectiveThread => {
    const ids = new Set(linked.get(record.id) ?? []);
    if (record.received) ids.add(record.received.messageId);
    for (const row of record.outcomes ?? []) if (row.reportMessageId !== null) ids.add(row.reportMessageId);
    return { kind: 'directive', id: 'directive:' + record.id, directiveId: record.id,
      principal: record.principal, principalId: record.principalId, recipient: record.recipient,
      issuedAt: record.issuedAt, authoredCopy: cloneSerializable(record.authored),
      deliveredCopy: cloneSerializable(record.received), latestRun: cloneSerializable(record.execution),
      localResults: record.outcomes === undefined ? null : cloneSerializable(record.outcomes),
      returnedAccounts: cloneSerializable(record.receivedReports), messageIds: [...ids].sort() };
  }).sort((a, b) => a.issuedAt - b.issuedAt || a.directiveId.localeCompare(b.directiveId));
  return { directives, messages };
}
```

## Nightly sketch module (src/sim/debrief/timeline.ts)

```ts
import type { SketchFeature } from '../enemy/state';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';

export interface SketchNight {
  day: number;
  added: SketchFeature[];
  known: SketchFeature[];
  identified: boolean;
  identifiedOnDay: number | null;
}

/**
 * Actual completed digests, not a reconstruction from old observation ticks.
 * Identification uses the existing avatar carrier-profile rule. No feature-count
 * distance or historical exposure score is invented from today's informant roster.
 */
export function sketchTimeline(world: WorldState): { nights: SketchNight[]; unrecorded: SketchFeature[] } {
  const days = new Map<number, SketchFeature[]>();
  for (const decision of world.enemy.decisions) {
    const additions = days.get(decision.day) ?? [];
    additions.push(...decision.features); days.set(decision.day, additions);
  }
  const known = new Map<string, SketchFeature>();
  const nights: SketchNight[] = [];
  let identifiedOnDay: number | null = null;
  for (const [day, features] of [...days].sort(([a], [b]) => a - b)) {
    const added: SketchFeature[] = [];
    for (const feature of features) {
      if (known.has(feature.id)) continue;
      known.set(feature.id, feature); added.push(cloneSerializable(feature));
      if (identifiedOnDay === null && world.playerId !== null
        && feature.kind === 'carrier-profile' && feature.subject === world.playerId) identifiedOnDay = day;
    }
    nights.push({ day, added, known: [...known.values()].map(cloneSerializable),
      identified: identifiedOnDay !== null, identifiedOnDay });
  }
  return { nights, unrecorded: world.enemy.sketch.filter((feature) => !known.has(feature.id)).map(cloneSerializable) };
}
```

## Directive and nightly sketch tests

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { directiveHistories } from '../../src/sim/debrief/directives';
import { sketchTimeline } from '../../src/sim/debrief/timeline';
import { issueDirectiveRecord, allocateNetworkMessage } from '../../src/sim/directives/state';
import { queueDirectiveReport } from '../../src/sim/directives/reports';
import type { DirectiveDecisionProfile, DirectiveExecutionResult } from '../../src/sim/directives/types';
import type { SketchFeature } from '../../src/sim/enemy/state';
import { hashWorld } from '../../src/sim/hash';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const world = buildWorld(miniTown(), 'directive-debrief', RULES);
  enrollPlayer(world, { home: 'square' });
  const record = issueDirectiveRecord(world, {
    principal: 'player', principalId: 'you', recipient: 'ada',
    handoff: { outboundVia: [], reportVia: [] }, tick: 0, cause: null,
    brief: { mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
      priority: 'routine', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: 0, until: 120 }, report: 'full', reportBy: 120, purpose: null },
  });
  return { world, record };
}
const result: DirectiveExecutionResult = { outcome: 'observed', reason: 'shared venue',
  evidence: [{ kind: 'observation', text: 'presence:bez:square:15' }], source: 'ada',
  uncertainty: 'low', reportedClaim: null, factRefs: [] };

describe('directive histories distinguish stages and copies', () => {
  it('does not pretend an issued order was received or performed', () => {
    const { world, record } = fixture();
    const model = directiveHistories(world);
    expect(model.directives[0]).toMatchObject({ directiveId: record.id, deliveredCopy: null,
      latestRun: null, localResults: null, returnedAccounts: [] });
    expect(model.messages[0]!.stages).toEqual([]);
    expect(model.directives[0]!.messageIds).toEqual([model.messages[0]!.messageId]);
  });

  it('keeps altered receipt and reported outcome separate from authorship and raw work', () => {
    const { world, record } = fixture();
    record.received = { tick: 15, version: structuredClone(record.authored), handoffFrom: 'bez', messageId: 'm-received' };
    record.received.version.brief.purpose = 'altered';
    record.outcomes = [{ tick: 30, result: structuredClone(result), reportMessageId: 'm-report' }];
    record.receivedReports.push({ receivedAt: 60, via: 'bez', report: {
      outcome: 'claimed something else', reason: null, evidence: null, source: null, uncertainty: null,
    } });
    const model = directiveHistories(world).directives[0]!;
    expect(model.authoredCopy.brief.purpose).toBeNull();
    expect(model.deliveredCopy!.version.brief.purpose).toBe('altered');
    expect(model.localResults![0]!.result.outcome).toBe('observed');
    expect(model.returnedAccounts[0]!.report.outcome).toBe('claimed something else');
    expect(model.messageIds).toContain('m-received');
    expect(model.messageIds).toContain('m-report');
  });

  it('links an actual queued report once even when both metadata paths name it', () => {
    const { world, record } = fixture();
    record.received = { tick: 0, version: structuredClone(record.authored), handoffFrom: 'you', messageId: 'm0' };
    const profile: DirectiveDecisionProfile = {
      interpretation: record.authored.brief.mission, commitment: 'attempt', initiative: 'literal',
      risk: 'measured', method: { kind: 'observe', target: { kind: 'person', id: 'bez' } },
      timing: { actAt: 15, reportAt: 30 }, candor: 'ordinary',
      disclosure: { outcome: true, reason: true, evidence: true, source: true, uncertainty: true },
    };
    const id = queueDirectiveReport(world, record, profile, result, RULES, 15)!;
    expect(directiveHistories(world).directives[0]!.messageIds.filter((value) => value === id)).toEqual([id]);
  });

  it('retains unrelated network operations without falsely attributing them to the directive', () => {
    const { world } = fixture();
    const id = allocateNetworkMessage(world, 'enemy', 'bez', ['ada'],
      { kind: 'sketch-tip', principal: 'enemy', asset: 'bez', featureId: 'sf0', subject: null, detail: 'tip' }, 15, null, null);
    const model = directiveHistories(world);
    expect(model.messages.some((row) => row.messageId === id)).toBe(true);
    expect(model.directives[0]!.messageIds).not.toContain(id);
  });

  it('all nested directive model data is detached and absent histories stay absent', () => {
    const { world, record } = fixture();
    record.outcomes = [{ tick: 15, result: structuredClone(result), reportMessageId: null }];
    const before = hashWorld(world); const model = directiveHistories(world);
    model.directives[0]!.authoredCopy.brief.active.until = 999;
    model.directives[0]!.localResults![0]!.result.evidence[0]!.text = 'changed';
    expect(hashWorld(world)).toBe(before);
  });
});

function feature(id: string, day: number, kind: SketchFeature['kind'] = 'origin-vague', subject: string | null = 'you'): SketchFeature {
  return { id, kind, day, family: 'f0', subject, district: 'd0', detail: id,
    evidence: [{ tick: 1, observer: 'ada', claimId: 'c0', messageId: null }] };
}
describe('the nightly sketch is the actual digest record', () => {
  it('does not invent a digest from empty state', () => {
    const { world } = fixture(); const before = hashWorld(world);
    expect(sketchTimeline(world)).toEqual({ nights: [], unrecorded: [] });
    expect(hashWorld(world)).toBe(before);
  });

  it('keeps late learned features on the digest day despite an old observation tick', () => {
    const { world } = fixture(); const f = feature('sf0', 3);
    world.enemy.decisions.push({ day: 3, features: [f], inquiries: [], interrogations: [], watches: [] });
    world.enemy.sketch.push(f);
    expect(sketchTimeline(world).nights.map((night) => night.day)).toEqual([3]);
    expect(sketchTimeline(world).nights[0]!.known[0]!.evidence[0]!.tick).toBe(1);
  });

  it('many unrelated or other-person features do not become avatar identification', () => {
    const { world } = fixture();
    const features = Array.from({ length: 20 }, (_, i) => feature('sf' + i, 0));
    features.push(feature('sf-other', 0, 'carrier-profile', 'ada'));
    world.enemy.decisions.push({ day: 0, features, inquiries: [], interrogations: [], watches: [] });
    expect(sketchTimeline(world).nights[0]).toMatchObject({ identified: false, identifiedOnDay: null });
  });

  it('identifies only when the actual avatar carrier-profile enters a completed digest', () => {
    const { world } = fixture();
    world.enemy.decisions.push({ day: 1, features: [], inquiries: [], interrogations: [], watches: [] },
      { day: 2, features: [feature('sf-face', 2, 'carrier-profile')], inquiries: [], interrogations: [], watches: [] },
      { day: 3, features: [], inquiries: [], interrogations: [], watches: [] });
    expect(sketchTimeline(world).nights.map((night) => [night.day, night.identified, night.identifiedOnDay])).toEqual([
      [1, false, null], [2, true, 2], [3, true, 2],
    ]);
  });

  it('retains an orphan current feature as unrecorded history rather than guessing a digest', () => {
    const { world } = fixture(); const f = feature('sf-missing', 4); world.enemy.sketch.push(f);
    expect(sketchTimeline(world)).toEqual({ nights: [], unrecorded: [f] });
  });

  it('each night owns its copies independently from earlier nights and the source', () => {
    const { world } = fixture(); const f = feature('sf0', 0);
    world.enemy.decisions.push({ day: 0, features: [f], inquiries: [], interrogations: [], watches: [] },
      { day: 1, features: [], inquiries: [], interrogations: [], watches: [] });
    const before = hashWorld(world); const model = sketchTimeline(world);
    model.nights[1]!.known[0]!.evidence[0]!.observer = 'changed';
    model.nights[0]!.added[0]!.detail = 'changed';
    expect(model.nights[0]!.known[0]).toEqual(f);
    expect(hashWorld(world)).toBe(before);
  });
});
```

## Ordinary evidence arrival module (src/sim/debrief/evidence.ts)

```ts
import type { ReportedFieldObservation } from '../directives/types';
import type { EvidenceEntry } from '../enemy/state';
import { stableStringify } from '../hash';
import type { WorldState } from '../types';

export interface EvidenceArrival {
  evidenceIndex: number;
  observedAt: number;
  learnedAt: number | null;
  reportMessageId: string | null;
  timing: 'direct' | 'report' | 'unrecorded';
}

/** Content used by the legacy utterance/asking/network ingestion branches. */
function key(entry: EvidenceEntry): string {
  return stableStringify([entry.kind, entry.tick, entry.venue, entry.observer,
    entry.overheard, entry.speaker, entry.addressedTo, entry.mode, entry.claimId,
    entry.family, entry.reported, entry.about, entry.kind === 'utterance' && entry.document === true,
    entry.network ? [entry.network.messageId, entry.network.spoken] : null]);
}

function projected(observation: ReportedFieldObservation, observer: string): EvidenceEntry | null {
  const base = { tick: observation.observedAt, venue: observation.venue, observer };
  if (observation.kind === 'utterance') return { ...base, kind: 'utterance',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    mode: observation.mode, claimId: observation.claimId, family: observation.family,
    reported: observation.reported, about: null,
    ...(observation.document === true ? { document: true as const } : {}) };
  if (observation.kind === 'asking') return { ...base, kind: 'asking',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    mode: null, claimId: null, family: 'family' in observation.about ? observation.about.family : null,
    reported: null, about: observation.about };
  if (observation.kind === 'network-speech') return { ...base, kind: 'network',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    mode: null, claimId: null, family: null, reported: null, about: null,
    network: { messageId: observation.messageId, sourceDirectiveId: null, spoken: observation.spoken } };
  return null;
}

/** Does retained physical speech corroborate this direct evidence row? */
function directlyHeard(world: WorldState, entry: EvidenceEntry): boolean {
  return world.chronicle.some((row) => {
    if (row.tick !== entry.tick || !('heardBy' in row) || row.venue !== entry.venue
      || row.speaker !== entry.speaker || row.addressedTo !== entry.addressedTo) return false;
    // Compartment leaks use the leaking asset as evidence observer; the real listener
    // is still headquarters. Ordinary evidence uses the actual observer identity.
    const observer = entry.kind === 'network' && entry.leaked ? world.network.spymaster : entry.observer;
    const heard = observer !== null && (row.heardBy.some((hearer) => hearer.id === observer)
      || (row.kind === 'network-speech' && row.speaker === observer));
    if (!heard) return false;
    if (entry.kind === 'utterance') return row.kind === 'telling' && row.claimId === entry.claimId
      && row.mode === entry.mode;
    if (entry.kind === 'asking') return row.kind === 'asking'
      && stableStringify(row.about) === stableStringify(entry.about);
    return row.kind === 'network-speech' && row.messageId === entry.network.messageId
      && stableStringify(row.spoken) === stableStringify(entry.network.spoken);
  });
}

/**
 * Legacy speech evidence only; physical magic receipt branches are a separate
 * integration requirement. Replay the retained append structure, not an ambiguous
 * global content join: captureEvidence appends the actual heard report first, then
 * ingestEnemyItem appends its projected children consecutively. A reported nested
 * network envelope does not recursively ingest its own contents.
 */
export function evidenceArrivals(world: WorldState): EvidenceArrival[] {
  const arrivals: EvidenceArrival[] = world.enemy.evidence.map((entry, evidenceIndex) => ({
    evidenceIndex, observedAt: entry.tick, learnedAt: null, reportMessageId: null, timing: 'unrecorded',
  }));
  world.enemy.evidence.forEach((entry, index) => {
    if (arrivals[index]!.timing !== 'unrecorded' || !directlyHeard(world, entry)) return;
    arrivals[index] = { ...arrivals[index]!, learnedAt: entry.tick, timing: 'direct' };
    if (entry.kind !== 'network' || entry.network.spoken.kind !== 'field-report') return;
    const children = entry.network.spoken.items.map((item) => projected(item.observation, entry.speaker))
      .filter((child): child is EvidenceEntry => child !== null);
    if (!children.every((child, offset) => {
      const actual = world.enemy.evidence[index + offset + 1];
      return actual !== undefined && key(actual) === key(child);
    })) return;
    children.forEach((_child, offset) => {
      const childIndex = index + offset + 1;
      arrivals[childIndex] = { ...arrivals[childIndex]!, learnedAt: entry.tick,
        reportMessageId: entry.network.messageId, timing: 'report' };
    });
  });
  return arrivals;
}
```

## Evidence arrival tests

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { evidenceArrivals } from '../../src/sim/debrief/evidence';
import { captureEvidence } from '../../src/sim/counterintel';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import type { NetworkSpeech, ReportedFieldObservation } from '../../src/sim/directives/types';
import { hashWorld } from '../../src/sim/hash';
import { runUntil } from '../../src/sim/step';
import { buildWorld } from '../../src/sim/world';
import type { WorldState } from '../../src/sim/types';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  const world = buildWorld(town, 'enemy-arrival', RULES);
  world.network.spymaster = 'bez'; world.enemy.observers = [];
  return world;
}
const asking = (observedAt = 0): ReportedFieldObservation => ({ kind: 'asking', observedAt,
  venue: 'square', speaker: 'ada', addressedTo: 'bez', overheard: false,
  authority: true, about: { subject: 'ada' } });

function report(world: WorldState, tick: number, messageId: string, items: ReportedFieldObservation[]) {
  const speech: NetworkSpeech = { tick, venue: 'square', circleMembers: ['ada', 'bez'],
    speaker: 'ada', addressedTo: 'bez', messageId, cause: null,
    spoken: { kind: 'field-report', onwardTo: null, items: items.map((observation) => ({ observation, factRefs: [] })) } };
  world.chronicle.push({ kind: 'network-speech', tick, venue: speech.venue, speaker: speech.speaker,
    addressedTo: speech.addressedTo, messageId, cause: speech.cause, spoken: speech.spoken,
    heardBy: [{ id: 'bez', addressed: true }] });
  captureEvidence(world, { tick, positions: { ada: 'square', bez: 'square' },
    utterances: [], askings: [], networkSpeeches: [speech] }, RULES);
}

describe('enemy evidence arrival follows the actual ingestion record', () => {
  it('a late report dates its old observed question to actual headquarters receipt', () => {
    const world = fixture(); report(world, 2880, 'm0', [asking()]);
    expect(evidenceArrivals(world)).toEqual([
      { evidenceIndex: 0, observedAt: 2880, learnedAt: 2880, reportMessageId: null, timing: 'direct' },
      { evidenceIndex: 1, observedAt: 0, learnedAt: 2880, reportMessageId: 'm0', timing: 'report' },
    ]);
  });
  it('repeated identical content is associated by each contiguous ingestion batch', () => {
    const world = fixture(); report(world, 1440, 'm0', [asking(), asking()]); report(world, 2880, 'm1', [asking()]);
    expect(evidenceArrivals(world).map((row) => row.learnedAt)).toEqual([1440, 1440, 1440, 2880, 2880]);
    expect(evidenceArrivals(world).map((row) => row.reportMessageId)).toEqual([null, 'm0', 'm0', null, 'm1']);
  });
  it('presence items that do not enter enemy evidence do not shift later associations', () => {
    const world = fixture(); report(world, 1440, 'm0', [
      { kind: 'presence', observedAt: 0, venue: 'square', actor: 'ada' }, asking(),
    ]);
    expect(world.enemy.evidence).toHaveLength(2);
    expect(evidenceArrivals(world)[1]).toMatchObject({ observedAt: 0, learnedAt: 1440, timing: 'report' });
  });
  it('does not recursively ingest a report envelope that was only described by another report', () => {
    const world = fixture(); report(world, 2880, 'outer', [{ kind: 'network-speech',
      observedAt: 15, venue: 'square', speaker: 'ada', addressedTo: 'bez', overheard: false,
      messageId: 'inner', spoken: { kind: 'field-report', onwardTo: null,
        items: [{ observation: asking(), factRefs: [] }] } }]);
    expect(world.enemy.evidence).toHaveLength(2);
    expect(evidenceArrivals(world).map((row) => [row.observedAt, row.learnedAt])).toEqual([[2880, 2880], [15, 2880]]);
  });
  it('does not guess an arrival from an uncorroborated legacy report wrapper', () => {
    const world = fixture(); report(world, 2880, 'm0', [asking()]); world.chronicle = [];
    expect(evidenceArrivals(world).map((row) => row.learnedAt)).toEqual([null, null]);
  });
  it('an incomplete legacy child batch is not silently matched by similar content elsewhere', () => {
    const world = fixture(); report(world, 2880, 'm0', [asking(), asking(15)]);
    world.enemy.evidence.splice(1, 1);
    expect(evidenceArrivals(world).map((row) => row.learnedAt)).toEqual([2880, null]);
  });
  it('keeps directly heard asking time and requires the listener to have heard it', () => {
    const world = fixture();
    const row = { kind: 'asking' as const, tick: 15, venue: 'square', speaker: 'ada',
      addressedTo: 'bez', authority: true, about: { subject: 'ada' }, heardBy: [{ id: 'bez', addressed: true }] };
    world.chronicle.push(row);
    captureEvidence(world, { tick: 15, positions: {}, utterances: [],
      askings: [{ ...row, circleMembers: ['ada', 'bez'] }] }, RULES);
    expect(evidenceArrivals(world)[0]).toMatchObject({ learnedAt: 15, timing: 'direct' });
    row.heardBy = [];
    expect(evidenceArrivals(world)[0]!.learnedAt).toBeNull();
  });
  it('uses a real queued field-report delivery without moving the observation tick', () => {
    const world = fixture();
    holdFieldObservation(world, 'enemy', 'ada', { kind: 'raw', observation: {
      kind: 'asking', tick: 0, venue: 'square', speaker: 'ada', addressedTo: 'bez',
      overheard: false, authority: true, about: { subject: 'ada' },
    } }, null, ['bez'], null, []);
    queueUnqueuedFieldReports(world); world.tick = 15; runUntil(world, 16, RULES);
    const index = world.enemy.evidence.findIndex((entry) => entry.kind === 'asking' && entry.tick === 0);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(evidenceArrivals(world)[index]).toMatchObject({ learnedAt: 15, observedAt: 0, timing: 'report' });
  });
  it('returns independent rows and reads without changing simulation state', () => {
    const world = fixture(); report(world, 1440, 'm0', [asking()]); const before = hashWorld(world);
    const first = evidenceArrivals(world); expect(evidenceArrivals(world)).toEqual(first);
    first[1]!.learnedAt = 99; expect(hashWorld(world)).toBe(before);
    expect(evidenceArrivals(world)[1]!.learnedAt).toBe(1440);
  });
});
```

## Semantic attention module (src/sim/debrief/attention.ts)

```ts
import { dayOf, minuteOfDay } from '../../core/time';
import { counterSignals, type CounterSignal } from '../../intel/countersketch';
import type { IntelEntry } from '../../intel/entry';
import { applicationOf, type DirectiveRecord } from '../directives/types';
import { WATCH } from '../enemy/state';
import { cloneSerializable, stableStringify } from '../hash';
import type { AskingRecord, TellingRecord, WorldState } from '../types';
import { counterKnowledge } from './knowledge';

export interface AttentionMatch {
  id: string;
  kind: CounterSignal['kind'];
  key: string;
  /** Original world.intel.log indexes, not positions in a filtered temporary log. */
  entryIndexes: number[];
  matchedEntryIndexes: number[];
  unmatchedEntryIndexes: number[];
  attentionIds: string[];
  /** An authored instruction is retained separately; it does not prove work. */
  issuedDirectiveIds: string[];
  missingWorkHistoryIds: string[];
}
export interface ActualAttention {
  id: string;
  kind: CounterSignal['kind'];
  actor: string;
  venue: string;
  occurredAt: number;
  chronicleIndexes: number[];
  directiveIds: string[];
}
type Act = ActualAttention & { asking?: AskingRecord; answer?: TellingRecord; workedDay?: number };

function actualAttention(world: WorldState, through: number): Act[] {
  const acts = new Map<string, Act>();
  world.chronicle.forEach((row, index) => {
    if (row.tick > through) return;
    if (row.kind === 'asking' && row.authority) {
      const id = 'asking:' + index;
      acts.set(id, { id, kind: 'questioning', actor: row.speaker, venue: row.venue,
        occurredAt: row.tick, chronicleIndexes: [index], directiveIds: [], asking: row });
    }
    if (row.kind !== 'telling' || row.mode !== 'answer'
      || world.venues[row.venue]?.access !== 'invitational') return;
    // The live engine compels only at invitational venues and answers in the same beat. Earlier authority by
    // this actor alone is the player's inference, not proof this answer was compelled.
    const askingIndex = world.chronicle.findIndex((candidate) => candidate.kind === 'asking'
      && candidate.authority && candidate.tick === row.tick && candidate.venue === row.venue
      && candidate.speaker === row.addressedTo && candidate.addressedTo === row.speaker);
    if (askingIndex < 0) return;
    const id = 'answer:' + index;
    acts.set(id, { id, kind: 'compelled-answer', actor: row.addressedTo, venue: row.venue,
      occurredAt: row.tick, chronicleIndexes: [askingIndex, index], directiveIds: [], answer: row });
  });
  for (const record of world.network.directiveState?.records ?? []) {
    if (record.principal !== 'enemy') continue;
    for (const outcome of record.outcomes ?? []) {
      const work = outcome.result.enemyAction;
      if (outcome.tick > through || !work || work.kind !== 'watch-worked'
        || work.workedDay === null || work.occurredAt > through) continue;
      // One guard physically staffing one post on one night is one episode, even
      // if several retained orders/results refer to it. Preserve all owning ids.
      const id = 'watch:' + stableStringify([work.guard, work.venue, work.workedDay]);
      const act = acts.get(id) ?? { id, kind: 'watch', actor: work.guard, venue: work.venue,
        occurredAt: work.occurredAt, chronicleIndexes: [], directiveIds: [], workedDay: work.workedDay };
      act.occurredAt = Math.min(act.occurredAt, work.occurredAt);
      if (!act.directiveIds.includes(record.id)) act.directiveIds.push(record.id);
      acts.set(id, act);
    }
  }
  return [...acts.values()].sort((a, b) => a.occurredAt - b.occurredAt || a.id.localeCompare(b.id));
}

function matches(entry: IntelEntry, act: Act): boolean {
  if (entry.venue !== act.venue) return false;
  if (act.kind === 'questioning' && entry.kind === 'asking' && act.asking) {
    return entry.tick === act.occurredAt && entry.speaker === act.asking.speaker
      && entry.addressedTo === act.asking.addressedTo
      && stableStringify(entry.about) === stableStringify(act.asking.about);
  }
  if (act.kind === 'compelled-answer' && entry.kind === 'utterance' && act.answer) {
    return entry.mode === 'answer' && entry.tick === act.occurredAt
      && entry.speaker === act.answer.speaker && entry.addressedTo === act.answer.addressedTo
      && entry.claimId === act.answer.claimId;
  }
  // A match says this was a real work episode that night. It does not assert that
  // every minute was staffed, or that the reported presence tick itself was true.
  return act.kind === 'watch' && entry.kind === 'presence' && entry.actor === act.actor
    && dayOf(entry.tick) === act.workedDay && minuteOfDay(entry.tick) >= WATCH.from
    && minuteOfDay(entry.tick) < WATCH.to;
}

function relatedOrder(entry: IntelEntry, record: DirectiveRecord): boolean {
  const brief = record.authored.brief;
  if (record.principal !== 'enemy' || record.issuedAt > entry.tick
    || entry.tick < brief.active.from || entry.tick > brief.active.until) return false;
  const application = applicationOf(brief);
  if (entry.kind === 'presence') return application.kind === 'enemy-watch'
    && application.post.guard === entry.actor && application.post.venue === entry.venue;
  if (entry.kind === 'asking') return (application.kind === 'enemy-inquiry'
    || application.kind === 'enemy-interrogation') && record.recipient === entry.speaker
    && stableStringify(application.about) === stableStringify(entry.about);
  return entry.kind === 'utterance' && entry.mode === 'answer'
    && application.kind === 'enemy-interrogation'
    && record.recipient === entry.addressedTo && application.target === entry.speaker;
}

/**
 * Partial semantic overlay: real issued/performed attention, independent of whether
 * any sketch feature resulted. Feature/evidence causality is a subsequent fold.
 * Unknown receipt times stay outside the calendar; original append order drives
 * the unchanged counterSignals model. No hypotheses/cards are graded.
 */
export function attentionAt(world: WorldState, through: number): {
  signals: AttentionMatch[]; actual: ActualAttention[]; unseenAttentionIds: string[];
  unknownArrivalEntryIndexes: number[];
} {
  const calendar = counterKnowledge(world);
  const indexes = calendar.filter((row) => row.learnedAt !== null && row.learnedAt <= through)
    .map((row) => row.entryIndex);
  const log = indexes.map((index) => world.intel.log[index]!);
  const acts = actualAttention(world, through);
  const signals = counterSignals(log).map((signal): AttentionMatch => {
    const matched: number[] = []; const unmatched: number[] = [];
    const attentionIds = new Set<string>(); const issued = new Set<string>(); const missing = new Set<string>();
    const entryIndexes = signal.entryIndexes.map((index) => indexes[index]!);
    for (const entryIndex of entryIndexes) {
      const entry = world.intel.log[entryIndex]!;
      const found = acts.filter((act) => act.kind === signal.kind && matches(entry, act));
      (found.length > 0 ? matched : unmatched).push(entryIndex);
      for (const act of found) attentionIds.add(act.id);
      for (const record of world.network.directiveState?.records ?? []) {
        if (!relatedOrder(entry, record)) continue;
        issued.add(record.id);
        if (signal.kind === 'watch' && record.received !== null && record.outcomes === undefined) missing.add(record.id);
      }
    }
    return { id: stableStringify([signal.kind, signal.key]), kind: signal.kind, key: signal.key,
      entryIndexes, matchedEntryIndexes: matched, unmatchedEntryIndexes: unmatched,
      attentionIds: [...attentionIds].sort(), issuedDirectiveIds: [...issued].sort(), missingWorkHistoryIds: [...missing].sort() };
  });
  const seen = new Set(signals.flatMap((signal) => signal.attentionIds));
  return { signals, actual: acts.map((act) => ({ id: act.id, kind: act.kind, actor: act.actor,
    venue: act.venue, occurredAt: act.occurredAt, chronicleIndexes: [...act.chronicleIndexes],
    directiveIds: [...act.directiveIds].sort() })),
  unseenAttentionIds: acts.filter((act) => !seen.has(act.id)).map((act) => act.id),
  unknownArrivalEntryIndexes: cloneSerializable(calendar.filter((row) => row.learnedAt === null).map((row) => row.entryIndex)) };
}
```

## Semantic attention tests

```ts
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import type { IntelEntry } from '../../src/intel/entry';
import { attentionAt } from '../../src/sim/debrief/attention';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { issueDirectiveRecord } from '../../src/sim/directives/state';
import type { DirectiveRecord } from '../../src/sim/directives/types';
import { blankIntel } from '../../src/sim/fieldwork';
import { hashWorld } from '../../src/sim/hash';
import { runUntil } from '../../src/sim/step';
import type { AskingRecord, WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

function fixture() {
  const world = buildWorld(miniTown(), 'attention-model', RULES);
  enrollPlayer(world, { home: 'backroom' }); return world;
}
const question = (over: Partial<AskingRecord> = {}): AskingRecord => ({ kind: 'asking', tick: 15,
  venue: 'backroom', speaker: 'bez', addressedTo: 'ada', about: { subject: 'ada' }, authority: true,
  heardBy: [{ id: 'ada', addressed: true }, { id: 'you', addressed: false }], ...over });
const intel = (over: Partial<IntelEntry> = {}): IntelEntry => ({ ...blankIntel(), kind: 'asking',
  tick: 15, venue: 'backroom', via: 'self', overheard: true, speaker: 'bez', addressedTo: 'ada', authority: true,
  about: { subject: 'ada' }, ...over });
const presence = (tick = 990): IntelEntry => intel({ kind: 'presence', tick, venue: 'square',
  speaker: null, addressedTo: null, authority: false, about: null, actor: 'bez' });
function order(world: WorldState): DirectiveRecord {
  return issueDirectiveRecord(world, { principal: 'enemy', principalId: 'ada', recipient: 'bez',
    tick: 0, handoff: { outboundVia: [], reportVia: [] }, cause: null,
    brief: { mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } },
      priority: 'routine', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: 0, until: 1439 }, report: 'full', reportBy: null, purpose: null,
      application: { kind: 'enemy-watch', district: 'd0', post: { guard: 'bez', venue: 'square' },
        startDay: 0, subject: 'you', about: null } } });
}
function work(record: DirectiveRecord, tick = 990) {
  record.outcomes = [{ tick, reportMessageId: null, result: { outcome: 'watch worked',
    reason: 'post occupied', evidence: [], source: 'bez', uncertainty: 'low', reportedClaim: null, factRefs: [],
    enemyAction: { kind: 'watch-worked', subject: 'you', about: null, district: 'd0', scheduleStartDay: 0,
      guard: 'bez', venue: 'square', workedDay: 0, occurredAt: tick } } }];
}
function answer(world: WorldState, venue = 'backroom') {
  world.chronicle.push(question({ venue }), { kind: 'telling', tick: 15, venue,
    speaker: 'ada', addressedTo: 'bez', claimId: 'c-answer', mode: 'answer',
    heardBy: [{ id: 'bez', addressed: true }, { id: 'you', addressed: false }] });
  world.intel.log.push(intel({ venue }), intel({ kind: 'utterance', venue, speaker: 'ada', addressedTo: 'bez',
    authority: false, about: null, mode: 'answer', claimId: 'c-answer' }));
}

describe('semantic counter-attention without feature-id guessing', () => {
  it('keeps empty history empty', () => {
    expect(attentionAt(fixture(), 100)).toEqual({ signals: [], actual: [], unseenAttentionIds: [], unknownArrivalEntryIndexes: [] });
  });
  it('matches the exact recorded authority question without requiring a sketch feature', () => {
    const world = fixture(); world.chronicle.push(question()); world.intel.log.push(intel());
    const model = attentionAt(world, 15);
    expect(model.signals[0]).toMatchObject({ key: 's:ada', matchedEntryIndexes: [0], attentionIds: ['asking:0'] });
    expect(world.enemy.sketch).toEqual([]); expect(model.unseenAttentionIds).toEqual([]);
  });
  it.each([
    { speaker: 'cyn' }, { venue: 'square' }, { tick: 30 }, { about: { subject: 'cyn' } },
  ])('does not match a question with changed identity/location/time/topic %j', (over) => {
    const world = fixture(); world.chronicle.push(question()); world.intel.log.push(intel(over));
    expect(attentionAt(world, 30).signals[0]).toMatchObject({ matchedEntryIndexes: [], unmatchedEntryIndexes: [0] });
    expect(attentionAt(world, 30).unseenAttentionIds).toEqual(['asking:0']);
  });
  it('deduplicates repeated views of one actual asking without losing their original row indexes', () => {
    const world = fixture(); world.chronicle.push(question()); world.intel.log.push(intel(), intel());
    expect(attentionAt(world, 15).signals[0]).toMatchObject({ entryIndexes: [0, 1],
      matchedEntryIndexes: [0, 1], attentionIds: ['asking:0'] });
  });
  it('maps filtered counter-signal indexes back to the original log and exposes unknown arrivals', () => {
    const world = fixture(); world.chronicle.push(question());
    world.intel.log.push(intel({ via: 'remote-unrecorded' }), intel());
    const model = attentionAt(world, 15);
    expect(model.unknownArrivalEntryIndexes).toEqual([0]);
    expect(model.signals[0]).toMatchObject({ entryIndexes: [1], matchedEntryIndexes: [1] });
  });
  it('real watch work survives duplicate reports and repeated views, independently of sketch results', () => {
    const world = fixture(); const record = order(world); work(record);
    record.outcomes!.push(structuredClone(record.outcomes![0]!));
    world.intel.log.push(presence(960), presence(990), presence(1125));
    const model = attentionAt(world, 1439);
    expect(model.actual).toHaveLength(1); expect(model.signals[0]!.attentionIds).toHaveLength(1);
    expect(model.signals[0]!.matchedEntryIndexes).toEqual([0, 1, 2]);
    expect(model.signals[0]!.issuedDirectiveIds).toEqual([record.id]);
    expect(world.enemy.sketch).toEqual([]);
  });
  it('issued orders and headquarters claims alone never become performed watches', () => {
    const world = fixture(); const record = order(world); world.intel.log.push(presence());
    world.enemy.actionLedger = [{ orderKey: 'claimed', kind: 'watch', directiveIds: [record.id],
      leadFeatureId: null, subject: 'you', about: null, district: 'd0', scheduleStartDay: 0,
      posts: [{ guard: 'bez', venue: 'square' }], workedDays: [0], askedAt: null }];
    const model = attentionAt(world, 1439);
    expect(model.actual).toEqual([]); expect(model.signals[0]).toMatchObject({ attentionIds: [], issuedDirectiveIds: [record.id] });
  });
  it('marks absent received-watch history as unavailable, and reads saved work after execution is replaced', () => {
    const world = fixture(); const record = order(world); world.intel.log.push(presence());
    record.received = { tick: 0, version: structuredClone(record.authored), handoffFrom: 'ada', messageId: 'm0' };
    expect(attentionAt(world, 1439).signals[0]!.missingWorkHistoryIds).toEqual([record.id]);
    work(record); record.execution = { state: 'aborted', changedAt: 1440, dueAt: null, waiting: null };
    expect(attentionAt(world, 1440).signals[0]!.matchedEntryIndexes).toEqual([0]);
    expect(attentionAt(world, 1440).signals[0]!.missingWorkHistoryIds).toEqual([]);
  });
  it('ordinary daytime guard presence does not match an evening work episode', () => {
    const world = fixture(); work(order(world)); world.intel.log.push(presence(300));
    expect(attentionAt(world, 1439).signals[0]!.matchedEntryIndexes).toEqual([]);
  });
  it('matches compelled answers only when there is an actual same-beat authority asking', () => {
    const world = fixture(); answer(world);
    expect(attentionAt(world, 15).signals.find((row) => row.kind === 'compelled-answer')!.matchedEntryIndexes).toEqual([1]);
    const asking = world.chronicle[0]!; asking.tick = 0;
    expect(attentionAt(world, 15).signals.find((row) => row.kind === 'compelled-answer')!.matchedEntryIndexes).toEqual([]);
  });
  it('a public-venue authority answer can trigger suspicion but is not engine compulsion', () => {
    const world = fixture(); answer(world, 'square');
    const signal = attentionAt(world, 15).signals.find((row) => row.kind === 'compelled-answer')!;
    expect(signal.entryIndexes).toEqual([1]); expect(signal.matchedEntryIndexes).toEqual([]);
  });
  it('never reorders an answer before a later-arriving authority clue to create a signal', () => {
    const world = fixture(); answer(world); world.intel.log.reverse();
    expect(attentionAt(world, 15).signals.some((row) => row.kind === 'compelled-answer')).toBe(false);
  });
  it('excludes future work even if a present guard observation already exists', () => {
    const world = fixture(); work(order(world), 1050); world.intel.log.push(presence(990));
    expect(attentionAt(world, 1000).actual).toEqual([]);
    expect(attentionAt(world, 1100).signals[0]!.matchedEntryIndexes).toEqual([0]);
  });
  it('reads actual no-report watch work from the full engine after the directive expires', () => {
    const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
    for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
    const world = buildWorld(town, 'attention-live-watch', RULES); world.network.spymaster = 'ada';
    world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
    applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
      { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
    ] });
    const record = world.network.directiveState!.records[0]!;
    const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
    if (packet.payload.kind !== 'directive') throw new Error('watch packet missing');
    record.authored.brief.report = 'none'; packet.payload.version.brief.report = 'none';
    runUntil(world, 1440 + 1141, RULES);
    expect(record.outcomes!.some((row) => row.result.enemyAction?.kind === 'watch-worked')).toBe(true);
    runUntil(world, record.received!.version.brief.active.until + 1, RULES);
    expect(record.execution!.state).toBe('aborted');
    world.intel.log.push(presence(1440 + 990));
    const match = attentionAt(world, world.tick).signals.find((row) => row.kind === 'watch')!;
    expect(match.matchedEntryIndexes).toEqual([0]);
    expect(match.attentionIds).toHaveLength(1);
  });
  it('produces detached output and leaves hypotheses and simulation state untouched', () => {
    const world = fixture(); work(order(world)); world.intel.log.push(presence());
    world.intel.cards.push({ id: 'h0', text: 'my guess', confidence: 1, links: [], createdTick: 0, updatedTick: 0 });
    const before = hashWorld(world); const first = attentionAt(world, 1439);
    expect(attentionAt(world, 1439)).toEqual(first);
    first.actual[0]!.directiveIds.push('changed'); first.signals[0]!.entryIndexes.push(99);
    expect(hashWorld(world)).toBe(before);
  });
});
```
