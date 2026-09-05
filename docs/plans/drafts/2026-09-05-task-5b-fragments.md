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
