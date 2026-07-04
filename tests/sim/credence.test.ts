import { plausibility, ingest, stanceOf, STANCE, chooseTelling } from '../../src/sim/rumors/propagation';
import { applyInject } from '../../src/sim/actions';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { at } from '../../src/core/time';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import type { Belief } from '../../src/sim/types';

const world = buildWorld(TESTFORD, 'cred-1');
const damaging = { subject: 'mara', predicate: 'stole' } as Claim;       // stole: damaging
const flattering = { subject: 'mara', predicate: 'blessed-the-harvest' } as Claim;

describe('plausibility — confirmation bias as a mechanic', () => {
  it('claims against someone you dislike land soft (jonet.rivals includes mara)', () => {
    expect(plausibility(world.npcs['jonet']!, damaging, STANDARD_RULES)).toBe(1.3);
  });
  it('claims against kin meet resistance; flattering claims about kin land soft', () => {
    expect(plausibility(world.npcs['tomas']!, damaging, STANDARD_RULES)).toBe(0.7);
    expect(plausibility(world.npcs['tomas']!, flattering, STANDARD_RULES)).toBe(1.3);
  });
  it('friends resist gossip about friends, mildly', () => {
    expect(plausibility(world.npcs['osric']!, damaging, STANDARD_RULES)).toBe(0.85); // osric friend-of mara
  });
  it('no relationship, vague subject, or neutral valence → 1.0', () => {
    expect(plausibility(world.npcs['brigid']!, damaging, STANDARD_RULES)).toBe(1);
    expect(plausibility(world.npcs['jonet']!, { ...damaging, subject: SOMEONE }, STANDARD_RULES)).toBe(1);
    const neutralRules = { ...STANDARD_RULES, predicates: {
      ...STANDARD_RULES.predicates,
      stole: { ...STANDARD_RULES.predicates['stole']!, valence: 'neutral' as const },
    } };
    expect(plausibility(world.npcs['jonet']!, damaging, neutralRules)).toBe(1);
  });
});

describe('ingest composes plausibility into first-hearing credence', () => {
  const spec = { subject: 'mara', predicate: 'stole', object: null,
    count: null, severity: 4 as const, place: null, attribution: SOMEONE };

  it('disliker believes readily; kin resists', () => {
    const w = buildWorld(TESTFORD, 'cred-2');
    const injected = applyInject(w, 'osric', spec);
    const hear = (hearer: string, speaker: string): Belief => {
      ingest(w, hearer, { tick: at(0, 20), speaker, claim: injected }, true, STANDARD_RULES);
      return w.beliefs[hearer]![injected.family]!;
    };
    // jonet: trust jonet→osric 0.6, dislikes mara → (0.35+0.45*0.6)*1.3 = 0.806
    expect(hear('jonet', 'osric').credence).toBeCloseTo(0.806);
    // tomas: trust tomas→seth 0.6, kin of mara → (0.35+0.45*0.6)*0.7 = 0.434
    const w2 = buildWorld(TESTFORD, 'cred-3');
    const injected2 = applyInject(w2, 'seth', spec);
    ingest(w2, 'tomas', { tick: at(0, 12), speaker: 'seth', claim: injected2 }, true, STANDARD_RULES);
    expect(w2.beliefs['tomas']![injected2.family]!.credence).toBeCloseTo(0.434);
  });
});

describe('belief stances', () => {
  const b = (credence: number): Belief => ({ credence } as Belief);
  it('thresholds partition the scale', () => {
    expect(stanceOf(b(0.1))).toBe('dismissed');
    expect(stanceOf(b(STANCE.DISMISS))).toBe('heard');
    expect(stanceOf(b(0.49))).toBe('heard');
    expect(stanceOf(b(STANCE.REPEAT))).toBe('repeating');
    expect(stanceOf(b(0.74))).toBe('repeating');
    expect(stanceOf(b(STANCE.BELIEVE))).toBe('believing');
    expect(stanceOf(b(0.95))).toBe('believing');
  });
});

describe('self-gossip gate', () => {
  it('an NPC never retells a claim about themselves', () => {
    const w = buildWorld(TESTFORD, 'cred-4');
    const injected = applyInject(w, 'jonet', {
      subject: 'jonet', predicate: 'stole', object: null,
      count: null, severity: 4 as const, place: null, attribution: SOMEONE,
    });
    void injected;
    const circle = { venue: 'workshop', members: ['jonet', 'hew'] };
    expect(chooseTelling(w, 'jonet', circle, at(0, 9), STANDARD_RULES)).toBeNull();
  });
});

describe('plausibility precedence — dislike beats affection (frenemies resent first)', () => {
  it('rival-listed AND friend-edged to the subject: dislike wins', () => {
    // Live in the fixture: brigid rivals cole yet drinks with him at the well.
    const damagingCole = { subject: 'cole', predicate: 'stole' } as Claim;
    expect(plausibility(world.npcs['brigid']!, damagingCole, STANDARD_RULES)).toBe(1.3);
  });

  it('a rival-KIND edge counts as dislike even with no rivals-list entry', () => {
    const hearer = { ...world.npcs['seth']!, rivals: [], edges: [{ to: 'mara', kind: 'rival' as const, trust: 0.2 }] };
    expect(plausibility(hearer, { subject: 'mara', predicate: 'stole' } as Claim, STANDARD_RULES)).toBe(1.3);
  });

  it('a lover edge is close: resists damage, amplifies flattery', () => {
    const hearer = { ...world.npcs['seth']!, rivals: [], edges: [{ to: 'mara', kind: 'lover' as const, trust: 0.9 }] };
    expect(plausibility(hearer, { subject: 'mara', predicate: 'stole' } as Claim, STANDARD_RULES)).toBe(0.7);
    expect(plausibility(hearer, { subject: 'mara', predicate: 'blessed-the-harvest' } as Claim, STANDARD_RULES)).toBe(1.3);
  });
});
