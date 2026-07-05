import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { stableStringify } from '../../src/sim/hash';
import { watchfordWorld } from '../sim/helpers/watchford-world';
import { enrollPlayer } from '../../src/sim/world';
import { runLogOn, type ActionLog } from '../../src/sim/campaign';
import { STANDARD_RULES } from '../../src/content/rules';
import { at } from '../../src/core/time';
import type { HypothesisCard, IntelEntry } from '../../src/intel/entry';
import type { ReportedClaim, SketchFeature } from '../../src/sim/enemy/state';
import { counterSignals, counterSketchView } from '../../src/intel/countersketch';

// A ReportedClaim with the shared 7 content fields; override any for a variant.
function rc(over: Partial<ReportedClaim> = {}): ReportedClaim {
  return {
    subject: 'otto', predicate: 'stole', object: null,
    count: 2, severity: 3, place: null, attribution: SOMEONE, ...over,
  };
}

// Hand-built log rows over the Task-2 blank pattern: fill the 5 required, override the rest.
function entry(over: Partial<IntelEntry> = {}): IntelEntry {
  return {
    ...blankIntel(),
    tick: 0, venue: 'square-w0', via: 'self', kind: 'utterance', overheard: true,
    ...over,
  };
}

describe('counterSignals — questioning: authority askings grouped by about-key', () => {
  it('two authority askings about family f0 collapse into one signal; civilian curiosity is excluded', () => {
    const log: IntelEntry[] = [
      entry({
        kind: 'asking', tick: 10, speaker: 'guard1', addressedTo: 'mira',
        authority: true, about: { family: 'f0' }, family: 'f0',
      }), // idx0 — authority
      entry({
        kind: 'asking', tick: 20, speaker: 'quill', addressedTo: 'otto',
        authority: false, about: { family: 'f0' }, family: 'f0',
      }), // idx1 — civilian curiosity, same family, must be excluded
      entry({
        kind: 'asking', tick: 30, speaker: 'guard1', addressedTo: 'sten',
        authority: true, about: { family: 'f0' }, family: 'f0',
      }), // idx2 — authority
    ];
    const signals = counterSignals(log);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ kind: 'questioning', key: 'f:f0', entryIndexes: [0, 2] });
  });

  it('keys subject-form inquiries as s:<subject>, distinct families/subjects stay separate', () => {
    const log: IntelEntry[] = [
      entry({
        kind: 'asking', tick: 10, speaker: 'guard1', addressedTo: 'mira',
        authority: true, about: { subject: 'otto' }, family: null,
      }),
      entry({
        kind: 'asking', tick: 20, speaker: 'guard1', addressedTo: 'quill',
        authority: true, about: { family: 'f1' }, family: 'f1',
      }),
    ];
    const signals = counterSignals(log).filter((s) => s.kind === 'questioning');
    expect(signals.map((s) => s.key)).toEqual(['f:f1', 's:otto']);
  });
});

describe('counterSignals — watch: presence grouped by (actor, venue)', () => {
  it('hugo at square-w0 two days running collapses into one signal with both indexes', () => {
    const log: IntelEntry[] = [
      entry({ kind: 'presence', tick: at(0, 18), venue: 'square-w0', actor: 'hugo' }), // idx0
      entry({ kind: 'presence', tick: at(1, 18), venue: 'square-w0', actor: 'hugo' }), // idx1
    ];
    const signals = counterSignals(log);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ kind: 'watch', key: 'hugo@square-w0', entryIndexes: [0, 1] });
  });

  it('a different actor or venue keys a separate signal', () => {
    const log: IntelEntry[] = [
      entry({ kind: 'presence', tick: at(0, 18), venue: 'square-w0', actor: 'hugo' }),
      entry({ kind: 'presence', tick: at(0, 18), venue: 'square-w1', actor: 'hugo' }),
      entry({ kind: 'presence', tick: at(0, 18), venue: 'square-w0', actor: 'gale' }),
    ];
    const signals = counterSignals(log).filter((s) => s.kind === 'watch');
    expect(signals.map((s) => s.key)).toEqual(['gale@square-w0', 'hugo@square-w0', 'hugo@square-w1']);
  });
});

describe('counterSignals — compelled-answer: answers addressed to a prior authority asker', () => {
  const answer = (): IntelEntry => entry({
    kind: 'utterance', tick: 20, speaker: 'mira', addressedTo: 'guard1',
    mode: 'answer', claimId: 'c1', family: 'f0', reported: rc(),
  });

  it('an answer whose addressedTo previously issued an authority asking is flagged compelled', () => {
    const priorAuthorityAsk = entry({
      kind: 'asking', tick: 10, speaker: 'guard1', addressedTo: 'mira',
      authority: true, about: { subject: 'mira' },
    });
    const log = [priorAuthorityAsk, answer()];
    const compelled = counterSignals(log).find((s) => s.kind === 'compelled-answer');
    expect(compelled).toMatchObject({ kind: 'compelled-answer', key: 'guard1', entryIndexes: [1] });
  });

  it('the same answer with no prior authority asking at all produces no compelled-answer signal', () => {
    const log = [answer()];
    expect(counterSignals(log).find((s) => s.kind === 'compelled-answer')).toBeUndefined();
  });

  it('a prior asking from the same speaker that lacks authority does not compel', () => {
    const civilianAsk = entry({
      kind: 'asking', tick: 10, speaker: 'guard1', addressedTo: 'mira',
      authority: false, about: { subject: 'mira' },
    });
    const log = [civilianAsk, answer()];
    expect(counterSignals(log).find((s) => s.kind === 'compelled-answer')).toBeUndefined();
  });

  it('an authority asking that arrives AFTER the answer does not retroactively compel it', () => {
    const laterAuthorityAsk = entry({
      kind: 'asking', tick: 30, speaker: 'guard1', addressedTo: 'mira',
      authority: true, about: { subject: 'mira' },
    });
    const log = [answer(), laterAuthorityAsk];
    expect(counterSignals(log).find((s) => s.kind === 'compelled-answer')).toBeUndefined();
  });
});

describe('counterSketchView — cards pass through untouched, sorted by id', () => {
  it('sorts cards by id without cloning or mutating them', () => {
    const cardB: HypothesisCard = {
      id: 'b', text: 'hunter closing in', confidence: 0.4, links: [], createdTick: 0, updatedTick: 0,
    };
    const cardA: HypothesisCard = {
      id: 'a', text: 'decoy planted', confidence: 0.9, links: ['x'], createdTick: 0, updatedTick: 10,
    };
    const cards = [cardB, cardA];
    const view = counterSketchView([], cards);
    expect(view.cards.map((c) => c.id)).toEqual(['a', 'b']);
    expect(view.cards[0]).toBe(cardA); // same reference — byte-untouched, no cloning
    expect(view.cards[1]).toBe(cardB);
    expect(cards).toEqual([cardB, cardA]); // the input array itself is not reordered in place
  });

  it('never mutates the input log', () => {
    const log: IntelEntry[] = [
      entry({ kind: 'presence', tick: at(0, 18), venue: 'square-w0', actor: 'hugo' }),
      entry({ kind: 'presence', tick: at(1, 18), venue: 'square-w0', actor: 'hugo' }),
    ];
    const before = stableStringify(log);
    counterSketchView(log, []);
    expect(stableStringify(log)).toBe(before);
  });
});

describe('the mirror — enemy sketch state cannot reach the Counter-Sketch board (Plan 4 mirror, board direction)', () => {
  // Extends Plan 4's mirror test (tests/sim/no-omniscience.test.ts): two identical Watchford
  // campaigns, a sub-threshold SketchFeature pushed straight onto ONE world's enemy.sketch
  // (non-colliding id, featureCounter NOT advanced — a raw mind-state poke, never a landed
  // decision), a day run on both. If the board ever read `world.enemy` this would diverge;
  // it can't, because counterSketchView only ever reads `world.intel.*`.
  function build(): ReturnType<typeof watchfordWorld> {
    const world = watchfordWorld('countersketch-mirror-1');
    enrollPlayer(world, { home: 'home-gs' });
    world.playerVenue = 'square-w0';
    world.intel.informants.push({ id: 'gale', assignedVenue: null });
    return world;
  }
  const actionLog: ActionLog = [{
    tick: 0, kind: 'inject', target: 'mira',
    spec: {
      subject: 'otto', predicate: 'stole', object: null,
      count: 2, severity: 4, place: null, attribution: SOMEONE,
    },
  }];

  it('a sub-threshold sketch feature on one world leaves both Counter-Sketch views byte-identical', () => {
    const plain = runLogOn(build(), STANDARD_RULES, actionLog, at(1, 0));

    const markedWorld = build();
    const feature: SketchFeature = {
      id: 'sf-test-mirror', kind: 'district-activity', day: 0, family: 'f0', subject: null,
      district: 'w1', detail: 'test-injected feature — never lands as a world fact',
      evidence: [{ tick: 500, observer: 'hugo', claimId: 'c0' }],
    };
    markedWorld.enemy.sketch.push(feature); // counter untouched — not a landed decision
    const marked = runLogOn(markedWorld, STANDARD_RULES, actionLog, at(1, 0));

    const plainView = counterSketchView(plain.intel.log, plain.intel.cards);
    const markedView = counterSketchView(marked.intel.log, marked.intel.cards);
    expect(stableStringify(markedView)).toBe(stableStringify(plainView));
  });
});
