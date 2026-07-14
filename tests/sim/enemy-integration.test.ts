import { describe, expect, it } from 'vitest';
import { applyEnemyDecision, WATCH } from '../../src/sim/counterintel';
import { step, runUntil } from '../../src/sim/step';
import { applyInject } from '../../src/sim/actions';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { observationsFor, type TickEvents } from '../../src/sim/perception';
import { at, dayOf, minuteOfDay } from '../../src/core/time';
import { hashWorld } from '../../src/sim/hash';
import { watchfordWorld } from './helpers/watchford-world';
import type { EnemyDecision } from '../../src/sim/enemy/state';

const stole = { subject: 'otto', predicate: 'stole', object: null,
  count: 2, severity: 4 as const, place: null, attribution: SOMEONE };

/** Drive step() from `from` to `to`, handing every tick's events to `sink`. */
function driveCollecting(world: ReturnType<typeof watchfordWorld>, to: number,
  sink: (e: TickEvents) => void): void {
  while (world.tick < to) sink(step(world, STANDARD_RULES));
}

describe('the full trace chain — interrogation walks a citizen to the guard post', () => {
  // DEVIATION FROM BRIEF (target rosa, not mira) — documented and load-bearing.
  //
  // The brief scripts the interrogation against mira. In Watchford, mira and the
  // guard gale share square-w0 every morning (480–900). gale's enemy-origin inquiry
  // task fires at the FIRST co-location — empirically min480 @square-w0 (public) —
  // which (a) exhausts mira into gale's `asked` list before the 900 override can
  // co-locate them at guard-post-w0, and (b) never demonstrates COMPULSION, because
  // mira trusts gale (0.5) and would answer at the public square anyway. So the
  // guard-post interrogation cannot fire for mira; the geometry finding is pinned
  // in the companion test below.
  //
  // rosa is a w1 resident. gale (the w0 guard) is NEVER co-located with her except
  // through the interrogation override — so the override is her FIRST and ONLY contact
  // with him, and it fires at guard-post-w0 at 900. rosa has zero trust to gale, so
  // the compelled answer is extracted ONLY by authority + invitational venue (Task-2
  // compulsion). This is the faithful realization of the brief's intended mechanism.
  it('interrogation → authority asking at the invitational venue → compelled vague answer → evidence → origin-vague + carrier-profile', () => {
    const world = watchfordWorld('trace-1');
    world.network.spymaster = 'gale';
    // hop zero: seed rosa with an injected damaging story. heardFrom 'injected' ⇒
    // when disclosed under interrogation her attribution is SOMEONE (she names nobody).
    applyInject(world, 'rosa', stole);
    // Apply BY HAND one interrogation. applyEnemyDecision also pushes gale's matching
    // enemy-origin inquiry task {about:{family:'f0'}, from:'enemy', expiresDay: day+2}.
    const decision: EnemyDecision = {
      day: 0, features: [], inquiries: [], watches: [],
      interrogations: [{ target: 'rosa', guard: 'gale', day: 1, about: { family: 'f0' }, venue: 'guard-post-w0' }],
    };
    applyEnemyDecision(world, decision);
    // Forced & deterministic: skip day 0 so the hand-applied decision is the sole
    // enemy input. The nightly digest CANNOT consume gale's task (it is pure — reads
    // only enemy state, never world.inquiries); only expireInquiries could, and it
    // keeps tasks whose expiresDay (3) > day+1. gale's task is pristine at the window.
    world.tick = at(1, 0);
    runUntil(world, at(2, 0), STANDARD_RULES);

    // (1) an AskingRecord with authority:true at guard-post-w0 between 900 and 1020.
    const interro = world.chronicle.filter((c): c is Extract<typeof c, { kind: 'asking' }> =>
      c.kind === 'asking' && c.venue === 'guard-post-w0' &&
      minuteOfDay(c.tick) >= 900 && minuteOfDay(c.tick) < 1020);
    expect(interro.length).toBeGreaterThanOrEqual(1);
    expect(interro[0]!).toMatchObject({ authority: true, speaker: 'gale', addressedTo: 'rosa' });

    // (2) a telling with mode:'answer' whose claim's attribution === SOMEONE.
    const answer = world.chronicle.find((c): c is Extract<typeof c, { kind: 'telling' }> =>
      c.kind === 'telling' && c.mode === 'answer' && c.venue === 'guard-post-w0' && c.speaker === 'rosa');
    expect(answer).toBeDefined();
    expect(world.claims[answer!.claimId]!.attribution).toBe(SOMEONE);

    // (3) that answer is in the enemy's evidence log (captured by gale, the observer).
    const evAnswer = world.enemy.evidence.find((e) =>
      e.mode === 'answer' && e.speaker === 'rosa' && e.family === 'f0' && e.reported?.attribution === SOMEONE);
    expect(evAnswer).toBeDefined();
    expect(evAnswer!.observer).toBe('gale');

    // (4) after the day-1 nightly digest, the sketch carries origin-vague AND a
    //     carrier-profile keyed to the carrier — the debrief substrate for a hop-zero
    //     accusation, grown entirely from an OBSERVED compelled answer.
    const originVague = world.enemy.sketch.find((f) => f.kind === 'origin-vague' && f.family === 'f0');
    expect(originVague).toMatchObject({ subject: 'rosa' });
    expect(world.enemy.sketch.find((f) => f.kind === 'carrier-profile')).toMatchObject({ subject: 'rosa' });
  });

  // The Watchford geometry finding, pinned as a permanent test: the brief's literal
  // decision (target mira). The trace chain's TAIL still forms, but via the public
  // square, NOT the guard post — because gale meets mira before the override window.
  it('geometry finding — a co-located target is exhausted at the public square before the override fires', () => {
    const world = watchfordWorld('trace-mira');
    world.network.spymaster = 'gale';
    applyInject(world, 'mira', stole);
    applyEnemyDecision(world, {
      day: 0, features: [], inquiries: [], watches: [],
      interrogations: [{ target: 'mira', guard: 'gale', day: 1, about: { family: 'f0' }, venue: 'guard-post-w0' }],
    });
    world.tick = at(1, 0);
    runUntil(world, at(2, 0), STANDARD_RULES);

    const askings = world.chronicle.filter((c) => c.kind === 'asking');
    // gale's authority question DID fire — but at square-w0 (public), before 900.
    const atSquare = askings.find((c) => c.kind === 'asking' &&
      c.speaker === 'gale' && c.addressedTo === 'mira' && c.authority && c.venue === 'square-w0');
    expect(atSquare).toBeDefined();
    expect(minuteOfDay(atSquare!.tick)).toBeLessThan(900);
    // …and so NO asking ever lands at the interrogation venue: mira was already `asked`.
    expect(askings.some((c) => c.kind === 'asking' && c.venue === 'guard-post-w0')).toBe(false);
    // The tail still forms (compulsion was redundant here — trust already discloses).
    expect(world.enemy.sketch.some((f) => f.kind === 'origin-vague' && f.subject === 'mira')).toBe(true);
    expect(world.enemy.sketch.some((f) => f.kind === 'carrier-profile' && f.subject === 'mira')).toBe(true);
  });
});

describe('watches are visible — the Counter-Sketch feed', () => {
  it("a posted guard is a guard standing where he didn't stand yesterday — observable, and it widens enemy coverage", () => {
    const seed = 'watch-1';
    const inject = (w: ReturnType<typeof watchfordWorld>): void => {
      applyInject(w, 'mira', stole);
      // a second live story keeps district w0 gossiping past saturation
      applyInject(w, 'otto', { subject: 'gale', predicate: 'is-bankrupt', object: null,
        count: null, severity: 4, place: null, attribution: SOMEONE });
    };
    const watch: EnemyDecision = {
      day: 0, features: [], inquiries: [], interrogations: [],
      watches: [{ district: 'w0', startDay: 1, posts: [{ guard: 'hugo', venue: 'square-w0' }] }],
    };

    // WITH the watch: hugo (a w1 guard) is posted to square-w0 from day 1.
    const world = watchfordWorld(seed);
    world.network.spymaster = 'gale';
    inject(world);
    applyEnemyDecision(world, watch);
    let miraSawHugo = 0;
    let hugoSampledW0 = 0;
    driveCollecting(world, at(5, 0), (events) => {
      const min = minuteOfDay(events.tick);
      if (dayOf(events.tick) === 1 && min >= WATCH.from && min < WATCH.to) {
        // the countermeasure IS an ordinary observation: mira sees hugo at square-w0.
        if (observationsFor('mira', events).observations.some(
          (o) => o.kind === 'presence' && o.actor === 'hugo' && o.venue === 'square-w0')) miraSawHugo++;
        // and hugo is now SAMPLING w0 — co-present with w0 residents he never met from w1.
        if (observationsFor('hugo', events).observations.some(
          (o) => o.kind === 'presence' && o.venue === 'square-w0' &&
          (o.actor === 'mira' || o.actor === 'otto'))) hugoSampledW0++;
      }
    });
    // Re-encoded by mechanism (P6-T8): the guard stands at square-w0 for every window-tick, and
    // mira/otto are at square-w0 [480,1230) across the whole retuned window — so both presence
    // counts equal the window width, whatever WATCH is. (Presence is venue-level co-location; the
    // 4-person cap is on conversation circles, not who stands in the square.)
    expect(miraSawHugo).toBe(WATCH.to - WATCH.from);
    expect(hugoSampledW0).toBe(WATCH.to - WATCH.from);

    // CONTROL: identical world, no watch applied. hugo never reaches square-w0.
    const control = watchfordWorld(seed);
    control.network.spymaster = 'gale';
    inject(control);
    let controlSawHugo = 0;
    driveCollecting(control, at(5, 0), (events) => {
      const min = minuteOfDay(events.tick);
      if (dayOf(events.tick) === 1 && min >= WATCH.from && min < WATCH.to &&
        observationsFor('mira', events).observations.some(
          (o) => o.kind === 'presence' && o.actor === 'hugo' && o.venue === 'square-w0')) controlSawHugo++;
    });
    expect(controlSawHugo).toBe(0);

    // Coverage actually increased: WITH the watch hugo's evidence now includes captures
    // from square-w0 (territory his w1 schedule never reached); WITHOUT it, zero.
    // (The retuned window {960,1140} now spans the 960 cooldown-burst that the old {1080,1200}
    // missed — w0 tellings cluster at 480/720/960/1200 — so the coverage gain lands from day 1's
    // window onward, not a day late. The delta assertion below stays a pure existence check.)
    // Hugo did capture at the post. Because Gale shares square-w0 during the continuing watch,
    // the normal network-forward phase has already completed their physical report contact by the
    // end of this five-day drive; the retained held row records both capture and later delivery.
    const hugoReport = world.network.directiveState!.heldObservations.find((row) =>
      row.principal === 'enemy' && row.observer === 'hugo'
      && row.content.kind === 'raw' && row.content.observation.kind === 'utterance'
      && row.content.observation.venue === 'square-w0');
    expect(hugoReport).toBeDefined();
    expect(hugoReport!.queuedIn).not.toBeNull();
    expect(hugoReport!.deliveredAt).not.toBeNull();
    expect(hugoReport!.deliveredAt!).toBeGreaterThan(hugoReport!.observedAt);
    const hugoW0 = (w: ReturnType<typeof watchfordWorld>): number =>
      w.enemy.evidence.filter((e) => e.observer === 'hugo' && e.venue === 'square-w0').length;
    expect(hugoW0(world)).toBeGreaterThanOrEqual(1);
    expect(hugoW0(control)).toBe(0);
  });
});

/** Two juicy damaging stories, one nightly digest per elapsed day — the emergent beat. */
function emergentProbe(seed: string): ReturnType<typeof watchfordWorld> {
  const world = watchfordWorld(seed);
  world.network.spymaster = 'gale';
  applyInject(world, 'mira', stole);
  applyInject(world, 'quill', { subject: 'hugo', predicate: 'is-having-an-affair-with', object: 'rosa',
    count: null, severity: 3, place: null, attribution: SOMEONE });
  runUntil(world, at(4, 0), STANDARD_RULES);
  return world;
}

describe('end-to-end emergent probe', () => {
  it('four days, nightly digest live: evidence accrues and one decision lands per day', () => {
    const world = emergentProbe('emergent-1');

    expect(world.enemy.evidence.length).toBeGreaterThan(0);
    // one nightly digest per elapsed day (ends of days 0,1,2,3) — no hand-applied decisions.
    expect(world.enemy.decisions).toHaveLength(4);

    // Sketch depth is a HYPOTHESIS here (proven deterministically by the trace test);
    // print a one-line summary of what emerged rather than assert its content.
    const byKind = new Map<string, number>();
    for (const f of world.enemy.sketch) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
    const families = [...new Set(world.enemy.sketch.map((f) => f.family).filter((x): x is string => x != null))];
    console.log(`[emergent probe] evidence=${world.enemy.evidence.length} sketch=${world.enemy.sketch.length} ` +
      `families=[${families.join(',')}] byKind=${JSON.stringify([...byKind.entries()])} ` +
      `inquiriesIssued=${world.enemy.inquiriesIssued.length} watches=${world.enemy.watchedDistricts.length}`);
  });

  it('the whole 4-day run is bit-for-bit reproducible', () => {
    expect(hashWorld(emergentProbe('emergent-2'))).toBe(hashWorld(emergentProbe('emergent-2')));
  });
});
