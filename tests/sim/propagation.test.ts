import { juiciness, relevance, freshness, tellability, chooseTelling, ingest,
  TELL_THRESHOLD } from '../../src/sim/rumors/propagation';
import { applyInject } from '../../src/sim/actions';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { Circle } from '../../src/sim/agents';

const spec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 3 as const, place: 'market', attribution: SOMEONE,
};

describe('scoring', () => {
  const world = buildWorld(TESTFORD, 'prop-seed');
  const injected = applyInject(world, 'mara', spec);

  it('juiciness blends predicate weight and severity', () => {
    expect(juiciness(injected, STANDARD_RULES)).toBeCloseTo(0.8); // stole 0.8, severity 3 -> +0
    expect(juiciness({ ...injected, severity: 5 }, STANDARD_RULES)).toBeCloseTo(0.96);
  });

  it('relevance: 1.0 when hearer knows the subject, 0.6 otherwise', () => {
    const aboutTomas = { ...injected, subject: 'tomas' };
    expect(relevance(world.npcs['mara']!, aboutTomas)).toBe(1);   // kin edge
    expect(relevance(world.npcs['brigid']!, aboutTomas)).toBe(0.6);
  });

  it('freshness decays to zero over three days', () => {
    const b = world.beliefs['mara']!['f0']!;
    expect(freshness(b, 0)).toBeCloseTo(1);        // injected at tick 0
    expect(freshness(b, at(1, 12))).toBeCloseTo(0.5); // 1.5 days old
    expect(freshness(b, at(3, 0, 1))).toBe(0);     // past three days
  });

  it('a fresh juicy belief clears the tell threshold for a trusted hearer', () => {
    const b = world.beliefs['mara']!['f0']!;
    expect(tellability(b, world.npcs['mara']!, world.npcs['tomas']!, world, at(0, 9), STANDARD_RULES))
      .toBeGreaterThan(TELL_THRESHOLD);
  });
});

describe('chooseTelling and gates', () => {
  it('teller retells own-trait-mutated child claim to an edge target in circle', () => {
    const world = buildWorld(TESTFORD, 'prop-seed-2');
    const injected = applyInject(world, 'mara', spec);
    const circle: Circle = { venue: 'market', members: ['mara', 'rafe'] };
    const u = chooseTelling(world, 'mara', circle, at(0, 9), STANDARD_RULES)!;
    expect(u).not.toBeNull();
    expect(u.addressedTo).toBe('rafe');
    const out = u.claim;
    expect(out.family).toBe(injected.family);
    expect(out.parent).toBe(injected.id);
    // mara = exaggerator + attributor: count doubled, severity +1, vague fields filled
    expect(out.count).toBe(4);
    expect(out.severity).toBe(4);
    expect(out.subject).toBe('jonet'); // her one rival — deterministic fill
    expect(world.claims[out.id]).toEqual(out);
  });

  it('skeptic will not retell on a single source', () => {
    const world = buildWorld(TESTFORD, 'prop-seed-3');
    applyInject(world, 'hew', spec); // hew is the skeptic
    const circle: Circle = { venue: 'tavern', members: ['hew', 'osric'] };
    expect(chooseTelling(world, 'hew', circle, at(0, 20), STANDARD_RULES)).toBeNull();
  });

  it('cooldown: no immediate re-tell of the same family', () => {
    const world = buildWorld(TESTFORD, 'prop-seed-4');
    applyInject(world, 'mara', spec);
    const circle: Circle = { venue: 'market', members: ['mara', 'rafe'] };
    expect(chooseTelling(world, 'mara', circle, at(0, 9), STANDARD_RULES)).not.toBeNull();
    world.lastTold[`mara:f0`] = at(0, 9);
    expect(chooseTelling(world, 'mara', circle, at(0, 10), STANDARD_RULES)).toBeNull();
    expect(chooseTelling(world, 'mara', circle, at(0, 13, 30), STANDARD_RULES)).not.toBeNull();
  });

  it('ingest: addressed > overheard credence; first version sticks; sources accumulate', () => {
    const world = buildWorld(TESTFORD, 'prop-seed-5');
    const injected = applyInject(world, 'mara', spec);
    const u = { tick: at(0, 9), speaker: 'mara', claim: { ...injected, id: 'c9', parent: injected.id } };
    ingest(world, 'rafe', u, true);
    const b = world.beliefs['rafe']![injected.family]!;
    expect(b.credence).toBeCloseTo(0.35 + 0.45 * 0.6); // trust rafe->mara = 0.6
    ingest(world, 'rafe', { ...u, speaker: 'osric' }, false);
    expect(b.timesHeard).toBe(2);
    expect(b.distinctSources).toEqual(['mara', 'osric']);
    expect(b.claim.id).toBe('c9'); // first version stuck
  });
});
