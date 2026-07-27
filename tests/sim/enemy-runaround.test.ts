import { describe, expect, it } from 'vitest';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { runLogOn, type Action } from '../../src/sim/campaign';
import { enemyDigest } from '../../src/sim/enemy/digest';
import {
  emptyEnemyState, INTERROGATION, RUNAROUND_COOLDOWN_DAYS, RUNAROUND_WASTED_NIGHTS, WATCH,
  type EnemyActionLedgerEntry, type EnemyState, type EvidenceEntry, type SketchFeature,
  type TownMap, type WatchPost,
} from '../../src/sim/enemy/state';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { DirectiveBrief, DirectiveMission, SpokenNetworkPayload } from '../../src/sim/directives/types';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';

/**
 * Task 12 — the runaround: a lawfully captured false lead spends the enemy's own attention, and
 * two genuinely unproductive ACTION nights (read from Task 9's receipt-built `actionLedger`, never
 * from the intended order) drop the short-term tail while leaving a permanent suspicion feature.
 *
 * Everything here is the PURE digest layer: `enemyDigest(state, day, rules)` over a hand-staged
 * `EnemyState`. No world, no player intent, no directive records — the enemy acts only on its own
 * issued attention plus evidence its own channels captured.
 */
const RULES = STANDARD_RULES;

const MAP: TownMap = {
  venues: [
    { id: 'square-w0', district: 'w0', access: 'public' },
    { id: 'guard-post-w0', district: 'w0', access: 'invitational' },
    { id: 'square-w1', district: 'w1', access: 'public' },
  ],
  directory: [
    { id: 'gale', occupation: 'guard', district: 'w0' },
    { id: 'hugo', occupation: 'guard', district: 'w1' },
    { id: 'mira', occupation: 'grocer', district: 'w0' },
    { id: 'otto', occupation: 'joiner', district: 'w0' },
    { id: 'rosa', occupation: 'laundress', district: 'w1' },
  ],
};

const OBSERVERS = [{ id: 'gale', vigilance: 0.9 }, { id: 'hugo', vigilance: 0.3 }];

/** The persisted brief lead the enemy already holds: a carrier profile aimed at mira in w0. */
const LEAD: SketchFeature = {
  id: 'lead-0', kind: 'carrier-profile', day: 0, family: 'f0', subject: 'mira', district: 'w0',
  detail: 'brief lead: a captured brief pointed at mira',
  evidence: [{ tick: at(0, 16), observer: 'gale', claimId: null, messageId: 'n-lead' }],
};

const POSTS: WatchPost[] = [{ guard: 'gale', venue: 'square-w0' }];

function watchRow(over: Partial<EnemyActionLedgerEntry> = {}): EnemyActionLedgerEntry {
  return {
    orderKey: 'watch:w0', kind: 'watch', directiveIds: ['d0'], leadFeatureId: 'lead-0',
    subject: 'mira', about: { family: 'f0' }, district: 'w0', scheduleStartDay: 1,
    posts: POSTS.map((post) => ({ ...post })), workedDays: [1, 2], askedAt: null, ...over,
  };
}

/**
 * A staged enemy mind that already spent two watched nights on `lead-0`. `evidenceAfterStart` is
 * whatever the posted guard actually captured during those nights — empty means the guard stood
 * the post and heard nothing about mira at all.
 */
function runaroundState(over: {
  evidenceAfterStart: EvidenceEntry[];
  ledger?: EnemyActionLedgerEntry[];
  sketch?: SketchFeature[];
  evidence?: EvidenceEntry[];
  featureCounter?: number;
}): EnemyState {
  const sketch = over.sketch ?? [{ ...LEAD, evidence: LEAD.evidence.map((ref) => ({ ...ref })) }];
  return {
    ...emptyEnemyState(),
    observers: OBSERVERS.map((spec) => ({ ...spec })),
    map: MAP,
    evidence: [...(over.evidence ?? []), ...over.evidenceAfterStart],
    sketch,
    featureCounter: over.featureCounter ?? sketch.length,
    actionLedger: over.ledger ?? [watchRow()],
  };
}

/** An utterance the posted guard heard at its own post, inside the watch window, on `day`. */
function heardAtPost(day: number, over: Partial<Extract<EvidenceEntry, { kind: 'utterance' }>> = {}): EvidenceEntry {
  return {
    tick: day * TICKS_PER_DAY + WATCH.from + 15, venue: 'square-w0', observer: 'gale',
    overheard: true, speaker: 'mira', addressedTo: 'otto', kind: 'utterance', mode: 'telling',
    claimId: `c-${day}`, family: 'f0',
    reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4,
      place: null, attribution: SOMEONE },
    about: null, ...over,
  };
}

describe('runaround — two truly wasted watched nights', () => {
  it('two truly wasted watched nights create one fair-cop runaround and drop the tail', () => {
    const state = runaroundState({ evidenceAfterStart: [] });
    const d = enemyDigest(state, 3, RULES);
    const f = d.features.find((x) => x.kind === 'runaround');
    expect(f).toMatchObject({ day: 3, subject: 'mira', district: 'w0', family: 'f0' });
    expect(f!.evidence.length).toBeGreaterThan(0);
    expect(d.tailDrops).toEqual([{
      leadFeatureId: 'lead-0', subject: 'mira', district: 'w0', watchStartDay: 1, untilDay: 5,
    }]);
  });

  it('the runaround copies the lead\'s own refs and never fabricates an empty fair-cop trail', () => {
    const state = runaroundState({ evidenceAfterStart: [] });
    const f = enemyDigest(state, 3, RULES).features.find((x) => x.kind === 'runaround')!;
    expect(f.evidence).toEqual(LEAD.evidence);
    expect(f.evidence).not.toBe(LEAD.evidence);           // deep copy, never a shared reference
    expect(f.evidence[0]).not.toBe(state.sketch[0]!.evidence[0]);
  });

  it('one matching observed result on a watched night prevents the runaround entirely', () => {
    const state = runaroundState({ evidenceAfterStart: [heardAtPost(2, { speaker: 'mira' })] });
    const d = enemyDigest(state, 3, RULES);
    expect(d.features.some((x) => x.kind === 'runaround')).toBe(false);
    expect(d.tailDrops).toBeUndefined();
  });

  it('a productive night RESETS the streak; two unproductive nights after it still fire', () => {
    const productiveThenWasted = runaroundState({
      evidenceAfterStart: [heardAtPost(1, { speaker: 'mira' })],
      ledger: [watchRow({ workedDays: [1, 2, 3] })],
    });
    const d = enemyDigest(productiveThenWasted, 4, RULES);
    expect(d.features.some((x) => x.kind === 'runaround')).toBe(true);
    expect(d.tailDrops).toHaveLength(1);
  });

  it('one wasted night is insufficient', () => {
    const state = runaroundState({ evidenceAfterStart: [], ledger: [watchRow({ workedDays: [1] })] });
    const d = enemyDigest(state, 3, RULES);
    expect(d.features.some((x) => x.kind === 'runaround')).toBe(false);
    expect(d.tailDrops).toBeUndefined();
  });

  it('only worked days STRICTLY BEFORE the digest day count — tonight is not yet spent', () => {
    const state = runaroundState({ evidenceAfterStart: [], ledger: [watchRow({ workedDays: [1, 2] })] });
    expect(enemyDigest(state, 2, RULES).features.some((x) => x.kind === 'runaround')).toBe(false);
    expect(enemyDigest(state, 3, RULES).features.some((x) => x.kind === 'runaround')).toBe(true);
  });

  it('three or more wasted nights still emit exactly one feature, and never a second later', () => {
    const state = runaroundState({ evidenceAfterStart: [], ledger: [watchRow({ workedDays: [1, 2, 3] })] });
    const first = enemyDigest(state, 4, RULES);
    expect(first.features.filter((x) => x.kind === 'runaround')).toHaveLength(1);

    const settled: EnemyState = { ...state, sketch: [...state.sketch, ...first.features],
      featureCounter: state.featureCounter + first.features.length };
    const second = enemyDigest(settled, 5, RULES);
    expect(second.features.some((x) => x.kind === 'runaround')).toBe(false);
    expect(second.tailDrops).toBeUndefined();
  });

  it('dedupe is per LEAD: two distinct leads sharing subject/district/family each emit one', () => {
    // "If no existing runaround for that lead" — lead identity, not a (kind,subject,district,family)
    // tuple. Two real leads can name the same person in the same district about the same story and
    // still be two separate purchases of attention; each one the enemy wastes must be priced.
    const leadA: SketchFeature = { ...LEAD, id: 'lead-0',
      evidence: [{ tick: at(0, 16), observer: 'gale', claimId: null, messageId: 'n-a' }] };
    const leadB: SketchFeature = { ...LEAD, id: 'lead-1',
      evidence: [{ tick: at(0, 17), observer: 'gale', claimId: null, messageId: 'n-b' }] };
    const state = runaroundState({ evidenceAfterStart: [], sketch: [leadA, leadB], ledger: [
      watchRow(),
      watchRow({ orderKey: 'watch:w0#2', leadFeatureId: 'lead-1', scheduleStartDay: 2, workedDays: [1, 2] }),
    ] });
    const d = enemyDigest(state, 3, RULES);
    expect(d.features.filter((x) => x.kind === 'runaround')).toHaveLength(2);
    expect(d.features.filter((x) => x.kind === 'runaround').map((x) => x.evidence))
      .toEqual([leadA.evidence, leadB.evidence]);
    expect(d.tailDrops).toEqual([
      { leadFeatureId: 'lead-0', subject: 'mira', district: 'w0', watchStartDay: 1, untilDay: 5 },
      { leadFeatureId: 'lead-1', subject: 'mira', district: 'w0', watchStartDay: 2, untilDay: 5 },
    ]);
  });

  it('…and the SAME lead never emits twice, however many extra nights it burns', () => {
    const state = runaroundState({ evidenceAfterStart: [], ledger: [watchRow({ workedDays: [1, 2, 3, 4] })] });
    const first = enemyDigest(state, 5, RULES);
    expect(first.features.filter((x) => x.kind === 'runaround')).toHaveLength(1);
    const settled: EnemyState = { ...state, sketch: [...state.sketch, ...first.features],
      featureCounter: state.featureCounter + first.features.length };
    expect(enemyDigest(settled, 6, RULES).features.some((x) => x.kind === 'runaround')).toBe(false);
  });

  it('two guards working the SAME day spend one action night, not two', () => {
    const twoPosts: WatchPost[] = [{ guard: 'gale', venue: 'square-w0' }, { guard: 'hugo', venue: 'square-w0' }];
    const oneNight = runaroundState({ evidenceAfterStart: [],
      ledger: [watchRow({ posts: twoPosts, workedDays: [1] })] });
    expect(enemyDigest(oneNight, 3, RULES).features.some((x) => x.kind === 'runaround')).toBe(false);

    const twoNights = runaroundState({ evidenceAfterStart: [],
      ledger: [watchRow({ posts: twoPosts, workedDays: [1, 2] })] });
    const d = enemyDigest(twoNights, 3, RULES);
    expect(d.features.filter((x) => x.kind === 'runaround')).toHaveLength(1);
    expect(d.tailDrops).toHaveLength(1);
  });

  it('an intended watch with no ledger row spends nothing — runaround reads the ledger only', () => {
    const state = runaroundState({ evidenceAfterStart: [], ledger: [] });
    const d = enemyDigest(state, 3, RULES);
    expect(d.features.some((x) => x.kind === 'runaround')).toBe(false);
    expect(d.tailDrops).toBeUndefined();
  });

  it('a ledger row whose posts were accepted but never actually stood spends nothing', () => {
    const state = runaroundState({ evidenceAfterStart: [], ledger: [watchRow({ workedDays: [] })] });
    expect(enemyDigest(state, 3, RULES).features.some((x) => x.kind === 'runaround')).toBe(false);
  });

  it('a missing, subject-less, or evidence-less lead means no runaround and no tail drop', () => {
    const missing = runaroundState({ evidenceAfterStart: [], sketch: [] });
    expect(enemyDigest(missing, 3, RULES).tailDrops).toBeUndefined();

    const subjectless = runaroundState({ evidenceAfterStart: [],
      sketch: [{ ...LEAD, subject: null }] });
    expect(enemyDigest(subjectless, 3, RULES).tailDrops).toBeUndefined();

    const districtless = runaroundState({ evidenceAfterStart: [],
      sketch: [{ ...LEAD, district: null }] });
    expect(enemyDigest(districtless, 3, RULES).tailDrops).toBeUndefined();

    const trailless = runaroundState({ evidenceAfterStart: [], sketch: [{ ...LEAD, evidence: [] }] });
    expect(enemyDigest(trailless, 3, RULES).features.some((x) => x.kind === 'runaround')).toBe(false);

    const mismatched = runaroundState({ evidenceAfterStart: [],
      ledger: [watchRow({ leadFeatureId: 'lead-nobody' })] });
    expect(enemyDigest(mismatched, 3, RULES).tailDrops).toBeUndefined();

    const unbound = runaroundState({ evidenceAfterStart: [], ledger: [watchRow({ leadFeatureId: null })] });
    expect(enemyDigest(unbound, 3, RULES).tailDrops).toBeUndefined();
  });

  it('evidence outside the watch window, at another post, or about someone else is unproductive', () => {
    const cases: Record<string, EvidenceEntry> = {
      'before the window': heardAtPost(2, { tick: 2 * TICKS_PER_DAY + WATCH.from - 15 }),
      'at the closing bound (exclusive)': heardAtPost(2, { tick: 2 * TICKS_PER_DAY + WATCH.to }),
      'another venue': heardAtPost(2, { venue: 'square-w1', observer: 'hugo' }),
      'another observer': heardAtPost(2, { observer: 'hugo' }),
      'another day': heardAtPost(0),
      'someone else entirely': heardAtPost(2, { speaker: 'rosa', addressedTo: 'quill', family: 'f9',
        reported: { subject: 'rosa', predicate: 'stole', object: null, count: 2, severity: 4,
          place: null, attribution: 'quill' } }),
    };
    for (const [label, entry] of Object.entries(cases)) {
      const state = runaroundState({ evidenceAfterStart: [entry] });
      expect(enemyDigest(state, 3, RULES).features.some((x) => x.kind === 'runaround'), label).toBe(true);
    }
  });

  it('the subject touch rule reads speaker, addressee, reported fields, and the bound about-key', () => {
    const touching: Record<string, EvidenceEntry> = {
      speaker: heardAtPost(2, { speaker: 'mira', addressedTo: 'otto' }),
      addressee: heardAtPost(2, { speaker: 'otto', addressedTo: 'mira' }),
      'reported subject': heardAtPost(2, { speaker: 'otto', addressedTo: 'rosa', family: 'f9',
        reported: { subject: 'mira', predicate: 'stole', object: null, count: 2, severity: 4,
          place: null, attribution: SOMEONE } }),
      'reported object': heardAtPost(2, { speaker: 'otto', addressedTo: 'rosa', family: 'f9',
        reported: { subject: 'otto', predicate: 'stole', object: 'mira', count: 2, severity: 4,
          place: null, attribution: SOMEONE } }),
      'reported attribution': heardAtPost(2, { speaker: 'otto', addressedTo: 'rosa', family: 'f9',
        reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4,
          place: null, attribution: 'mira' } }),
      'the bound about family': heardAtPost(2, { speaker: 'otto', addressedTo: 'rosa', family: 'f0',
        reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4,
          place: null, attribution: SOMEONE } }),
    };
    for (const [label, entry] of Object.entries(touching)) {
      const state = runaroundState({ evidenceAfterStart: [entry] });
      expect(enemyDigest(state, 3, RULES).features.some((x) => x.kind === 'runaround'), label).toBe(false);
    }
  });

  it('an interrogation row spends its one askedAt day under the INTERROGATION window', () => {
    const interrogation = (over: Partial<EnemyActionLedgerEntry> = {}): EnemyActionLedgerEntry => ({
      orderKey: 'interrogation:mira:f:f0', kind: 'interrogation', directiveIds: ['d1'],
      leadFeatureId: 'lead-0', subject: 'mira', about: { family: 'f0' }, district: 'w0',
      scheduleStartDay: 1, posts: [{ guard: 'gale', venue: 'guard-post-w0' }],
      workedDays: [], askedAt: null, ...over,
    });
    const wasted = runaroundState({ evidenceAfterStart: [], ledger: [
      interrogation({ orderKey: 'interrogation:a', askedAt: at(1, 15, 30) }),
      interrogation({ orderKey: 'interrogation:b', askedAt: at(2, 15, 30) }),
    ] });
    const d = enemyDigest(wasted, 3, RULES);
    expect(d.features.some((x) => x.kind === 'runaround')).toBe(true);
    expect(d.tailDrops).toEqual([{
      leadFeatureId: 'lead-0', subject: 'mira', district: 'w0', watchStartDay: 1, untilDay: 5,
    }]);

    const answered = runaroundState({
      evidenceAfterStart: [heardAtPost(2, { tick: at(2, 15, 45), venue: 'guard-post-w0',
        mode: 'answer', overheard: false, speaker: 'mira', addressedTo: 'gale' })],
      ledger: [
        interrogation({ orderKey: 'interrogation:a', askedAt: at(1, 15, 30) }),
        interrogation({ orderKey: 'interrogation:b', askedAt: at(2, 15, 30) }),
      ],
    });
    expect(enemyDigest(answered, 3, RULES).features.some((x) => x.kind === 'runaround')).toBe(false);
    expect(INTERROGATION.from).toBeLessThanOrEqual(at(0, 15, 30));
  });

  // The plan gives a WATCH the broad subject-touch rule and an INTERROGATION "its exact
  // guard/venue/about rule". HQ bought an answer about f0; the target talking about f9 at the
  // right table at the right minute is not that answer, however much she says the word "mira".
  const interrogationRow = (over: Partial<EnemyActionLedgerEntry> = {}): EnemyActionLedgerEntry => ({
    orderKey: 'interrogation:mira:f:f0', kind: 'interrogation', directiveIds: ['d1'],
    leadFeatureId: 'lead-0', subject: 'mira', about: { family: 'f0' }, district: 'w0',
    scheduleStartDay: 1, posts: [{ guard: 'gale', venue: 'guard-post-w0' }],
    workedDays: [], askedAt: null, ...over,
  });

  /** The interrogated subject, at the right post, in the window — talking about an unrelated story. */
  const unrelatedAtTheTable = (day: number): EvidenceEntry => ({
    tick: day * TICKS_PER_DAY + INTERROGATION.from + 45, venue: 'guard-post-w0', observer: 'gale',
    overheard: false, speaker: 'mira', addressedTo: 'gale', kind: 'utterance', mode: 'answer',
    claimId: `c-f9-${day}`, family: 'f9',
    reported: { subject: 'rosa', predicate: 'stole', object: null, count: 2, severity: 4,
      place: null, attribution: SOMEONE },
    about: null,
  });

  it('an interrogation night needs its EXACT about — an unrelated story from the target is no answer', () => {
    const state = runaroundState({
      evidenceAfterStart: [unrelatedAtTheTable(1), unrelatedAtTheTable(2)],
      ledger: [
        interrogationRow({ orderKey: 'interrogation:a', askedAt: at(1, 15, 30) }),
        interrogationRow({ orderKey: 'interrogation:b', askedAt: at(2, 15, 30) }),
      ],
    });
    const d = enemyDigest(state, 3, RULES);
    expect(d.features.some((x) => x.kind === 'runaround')).toBe(true);
    expect(d.tailDrops).toEqual([{
      leadFeatureId: 'lead-0', subject: 'mira', district: 'w0', watchStartDay: 1, untilDay: 5,
    }]);
  });

  it('…while a WATCH keeps the broad rule verbatim: the same unrelated mention still counts', () => {
    // One rule per order kind, and the difference is observable on identical evidence: the watch's
    // subject-touch arm fires on the very entry the interrogation's about-rule rejects.
    const watched = runaroundState({
      evidenceAfterStart: [{ ...unrelatedAtTheTable(2), venue: 'square-w0',
        tick: 2 * TICKS_PER_DAY + WATCH.from + 45 }],
    });
    expect(enemyDigest(watched, 3, RULES).features.some((x) => x.kind === 'runaround')).toBe(false);
  });
});

describe('runaround cooldown — a burnt subject leaves the fresh-lead pool for exactly two days', () => {
  /** Enough story evidence for w0 to be watchable while mira stays the only w0 lead subject. */
  function watchableState(runaroundDay: number | null): EnemyState {
    const story = (over: Partial<Extract<EvidenceEntry, { kind: 'utterance' }>>): EvidenceEntry => ({
      tick: at(0, 8), venue: 'square-w1', observer: 'hugo', overheard: true,
      speaker: 'rosa', addressedTo: 'quill', kind: 'utterance', mode: 'telling',
      claimId: 'cs0', family: 'f7',
      reported: { subject: 'rosa', predicate: 'stole', object: null, count: 2, severity: 4,
        place: null, attribution: SOMEONE },
      about: null, ...over,
    });
    const sketch: SketchFeature[] = [
      { ...LEAD, evidence: LEAD.evidence.map((ref) => ({ ...ref })) },
      { id: 'w0-a', kind: 'district-activity', day: 0, family: 'f8', subject: null, district: 'w0',
        detail: 'staged w0 chatter', evidence: [{ tick: at(0, 9), observer: 'gale', claimId: 'cs9', messageId: null }] },
    ];
    if (runaroundDay !== null) {
      sketch.push({ id: 'ra-0', kind: 'runaround', day: runaroundDay, family: 'f0', subject: 'mira',
        district: 'w0', detail: 'staged runaround', evidence: LEAD.evidence.map((ref) => ({ ...ref })) });
    }
    return {
      ...emptyEnemyState(), observers: OBSERVERS.map((spec) => ({ ...spec })), map: MAP,
      evidence: [
        story({}),
        story({ tick: at(0, 9), claimId: 'cs1', speaker: 'quill', addressedTo: 'rosa' }),
        story({ tick: at(0, 10), claimId: 'cs2', speaker: 'rosa', addressedTo: 'hugo',
          mode: 'answer', overheard: false }),
      ],
      sketch, featureCounter: sketch.length, watchedDistricts: [],
      inquiriesIssued: ['f:f7', 's:rosa'],
    };
  }

  it('a fresh watch binds the only w0 lead subject when no runaround is in force', () => {
    const d = enemyDigest(watchableState(null), 4, RULES);
    const w0 = d.watches.find((w) => w.district === 'w0');
    expect(w0).toMatchObject({ subject: 'mira', leadFeatureId: 'lead-0', about: { family: 'f0' } });
  });

  it('a runaround inside the cooldown keeps that subject out of the new watch lead', () => {
    const d = enemyDigest(watchableState(4), 4, RULES);
    const w0 = d.watches.find((w) => w.district === 'w0')!;
    expect('subject' in w0).toBe(false);
    expect('about' in w0).toBe(false);
    expect('leadFeatureId' in w0).toBe(false);
  });

  it('the cooldown expires exactly at runaround.day + RUNAROUND_COOLDOWN_DAYS', () => {
    const lastBlocked = enemyDigest(watchableState(4), 4 + RUNAROUND_COOLDOWN_DAYS - 1, RULES);
    expect('subject' in lastBlocked.watches.find((w) => w.district === 'w0')!).toBe(false);

    const released = enemyDigest(watchableState(4), 4 + RUNAROUND_COOLDOWN_DAYS, RULES);
    expect(released.watches.find((w) => w.district === 'w0')).toMatchObject({ subject: 'mira' });
  });

  it('the v1 pins are the plan\'s exact numbers, in one place', () => {
    expect(RUNAROUND_WASTED_NIGHTS).toBe(2);
    expect(RUNAROUND_COOLDOWN_DAYS).toBe(2);
  });
});

// ── The lawful brief lead: only captured SPEECH can seed one, and one exact precedence rule
// aims it. Nothing here reads a DirectiveRecord, player state, or a hidden payload field. ──

function briefWith(mission: DirectiveMission): DirectiveBrief {
  return {
    mission, priority: 'important', authority: 'office', discretion: 'quiet',
    specificity: 'detailed', guidance: [], active: { from: 0, until: at(9, 23, 59) },
    report: 'outcome', reportBy: null, purpose: null,
  };
}

type ShapeAudience = { kind: 'person'; id: string } | { kind: 'venue'; id: string };

const shape = (
  claimSubject: string, audience: ShapeAudience,
  operation: 'spread' | 'suppress' | 'redirect' = 'spread',
  redirectTo = 'nobody',
  family: string | null = null,
): DirectiveMission => {
  const payload = { family, parent: null, claim: { subject: claimSubject, predicate: 'stole',
    object: null, count: 2, severity: 4, place: null, attribution: SOMEONE } } as const;
  return operation === 'redirect'
    ? { kind: 'shape', operation, redirectTo, audience, payload }
    : { kind: 'shape', operation, redirectTo: null, audience, payload };
};

function capturedBrief(
  mission: DirectiveMission,
  kind: 'directive' | 'handler-brief' = 'handler-brief',
  over: { messageId?: string; sourceDirectiveId?: string | null; directiveId?: string } = {},
): EvidenceEntry {
  const brief = briefWith(mission);
  const spoken: SpokenNetworkPayload = kind === 'handler-brief'
    ? { kind: 'handler-brief', brief, claimedIssuer: 'you', onwardTo: null, replyRoute: null }
    : { kind: 'directive', directiveId: over.directiveId ?? 'p1', brief, claimedIssuer: 'you',
        onwardTo: null, replyRoute: null };
  return {
    tick: at(0, 16), venue: 'square-w0', observer: 'gale', overheard: false,
    speaker: 'mira', addressedTo: 'gale', kind: 'network', mode: null,
    claimId: null, family: null, reported: null, about: null,
    network: {
      messageId: over.messageId ?? 'n-brief',
      sourceDirectiveId: over.sourceDirectiveId === undefined ? 'p1' : over.sourceDirectiveId,
      spoken,
    },
  };
}

function stateWithCaptures(evidence: EvidenceEntry[], over: Partial<EnemyState> = {}): EnemyState {
  return {
    ...emptyEnemyState(), observers: OBSERVERS.map((spec) => ({ ...spec })), map: MAP,
    evidence, ...over,
  };
}

describe('the lawful brief lead — decoy-subject precedence, one rule, evaluated top-down', () => {
  // With ONLY network captures staged, no story heuristic can fire — every feature the digest
  // grows here is a brief lead, so the assertions need no detail-string coupling.
  const leadOf = (evidence: EvidenceEntry[], state: Partial<EnemyState> = {}) =>
    enemyDigest(stateWithCaptures(evidence, state), 1, RULES).features;

  it('(1) learn with a directory person target profiles that person', () => {
    expect(leadOf([capturedBrief({ kind: 'learn', target: { kind: 'person', id: 'mira' } })]))
      .toEqual([expect.objectContaining({ kind: 'carrier-profile', subject: 'mira', district: 'w0', family: null })]);
  });

  it('(2) a named claim subject wins over a present person audience — the aiming lever', () => {
    expect(leadOf([capturedBrief(shape('otto', { kind: 'person', id: 'mira' }, 'spread', 'nobody', 'f3'))]))
      .toEqual([expect.objectContaining({ kind: 'carrier-profile', subject: 'otto', family: 'f3' })]);
  });

  it('(3) a redirect whose claim subject is SOMEONE reads redirectTo as the carrier', () => {
    expect(leadOf([capturedBrief(shape(SOMEONE, { kind: 'person', id: 'mira' }, 'redirect', 'otto'))]))
      .toEqual([expect.objectContaining({ kind: 'carrier-profile', subject: 'otto' })]);
    // …and a redirect whose claim subject IS directory-known keeps arm 2's precedence.
    expect(leadOf([capturedBrief(shape('rosa', { kind: 'person', id: 'mira' }, 'redirect', 'otto'))]))
      .toEqual([expect.objectContaining({ kind: 'carrier-profile', subject: 'rosa' })]);
  });

  it('(4) a SOMEONE-subject spread falls through to the directory person audience', () => {
    expect(leadOf([capturedBrief(shape(SOMEONE, { kind: 'person', id: 'mira' }))]))
      .toEqual([expect.objectContaining({ kind: 'carrier-profile', subject: 'mira' })]);
  });

  it('(5) a venue audience is district activity with no subject at all', () => {
    expect(leadOf([capturedBrief(shape(SOMEONE, { kind: 'venue', id: 'square-w1' }))]))
      .toEqual([expect.objectContaining({ kind: 'district-activity', subject: null, district: 'w1' })]);
    expect(leadOf([capturedBrief({ kind: 'learn', target: { kind: 'venue', id: 'square-w1' } })]))
      .toEqual([expect.objectContaining({ kind: 'district-activity', subject: null, district: 'w1' })]);
  });

  it('(6) a learn-story brief, an all-SOMEONE brief, and a sound-out seed no lead in v1', () => {
    expect(leadOf([capturedBrief({ kind: 'learn', target: { kind: 'story', family: 'f4' } })])).toEqual([]);
    expect(leadOf([capturedBrief(shape(SOMEONE, { kind: 'person', id: 'stranger' }))])).toEqual([]);
    expect(leadOf([capturedBrief(shape(SOMEONE, { kind: 'person', id: 'stranger' }, 'redirect'))])).toEqual([]);
    expect(leadOf([capturedBrief({ kind: 'learn', target: { kind: 'person', id: 'stranger' } })])).toEqual([]);
    expect(leadOf([capturedBrief({ kind: 'sound-out', target: 'mira', topic: 'recruitment',
      handle: null, meeting: null })])).toEqual([]);
  });

  it('a relay hop that retargeted the brief in transit retargets the lead — channel physics', () => {
    // The authored brief names SOMEONE. At tick 0 the player physically hands it to cyn; at tick 15
    // cyn's registered attributor trait projects the carried version before speaking it to ada. Ada
    // is the embodied spymaster and captures only that RECEIVED version.
    const fixture = miniTown();
    fixture.npcs = fixture.npcs.map((npc) => npc.id === 'ada'
      ? { ...npc, schedule: [
          { days: 'all' as const, from: 0, to: 14, venue: 'backroom' },
          { days: 'all' as const, from: 15, to: 1439, venue: 'square' },
        ] }
      : npc);
    const world = buildWorld(fixture, 'runaround-real-attributor', RULES);
    world.enemy.map = buildTownMap(fixture);
    world.network.spymaster = 'ada';
    world.enemy.observers = [];
    enrollPlayer(world, { home: 'square' });
    world.network.assets.push(
      { id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] },
      { id: 'cyn', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] },
    );
    const action: Action = {
      tick: 0, kind: 'directive', recipient: 'ada',
      handoff: { outboundVia: ['cyn'], reportVia: [] },
      brief: briefWith(shape(SOMEONE, { kind: 'venue', id: 'square' }, 'redirect')),
    };
    runLogOn(world, RULES, [action], 16);

    const message = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
    expect(message).toMatchObject({
      route: ['cyn', 'ada'], processedRelayHops: [1], deliveredAt: 15,
    });
    expect(message.payload.kind === 'directive'
      && message.payload.version.brief.mission.kind === 'shape'
      ? message.payload.version.brief.mission.payload.claim.subject : null).toBe('dov');
    const received = world.enemy.evidence.find((entry): entry is Extract<EvidenceEntry, { kind: 'network' }> =>
      entry.kind === 'network' && entry.network.messageId === message.id)!;
    expect(received.network.spoken.kind === 'directive'
      && received.network.spoken.brief.mission.kind === 'shape'
      ? received.network.spoken.brief.mission.payload.claim.subject : null).toBe('dov');

    const lead = enemyDigest(world.enemy, 1, RULES).features.find((feature) =>
      feature.kind === 'carrier-profile');
    expect(lead).toMatchObject({ subject: 'dov', district: 'd0' });
    expect(lead!.evidence).toEqual([{
      tick: 15, observer: 'ada', claimId: null, messageId: message.id,
    }]);
  });

  it('a lawfully received player handler-brief seeds a lead; the enemy\'s own order never does', () => {
    const own = capturedBrief({ kind: 'learn', target: { kind: 'person', id: 'mira' } }, 'directive',
      { sourceDirectiveId: 'e9', directiveId: 'e9' });
    expect(leadOf([own], { issuedDirectiveIds: ['e9'] })).toEqual([]);
    expect(leadOf([own], { issuedDirectiveIds: ['other'] }))
      .toEqual([expect.objectContaining({ subject: 'mira' })]);

    const stolen = capturedBrief({ kind: 'learn', target: { kind: 'person', id: 'mira' } });
    expect(leadOf([stolen], { issuedDirectiveIds: ['e9'] }))
      .toEqual([expect.objectContaining({ subject: 'mira' })]);
  });

  it('an enemy-authored order with only a spoken directiveId is still recognised as its own', () => {
    const own = capturedBrief({ kind: 'learn', target: { kind: 'person', id: 'mira' } }, 'directive',
      { sourceDirectiveId: null, directiveId: 'e9' });
    expect(leadOf([own], { issuedDirectiveIds: ['e9'] })).toEqual([]);
  });

  it('an own directive OR directive-report can never corroborate a productive night', () => {
    const ownAtPost: Extract<EvidenceEntry, { kind: 'network' }> = {
      ...(capturedBrief({ kind: 'learn', target: { kind: 'person', id: 'mira' } }, 'directive',
        { sourceDirectiveId: 'e9', directiveId: 'e9' }) as Extract<EvidenceEntry, { kind: 'network' }>),
      tick: 2 * TICKS_PER_DAY + WATCH.from + 15, venue: 'square-w0', observer: 'gale',
      speaker: 'mira', addressedTo: 'gale',
    };
    const reportAtPost: Extract<EvidenceEntry, { kind: 'network' }> = {
      ...ownAtPost,
      network: {
        messageId: 'n-own-report', sourceDirectiveId: null,
        spoken: {
          kind: 'directive-report', directiveId: 'e9',
          report: {
            outcome: 'worked', reason: null, evidence: null, source: 'mira', uncertainty: null,
          },
          enemyAction: null, factRefs: [], onwardTo: null,
        },
      },
    };
    for (const entry of [ownAtPost, reportAtPost]) {
      const state = runaroundState({ evidenceAfterStart: [entry] });
      state.issuedDirectiveIds = ['e9'];
      expect(enemyDigest(state, 3, RULES).features.some((x) => x.kind === 'runaround')).toBe(true);
    }

    const foreign = { ...ownAtPost };
    const notOwn = runaroundState({ evidenceAfterStart: [foreign] });
    notOwn.issuedDirectiveIds = ['unrelated'];
    expect(enemyDigest(notOwn, 3, RULES).features.some((x) => x.kind === 'runaround')).toBe(false);
  });

  it('report envelopes, compartment facts, sketch tips, and recruitment payloads seed nothing', () => {
    const wrap = (spoken: SpokenNetworkPayload): EvidenceEntry => ({
      tick: at(0, 16), venue: 'square-w0', observer: 'gale', overheard: false,
      speaker: 'mira', addressedTo: 'gale', kind: 'network', mode: null,
      claimId: null, family: null, reported: null, about: null,
      network: { messageId: 'n-x', sourceDirectiveId: null, spoken },
    });
    const brief = briefWith({ kind: 'learn', target: { kind: 'person', id: 'mira' } });
    const report = { outcome: 'watch worked', reason: null, evidence: null, source: null, uncertainty: null };
    expect(leadOf([wrap({ kind: 'directive-report', directiveId: 'p1', report, enemyAction: null,
      factRefs: [], onwardTo: null })])).toEqual([]);
    expect(leadOf([wrap({ kind: 'compartment-fact', asset: 'mira',
      fact: { tick: 0, kind: 'recruited-by', ref: 'you' }, onwardTo: null })])).toEqual([]);
    expect(leadOf([wrap({ kind: 'sketch-tip', asset: 'mira', subject: 'mira', detail: 'x', onwardTo: null })])).toEqual([]);
    expect(leadOf([wrap({ kind: 'recruitment-approach', approachId: 'a0', recruiter: 'you',
      target: 'mira', mice: null, leverageFamily: null, onwardTo: null })])).toEqual([]);
    expect(leadOf([wrap({ kind: 'field-report', items: [{ observation: {
      kind: 'network-speech', observedAt: at(0, 16), venue: 'square-w0', speaker: 'you',
      addressedTo: 'mira', overheard: false, messageId: 'n-inner',
      spoken: { kind: 'handler-brief', brief, claimedIssuer: 'you', onwardTo: null, replyRoute: null },
    }, factRefs: [] }], onwardTo: null })])).toEqual([]);
  });

  it('a field report contributes its CONTAINED original message id, never the envelope id', () => {
    // Ada hears the original network speech at square while the spymaster is across town. The real
    // capture path holds it; Ada then physically carries a field report to cyn at the next beat.
    const fixture = miniTown();
    fixture.npcs = fixture.npcs.map((npc) => {
      if (npc.id === 'ada') return {
        ...npc,
        // This fixture exercises field-report provenance, so use Ada's literal pass-through channel
        // instead of her skeptic gate, which lawfully withholds a one-source report.
        traits: npc.traits.filter((trait) => trait !== 'skeptic'),
        schedule: [
          { days: 'all' as const, from: 0, to: 14, venue: 'square' },
          { days: 'all' as const, from: 15, to: 1439, venue: 'backroom' },
        ],
      };
      if (npc.id === 'cyn') return { ...npc, schedule: [
        { days: 'all' as const, from: 0, to: 1439, venue: 'backroom' },
      ] };
      return npc;
    });
    const world = buildWorld(fixture, 'runaround-contained-provenance', RULES);
    world.enemy.map = buildTownMap(fixture);
    world.network.spymaster = 'cyn';
    world.enemy.observers = [{ id: 'ada', vigilance: 1 }];
    enrollPlayer(world, { home: 'square' });
    world.network.assets.push({
      id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
    });
    const action: Action = {
      tick: 0, kind: 'directive', recipient: 'bez',
      handoff: { outboundVia: [], reportVia: [] },
      brief: briefWith({ kind: 'learn', target: { kind: 'person', id: 'dov' } }),
    };
    runLogOn(world, RULES, [action], 16);

    const original = world.network.directiveState!.messages.find((row) =>
      row.payload.kind === 'directive')!;
    const envelope = world.network.directiveState!.messages.find((row) =>
      row.payload.kind === 'field-report')!;
    expect(envelope).toMatchObject({ origin: 'ada', deliveredAt: 15 });
    const heldOriginal = world.network.directiveState!.heldObservations.find((row) =>
      row.content.kind === 'raw' && row.content.observation.kind === 'network-speech'
      && row.content.observation.messageId === original.id);
    expect(heldOriginal).toMatchObject({
      observer: 'ada', queuedIn: envelope.id, deliveredAt: 15,
    });
    const receivedEnvelope = world.enemy.evidence.find((entry): entry is Extract<
      EvidenceEntry, { kind: 'network' }
    > => entry.kind === 'network' && entry.network.messageId === envelope.id);
    expect(receivedEnvelope?.network.spoken).toMatchObject({
      kind: 'field-report',
      // The pass-through reporter lawfully returns everything it heard (the original directive
      // AND the recipient's overheard spoken response) — the claim is containment, not count.
      items: expect.arrayContaining([expect.objectContaining({
        observation: expect.objectContaining({
          kind: 'network-speech', messageId: original.id,
        }),
      })]),
    });

    const contained = world.enemy.evidence.find((entry) =>
      entry.kind === 'network' && entry.network.messageId === original.id)!;
    expect(contained).toMatchObject({ tick: 0, observer: 'ada', speaker: 'you', addressedTo: 'bez' });
    expect(contained.kind === 'network' ? contained.network.messageId : null).not.toBe(envelope.id);
    const lead = enemyDigest(world.enemy, 1, RULES).features.find((feature) =>
      feature.kind === 'carrier-profile' && feature.subject === 'dov')!;
    expect(lead.evidence).toEqual([{
      tick: 0, observer: 'ada', claimId: null, messageId: original.id,
    }]);

    // The fair-cop ref resolves against the production-recorded original speech, not the envelope.
    const ref = lead.evidence[0]!;
    const chronicle = world.chronicle.find((row) => row.kind === 'network-speech'
      && row.tick === ref.tick && row.messageId === ref.messageId
      && row.heardBy.some((heard) => heard.id === ref.observer));
    expect(chronicle).toBeDefined();
  });

  it('a brief lead never duplicates an existing profile for the same subject', () => {
    const captured = capturedBrief({ kind: 'learn', target: { kind: 'person', id: 'mira' } });
    const state = stateWithCaptures([captured], {
      sketch: [{ ...LEAD, evidence: LEAD.evidence.map((ref) => ({ ...ref })) }], featureCounter: 1,
    });
    expect(enemyDigest(state, 1, RULES).features.filter((f) => f.subject === 'mira')).toEqual([]);
  });
});

describe('the evidence ref shape — a network ref carries its message id', () => {
  it('a claim ref keeps messageId null and a network ref carries the observed message id', () => {
    const state = stateWithCaptures([
      {
        tick: at(0, 8), venue: 'square-w0', observer: 'gale', overheard: true,
        speaker: 'mira', addressedTo: 'otto', kind: 'utterance', mode: 'telling',
        claimId: 'c0', family: 'f0',
        reported: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4,
          place: null, attribution: SOMEONE },
        about: null,
      },
      capturedBrief({ kind: 'learn', target: { kind: 'person', id: 'rosa' } }, 'handler-brief',
        { messageId: 'n-42' }),
    ]);
    const d = enemyDigest(state, 1, RULES);
    const entryPoint = d.features.find((f) => f.kind === 'entry-point')!;
    expect(entryPoint.evidence).toEqual([{ tick: at(0, 8), observer: 'gale', claimId: 'c0', messageId: null }]);
    const lead = d.features.find((f) => f.subject === 'rosa')!;
    expect(lead.evidence).toEqual([{ tick: at(0, 16), observer: 'gale', claimId: null, messageId: 'n-42' }]);
  });
});
