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
