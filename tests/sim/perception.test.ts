import { observationsFor, type TickEvents } from '../../src/sim/perception';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';

const claim: Claim = {
  id: 'c1', family: 'r1', parent: null,
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 3, place: null, attribution: SOMEONE,
};

const events: TickEvents = {
  tick: 1200,
  positions: { mara: 'tavern', osric: 'tavern', hew: 'tavern', brigid: 'northside-well' },
  utterances: [
    { tick: 1200, venue: 'tavern', circleMembers: ['mara', 'osric'], speaker: 'mara', addressedTo: 'osric', claim, mode: 'telling' },
  ],
  askings: [],
};

describe('observationsFor', () => {
  it('same venue = presence; same circle = utterance', () => {
    const feed = observationsFor('osric', events);
    expect(feed.observations).toContainEqual({ kind: 'presence', tick: 1200, venue: 'tavern', actor: 'mara' });
    expect(feed.observations).toContainEqual({ kind: 'presence', tick: 1200, venue: 'tavern', actor: 'hew' });
    expect(feed.observations).toContainEqual(
      { kind: 'utterance', tick: 1200, venue: 'tavern', speaker: 'mara', addressedTo: 'osric', claim, overheard: false, mode: 'telling' },
    );
  });

  it('same venue but different circle hears nothing (sees presence only)', () => {
    const feed = observationsFor('hew', events);
    expect(feed.observations.filter((o) => o.kind === 'utterance')).toHaveLength(0);
    expect(feed.observations.filter((o) => o.kind === 'presence')).toHaveLength(2);
  });

  it('bystanders in the circle overhear; other venues observe nothing', () => {
    const withBystander: TickEvents = {
      ...events,
      utterances: [{ ...events.utterances[0]!, circleMembers: ['mara', 'osric', 'hew'] }],
    };
    const hew = observationsFor('hew', withBystander);
    expect(hew.observations.find((o) => o.kind === 'utterance')).toMatchObject({ overheard: true });
    const brigid = observationsFor('brigid', events);
    expect(brigid.observations).toHaveLength(0);
  });

  it('a speaker never observes their own utterance', () => {
    const feed = observationsFor('mara', events);
    expect(feed.observations.filter((o) => o.kind === 'utterance')).toHaveLength(0);
  });

  it('NO-LEAK: events elsewhere never alter a feed (mini no-omniscience)', () => {
    const before = observationsFor('brigid', events);
    const perturbed: TickEvents = {
      ...events,
      utterances: [...events.utterances,
        { tick: 1200, venue: 'tavern', circleMembers: ['osric', 'hew'], speaker: 'osric', addressedTo: 'hew', claim, mode: 'telling' }],
    };
    expect(observationsFor('brigid', perturbed)).toEqual(before);
  });
});
