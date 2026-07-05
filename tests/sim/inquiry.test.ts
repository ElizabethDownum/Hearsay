import { describe, expect, it } from 'vitest';
import { buildWorld } from '../../src/sim/world';
import { step, runUntil } from '../../src/sim/step';
import { applyInject } from '../../src/sim/actions';
import { chooseAnswer } from '../../src/sim/inquiry';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { Asking } from '../../src/sim/perception';
import type { WorldState } from '../../src/sim/types';
import { hashWorld } from '../../src/sim/hash';
import { miniTown } from './helpers/minitown';

const RULES = STANDARD_RULES;

describe('asking', () => {
  it('an asker spends their beat asking (not telling), the chronicle records it, bystanders observe it', () => {
    const world = buildWorld(miniTown(), 'inq-1');
    applyInject(world, 'ada', { subject: 'dov', predicate: 'stole', object: null,
      count: null, severity: 3, place: null, attribution: SOMEONE });
    world.inquiries['ada'] = [{ about: { family: 'f0' }, from: 'self', expiresDay: 2, asked: [], answersHeard: 0 }];
    step(world, RULES); // t=0 is a conversation beat
    const asking = world.chronicle.find((e) => e.kind === 'asking');
    expect(asking).toBeDefined();
    if (asking?.kind === 'asking') {
      expect(asking.speaker).toBe('ada');
      expect(asking.authority).toBe(false);
      // highest-trust circle member wins: cyn? no — trust is ada→X: bez 0.8 > cyn 0.6 > dov 0.4
      expect(asking.addressedTo).toBe('bez');
      expect(asking.heardBy.map((h) => h.id).sort()).toEqual(['bez', 'cyn', 'dov']);
    }
    // ada asked, so ada did not also tell this beat
    const adaTellings = world.chronicle.filter((e) => e.kind === 'telling' && e.speaker === 'ada');
    expect(adaTellings).toHaveLength(0);
    expect(world.inquiries['ada']![0]!.asked).toContain('bez');
  });

  it('self-origin askings never target someone the asker does not trust', () => {
    const world = buildWorld(miniTown(), 'inq-2');
    world.inquiries['bez'] = [{ about: { family: 'f0' }, from: 'self', expiresDay: 2, asked: ['ada'], answersHeard: 0 }];
    // bez trusts only ada (already asked) — no eligible addressee, no asking emitted
    step(world, RULES);
    expect(world.chronicle.some((e) => e.kind === 'asking')).toBe(false);
  });
});

describe('answering', () => {
  /** Seed dov with a belief heard from a NAMED person, then have ada ask him. */
  function worldWhereDovKnows(seed: string) {
    const world = buildWorld(miniTown(), seed);
    world.beliefs['dov']!['f9'] = {
      claim: { id: 'c90', family: 'f9', parent: null, subject: 'bez', predicate: 'stole',
        object: null, count: null, severity: 3, place: null, attribution: SOMEONE },
      credence: 0.6, heardFrom: 'cyn', heardAt: 0, firstHeardAt: 0, timesHeard: 1,
      apparentSources: ['cyn'], discretion: false, counterSpun: false,
    };
    world.claims['c90'] = world.beliefs['dov']!['f9']!.claim;
    world.inquiries['ada'] = [{ about: { family: 'f9' }, from: 'self', expiresDay: 2, asked: ['bez', 'cyn'], answersHeard: 0 }];
    return world;
  }

  it('an answer is a retelling whose attribution discloses the source; no cooldown is consumed', () => {
    const world = worldWhereDovKnows('inq-3');
    // ada→dov trust 0.4 > 0 and dov→ada trust 0.4 > 0: dov answers
    step(world, RULES);
    const answer = world.chronicle.find((e) => e.kind === 'telling' && e.mode === 'answer');
    expect(answer).toBeDefined();
    if (answer?.kind === 'telling') {
      expect(answer.speaker).toBe('dov');
      expect(world.claims[answer.claimId]!.attribution).toBe('cyn'); // the disclosure
    }
    expect(world.lastTold['dov:f9']).toBeUndefined();
    // the asker ingested the answer — apparent source = the disclosed attribution
    expect(world.beliefs['ada']!['f9']!.apparentSources).toContain('cyn');
    // answersHeard 1 of 2 — the task must still exist (proven by running the machinery: RED showed
    // the seeded task survives with answersHeard incremented to 1, asked = [bez, cyn, dov]).
    expect(world.inquiries['ada']![0]!.answersHeard).toBe(1);
  });

  it("an injected origin discloses as SOMEONE — unless the answerer's traits misdirect", () => {
    const world = buildWorld(miniTown(), 'inq-4');
    applyInject(world, 'cyn', { subject: 'bez', predicate: 'stole', object: null,
      count: null, severity: 3, place: null, attribution: SOMEONE });
    world.inquiries['ada'] = [{ about: { family: 'f0' }, from: 'self', expiresDay: 2, asked: ['bez', 'dov'], answersHeard: 0 }];
    step(world, RULES);
    const answer = world.chronicle.find((e) => e.kind === 'telling' && e.mode === 'answer');
    expect(answer).toBeDefined();
    if (answer?.kind === 'telling') {
      // cyn is an ATTRIBUTOR with a grudge on dov: the honest disclosure would be SOMEONE
      // (heardFrom 'injected'), but her trait fills vague attributions with her rival.
      // Deterministic misdirection — the enemy's trace will point at dov.
      expect(world.claims[answer.claimId]!.attribution).toBe('dov');
    }
  });

  it('nobody confirms dirt on themselves, and a skeptic answers freely (retell gate is for gossip)', () => {
    const world = buildWorld(miniTown(), 'inq-5');
    // bez holds a damaging claim about HIMSELF
    applyInject(world, 'bez', { subject: 'bez', predicate: 'stole', object: null,
      count: null, severity: 3, place: null, attribution: SOMEONE });
    world.inquiries['ada'] = [{ about: { family: 'f0' }, from: 'self', expiresDay: 2, asked: ['cyn', 'dov'], answersHeard: 0 }];
    step(world, RULES);
    expect(world.chronicle.some((e) => e.kind === 'telling' && e.mode === 'answer')).toBe(false);

    // ada is a SKEPTIC holding an uncorroborated belief: she would never RETELL it,
    // but she answers a direct question with it.
    const world2 = buildWorld(miniTown(), 'inq-6');
    applyInject(world2, 'ada', { subject: 'dov', predicate: 'stole', object: null,
      count: null, severity: 3, place: null, attribution: SOMEONE });
    world2.inquiries['bez'] = [{ about: { family: 'f0' }, from: 'self', expiresDay: 2, asked: [], answersHeard: 0 }];
    step(world2, RULES);
    expect(world2.chronicle.some((e) => e.kind === 'telling' && e.mode === 'answer' && e.speaker === 'ada')).toBe(true);
  });
});

describe('discretion — held-close knowledge is extracted, never volunteered', () => {
  /** Seed the holder with a TRUE secret held under discretion (as worldFromTown would). */
  function seedSecret(world: WorldState, holder: string): void {
    const claim = {
      id: 'sc0', family: 'sec0', parent: null, subject: 'cyn', predicate: 'stole',
      object: null, count: null, severity: 4 as const, place: null, attribution: SOMEONE,
    };
    world.claims['sc0'] = claim;
    world.beliefs[holder]!['sec0'] = {
      claim, credence: 0.95, heardFrom: 'witnessed', heardAt: 0, firstHeardAt: 0,
      timesHeard: 1, apparentSources: [], discretion: true, counterSpun: false,
    };
  }
  const asking = (speaker: string): Asking => ({
    tick: 0, venue: 'square', circleMembers: ['ada', speaker], speaker,
    addressedTo: 'ada', about: { family: 'sec0' }, authority: false,
  });

  it('(a) a confidant trusted below 0.7 gets silence', () => {
    const world = buildWorld(miniTown(), 'disc-a');
    seedSecret(world, 'ada'); // ada→dov trust is 0.4 (< 0.7)
    expect(chooseAnswer(world, 'ada', asking('dov'), 0, RULES)).toBeNull();
  });

  it('(b) a confidant trusted at 0.7+ gets the answer, disclosed as SOMEONE', () => {
    const world = buildWorld(miniTown(), 'disc-b');
    seedSecret(world, 'ada'); // ada→bez trust is 0.8 (>= 0.7)
    const answer = chooseAnswer(world, 'ada', asking('bez'), 0, RULES);
    expect(answer).not.toBeNull();
    expect(answer!.claim.family).toBe('sec0');
    expect(answer!.claim.attribution).toBe(SOMEONE); // witnessed origin never names a source
  });

  it('(c) authority at an invitational venue compels the answer regardless of trust', () => {
    const world = buildWorld(miniTown(), 'disc-c');
    seedSecret(world, 'ada'); // holder ada; interrogator dov, trusted only 0.4
    world.inquiries['dov'] = [{ about: { family: 'sec0' }, from: 'enemy', expiresDay: 2, asked: [], answersHeard: 0 }];
    // stage ada + dov alone in the invitational backroom for day 0 → a circle of exactly 2
    const backroom = [{ fromDay: 0, toDay: 1, from: 0, to: 1440, venue: 'backroom', source: 'enemy' as const }];
    world.scheduleOverrides['ada'] = backroom;
    world.scheduleOverrides['dov'] = backroom;
    step(world, RULES); // t=0 is a conversation beat
    const answer = world.chronicle.find(
      (e) => e.kind === 'telling' && e.mode === 'answer' && e.speaker === 'ada',
    );
    expect(answer).toBeDefined();
    if (answer?.kind === 'telling') {
      expect(world.claims[answer.claimId]!.family).toBe('sec0');
    }
  });
});

describe('task lifecycle and determinism', () => {
  it('a task retires after two answers heard; expiry sweeps at end of day', () => {
    const world = buildWorld(miniTown(), 'inq-7');
    world.inquiries['ada'] = [{ about: { family: 'f0' }, from: 'self', expiresDay: 1, asked: [], answersHeard: 2 }];
    step(world, RULES); // answersHeard already >= 2 → implementation may retire on next touch…
    runUntil(world, 1440, RULES); // …but the end-of-day sweep MUST have removed it
    expect(world.inquiries['ada'] ?? []).toHaveLength(0);
  });

  it('same seed + same seeded inquiry ⇒ identical world hash (machinery is deterministic)', () => {
    const run = () => {
      const world = buildWorld(miniTown(), 'inq-8');
      applyInject(world, 'cyn', { subject: 'bez', predicate: 'stole', object: null,
        count: null, severity: 3, place: null, attribution: SOMEONE });
      world.inquiries['ada'] = [{ about: { family: 'f0' }, from: 'self', expiresDay: 2, asked: [], answersHeard: 0 }];
      runUntil(world, 2880, RULES);
      return hashWorld(world);
    };
    expect(run()).toBe(run());
  });
});
