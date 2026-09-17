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

/** The exact row ingestPlayerItem appends for a witness-free reported presence. */
const boardPresence = (): IntelEntry => ({
  ...blankIntel(), tick: 60, venue: 'square', via: 'ada',
  kind: 'presence', overheard: true, actor: 'bez',
});

const presenceReport = (tick: number, messageId: string, witness?: string): NetworkSpeechRecord => ({
  kind: 'network-speech', tick, venue: 'backroom', speaker: 'ada', addressedTo: 'you',
  messageId, cause: null, heardBy: [{ id: 'you', addressed: true }],
  spoken: {
    kind: 'field-report', onwardTo: null,
    items: [{ factRefs: [], observation: {
      kind: 'presence', observedAt: 60, venue: 'square', actor: 'bez',
      ...(witness === undefined ? {} : { witness }),
    } }],
  },
});

describe('a witnessed presence report never dates an ordinary presence row (R32)', () => {
  it('with only the witness-free report, the board row dates to that report', () => {
    const value = world();
    value.intel.log.push(boardPresence());
    value.chronicle.push(presenceReport(200, 'm2'));
    expect(counterKnowledge(value)).toEqual([
      { entryIndex: 0, learnedAt: 200, messageId: 'm2', timing: 'report' },
    ]);
  });

  it('an earlier witnessed (night-visit) report cannot backdate the ordinary row', () => {
    const value = world();
    value.intel.log.push(boardPresence());
    value.chronicle.push(presenceReport(100, 'm1', 'cyd'), presenceReport(200, 'm2'));
    expect(counterKnowledge(value)).toEqual([
      { entryIndex: 0, learnedAt: 200, messageId: 'm2', timing: 'report' },
    ]);
  });

  it('a witnessed item corresponds to a scene-presence row, which this fold does not date', () => {
    const value = world();
    value.intel.log.push({ ...boardPresence(), kind: 'scene-presence' });
    value.chronicle.push(presenceReport(100, 'm1', 'cyd'));
    expect(counterKnowledge(value)).toEqual([]);
  });
});
