import { describe, expect, it } from 'vitest';
import {
  emptyEnemyState, type EnemyState, type EvidenceEntry, type SketchFeature, type TownMap,
} from '../../src/sim/enemy/state';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { stableStringify } from '../../src/sim/hash';

const MAP: TownMap = {
  venues: [
    { id: 'square-w0', district: 'w0', access: 'public' },
    { id: 'square-w1', district: 'w1', access: 'public' },
    { id: 'guard-post-w0', district: 'w0', access: 'invitational' },
  ],
  directory: [
    { id: 'gale', occupation: 'guard', district: 'w0' }, { id: 'hugo', occupation: 'guard', district: 'w1' },
    { id: 'mira', occupation: 'grocer', district: 'w0' }, { id: 'otto', occupation: 'joiner', district: 'w0' },
    { id: 'sten', occupation: 'carter', district: 'w0' },
  ],
};

function heard(over: Partial<Extract<EvidenceEntry, { kind: 'utterance' }>>): EvidenceEntry {
  return {
    tick: 500, venue: 'square-w0', observer: 'gale', overheard: true,
    speaker: 'mira', addressedTo: 'otto', kind: 'utterance', mode: 'telling',
    claimId: 'c1', family: 'f0',
    reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4,
      place: null, attribution: SOMEONE },
    about: null, ...over,
  };
}

function stateWith(evidence: EvidenceEntry[]): EnemyState {
  return { ...emptyEnemyState(), observers: [{ id: 'gale', vigilance: 0.9 }, { id: 'hugo', vigilance: 0.3 }],
    map: MAP, evidence };
}

describe('features', () => {
  it('entry-point fires once per family, on the first-sampled entry', () => {
    const state = stateWith([heard({ tick: 500, claimId: 'c1' }), heard({ tick: 600, claimId: 'c2', speaker: 'sten' })]);
    const d = enemyDigest(state, 0, STANDARD_RULES);
    const entries = d.features.filter((f) => f.kind === 'entry-point');
    expect(entries).toHaveLength(1);
    expect(entries[0]!).toMatchObject({ family: 'f0', district: 'w0' });
    expect(entries[0]!.evidence[0]).toMatchObject({ tick: 500, observer: 'gale', claimId: 'c1' });
  });

  it('district-activity needs two distinct speakers in one district', () => {
    const one = enemyDigest(stateWith([heard({})]), 0, STANDARD_RULES);
    expect(one.features.some((f) => f.kind === 'district-activity')).toBe(false);
    const two = enemyDigest(stateWith([heard({}), heard({ tick: 600, claimId: 'c2', speaker: 'sten' })]), 0, STANDARD_RULES);
    expect(two.features.filter((f) => f.kind === 'district-activity')).toHaveLength(1);
  });

  it('an answer naming nobody births origin-vague AND a carrier-profile with street knowledge', () => {
    const state = stateWith([
      heard({}), heard({ tick: 600, claimId: 'c2', speaker: 'sten' }),
      heard({ tick: 900, claimId: 'c3', speaker: 'mira', mode: 'answer', addressedTo: 'gale', overheard: false }),
    ]);
    const d = enemyDigest(state, 1, STANDARD_RULES);
    expect(d.features.some((f) => f.kind === 'origin-vague' && f.family === 'f0')).toBe(true);
    const carrier = d.features.find((f) => f.kind === 'carrier-profile');
    expect(carrier).toMatchObject({ subject: 'mira' });
    expect(carrier!.detail).toContain('grocer');
    expect(carrier!.detail).toContain('w0');
    // and the enemy starts asking about the carrier herself
    expect(d.inquiries.some((q) => 'subject' in q.about && q.about.subject === 'mira')).toBe(true);
  });
});

describe('orders', () => {
  it('a suspicious moving story draws ask-around inquiries, once ever (dedupe key survives)', () => {
    const state = stateWith([heard({}), heard({ tick: 600, claimId: 'c2', speaker: 'sten' })]);
    const d1 = enemyDigest(state, 0, STANDARD_RULES);
    expect(d1.inquiries.filter((q) => 'family' in q.about && q.about.family === 'f0')).toHaveLength(2);
    // simulate application: keys recorded → next digest must not re-issue
    const applied: EnemyState = { ...state, sketch: d1.features,
      inquiriesIssued: ['f:f0'], digestedThrough: state.evidence.length };
    const d2 = enemyDigest(applied, 1, STANDARD_RULES);
    expect(d2.inquiries.filter((q) => 'family' in q.about && q.about.family === 'f0')).toHaveLength(0);
  });

  it('an answer naming a source orders an interrogation at the invitational venue', () => {
    const state = stateWith([
      heard({}),
      heard({ tick: 900, claimId: 'c3', speaker: 'otto', mode: 'answer', addressedTo: 'gale', overheard: false,
        reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4,
          place: null, attribution: 'sten' } }),
    ]);
    const d = enemyDigest(state, 1, STANDARD_RULES);
    expect(d.interrogations).toHaveLength(1);
    expect(d.interrogations[0]!).toMatchObject({ target: 'sten', day: 2, venue: 'guard-post-w0' });
  });

  it('watches need two district features plus an origin-vague, and post guards to public venues', () => {
    const state = stateWith([
      heard({}), heard({ tick: 600, claimId: 'c2', speaker: 'sten' }),
      heard({ tick: 900, claimId: 'c3', speaker: 'mira', mode: 'answer', addressedTo: 'gale', overheard: false }),
    ]);
    const d = enemyDigest(state, 1, STANDARD_RULES);
    // entry-point + district-activity in w0 (≥2) + origin-vague present → watch on w0
    expect(d.watches).toHaveLength(1);
    expect(d.watches[0]!.district).toBe('w0');
    for (const post of d.watches[0]!.posts) expect(post.venue).toBe('square-w0');
  });
});

describe('purity and determinism', () => {
  it('digest neither mutates state nor varies across calls', () => {
    const state = stateWith([heard({}), heard({ tick: 600, claimId: 'c2', speaker: 'sten' })]);
    const before = stableStringify(state);
    const a = enemyDigest(state, 0, STANDARD_RULES);
    const b = enemyDigest(state, 0, STANDARD_RULES);
    expect(stableStringify(state)).toBe(before);
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  // Task 12 serialization law: `tailDrops` is OMITTED entirely when empty, so a decision without a
  // runaround serializes exactly as it did before the key existed.
  it('a decision with no runaround omits tailDrops entirely — not an empty array', () => {
    const state = stateWith([
      heard({}), heard({ tick: 600, claimId: 'c2', speaker: 'sten' }),
      heard({ tick: 900, claimId: 'c3', speaker: 'mira', mode: 'answer', addressedTo: 'gale', overheard: false }),
    ]);
    const d = enemyDigest(state, 1, STANDARD_RULES);
    expect('tailDrops' in d).toBe(false);
    expect(stableStringify(d)).not.toContain('tailDrops');
    // …and the watch it DID decide carries its bound lead, one subject end to end. The oldest
    // subject-bearing w0 feature is the origin-vague on mira, and its family keys the about.
    expect(d.watches[0]).toMatchObject({
      district: 'w0', subject: 'mira', about: { family: 'f0' },
    });
    expect(d.watches[0]!.leadFeatureId)
      .toBe(d.features.find((f) => f.kind === 'origin-vague')!.id);
  });

  /** The same watch geometry with a staged w1 lead pool, so the binding rule is observable alone. */
  function w1WatchWith(sketch: SketchFeature[]) {
    const state: EnemyState = {
      ...stateWith([
        heard({}), heard({ tick: 600, claimId: 'c2', speaker: 'sten' }),
        heard({ tick: 900, claimId: 'c3', speaker: 'mira', mode: 'answer', addressedTo: 'gale', overheard: false }),
      ]),
      watchedDistricts: ['w0'],
      sketch, featureCounter: sketch.length,
    };
    return enemyDigest(state, 1, STANDARD_RULES).watches.find((w) => w.district === 'w1');
  }

  const staged = (over: Partial<SketchFeature>): SketchFeature => ({
    id: 'x0', kind: 'district-activity', day: 0, family: 'fx', subject: null, district: 'w1',
    detail: 'staged', evidence: [{ tick: 0, observer: 'hugo', claimId: 'cx', messageId: null }],
    ...over,
  });

  it('a leadless watch omits all three optional keys and keeps the pre-Task-12 bytes', () => {
    const watch = w1WatchWith([staged({ id: 'x0' }), staged({ id: 'x1', kind: 'entry-point' })])!;
    expect('subject' in watch).toBe(false);
    expect('about' in watch).toBe(false);
    expect('leadFeatureId' in watch).toBe(false);
    expect(stableStringify(watch)).toBe(stableStringify({
      district: 'w1',
      posts: [
        { guard: 'hugo', venue: 'square-w1' },
        { guard: 'gale', venue: 'square-w1' },
      ],
      startDay: 2,
    }));
    expect(stableStringify(watch)).not.toContain('undefined');
  });

  it('an unbound interrogation omits leadFeatureId while a bound one carries it', () => {
    const evidence = [
      heard({}),
      heard({ tick: 900, claimId: 'c3', speaker: 'otto', mode: 'answer',
        addressedTo: 'gale', overheard: false,
        reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4,
          place: null, attribution: 'sten' } }),
    ];
    const unbound = enemyDigest(stateWith(evidence), 1, STANDARD_RULES).interrogations[0]!;
    expect('leadFeatureId' in unbound).toBe(false);

    const lead = staged({
      id: 'lead-sten', kind: 'carrier-profile', family: 'f0', subject: 'sten', district: 'w0',
    });
    const state = stateWith(evidence);
    state.sketch = [lead];
    state.featureCounter = 1;
    expect(enemyDigest(state, 1, STANDARD_RULES).interrogations[0]!.leadFeatureId).toBe('lead-sten');
  });

  it('a family-less lead keys its about by SUBJECT, and the oldest (day, id) lead wins', () => {
    expect(w1WatchWith([
      staged({ id: 'x0' }),
      staged({ id: 'x2', kind: 'carrier-profile', day: 1, family: null, subject: 'quill' }),
      staged({ id: 'x1', kind: 'carrier-profile', day: 0, family: null, subject: 'rosa' }),
    ])).toMatchObject({ subject: 'rosa', about: { subject: 'rosa' }, leadFeatureId: 'x1' });
  });
});
