import { describe, expect, it } from 'vitest';
import { observationsAtVenue, observationsFor, type TickEvents } from '../../src/sim/perception';
import type { Claim } from '../../src/sim/rumors/claim';

const claim: Claim = { id: 'c0', family: 'f0', parent: null, subject: 'a', predicate: 'stole',
  object: null, count: 2, severity: 3, place: null, attribution: 'someone' };
const sensor = { kind: 'venue-sensor' as const, venue: 'hall', from: 1440, to: 1500 };
const events = (tick: number): TickEvents => ({
  tick, positions: { a: 'hall', b: 'hall', outsider: 'well' },
  utterances: [{ tick, venue: 'hall', circleMembers: ['a', 'b'],
    speaker: 'a', addressedTo: 'b', claim, mode: 'answer', document: true }],
  askings: [{ tick, venue: 'hall', circleMembers: ['a', 'b'], speaker: 'b', addressedTo: 'a',
    about: { family: 'f0' }, authority: true }],
});

describe('live venue sensor', () => {
  it.each([1439, 1500, 1501])('excludes adjacent/outside tick %i', (tick) => {
    expect(observationsAtVenue(sensor, events(tick))).toEqual([]);
  });
  it.each([1440, 1455, 1499])('captures matching tick %i without an invented observer', (tick) => {
    const bundle = events(tick);
    const before = JSON.stringify(bundle);
    const seen = observationsAtVenue(sensor, bundle);
    expect(seen.map((row) => row.kind)).toEqual(['presence', 'presence', 'utterance', 'asking']);
    expect(seen.every((row) => row.tick === tick && row.venue === 'hall')).toBe(true);
    expect(seen.find((row) => row.kind === 'utterance')).toMatchObject({ claim, document: true });
    expect(JSON.stringify(bundle)).toBe(before);
    expect(observationsFor('scrying', bundle).observations).toEqual([]);
  });
  it('empty/mismatching venue gives no phantom content; stale utterances are rejected', () => {
    expect(observationsAtVenue({ ...sensor, venue: 'empty' }, events(1440))).toEqual([]);
    const bundle = events(1440);
    bundle.utterances[0]!.tick = 1439;
    expect(observationsAtVenue(sensor, bundle).filter((row) => row.kind === 'utterance')).toEqual([]);
  });
  it('ordinary circles and absent document keys stay unchanged', () => {
    const bundle = events(1440);
    delete bundle.utterances[0]!.document;
    bundle.positions.bystander = 'hall';
    expect(observationsFor('bystander', bundle).observations.every((row) => row.kind === 'presence')).toBe(true);
    const heard = observationsAtVenue(sensor, bundle).find((row) => row.kind === 'utterance')!;
    expect(Object.hasOwn(heard, 'document')).toBe(false);
  });
});
