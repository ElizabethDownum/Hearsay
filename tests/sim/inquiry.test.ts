import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { step, runUntil } from '../../src/sim/step';
import { applyDirective, applyInject } from '../../src/sim/actions';
import { chooseAnswer } from '../../src/sim/inquiry';
import { markDirectiveDue } from '../../src/sim/directives/execution';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type { DirectiveBrief } from '../../src/sim/directives/types';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { Asking } from '../../src/sim/perception';
import type { WorldState } from '../../src/sim/types';
import { hashWorld } from '../../src/sim/hash';
import {
  collectCircleIntents,
  realizeCircleIntents,
  type NpcAutonomousIntent,
} from '../../src/sim/phases';
import { miniTown } from './helpers/minitown';

const RULES = STANDARD_RULES;

describe('asking', () => {
  const seededSimultaneousWorld = (seed: string): WorldState => {
    const world = buildWorld(miniTown(), seed);
    applyInject(world, 'ada', { subject: 'dov', predicate: 'stole', object: null,
      count: null, severity: 3, place: null, attribution: SOMEONE });
    world.beliefs.ada!.f0!.apparentSources = ['bez', 'cyn'];
    world.beliefs.ada!.f0!.credence = 0.9;
    world.inquiries.dov = [{
      about: { family: 'f0' }, from: 'self', expiresDay: 2, asked: [], answersHeard: 0,
    }];
    return world;
  };

  it('collects canonically without mutation and realizes answer plus independent telling', () => {
    const worldA = seededSimultaneousWorld('simultaneous-order');
    const worldB = JSON.parse(JSON.stringify(worldA)) as WorldState;
    const circleA = { venue: 'square', members: ['ada', 'bez', 'cyn', 'dov'] };
    const circleB = { venue: 'square', members: [...circleA.members].reverse() };
    const beforeA = hashWorld(worldA);
    const beforeB = hashWorld(worldB);

    const frameA = collectCircleIntents(worldA, circleA, 0, RULES, [], new Set());
    const frameB = collectCircleIntents(worldB, circleB, 0, RULES, [], new Set());
    expect(hashWorld(worldA)).toBe(beforeA);
    expect(hashWorld(worldB)).toBe(beforeB);
    expect(frameB).toEqual(frameA);

    const eventsA = realizeCircleIntents(worldA, frameA, 0, RULES);
    const eventsB = realizeCircleIntents(worldB, frameB, 0, RULES);
    expect(eventsB).toEqual(eventsA);
    expect(hashWorld(worldB)).toBe(hashWorld(worldA));
    expect(eventsA.askings.filter((a) => a.speaker === 'dov')).toHaveLength(1);
    expect(eventsA.answers.filter((u) => u.speaker === 'ada' && u.addressedTo === 'dov')).toHaveLength(1);
    expect(eventsA.tellings.filter((u) => u.speaker === 'ada')).toHaveLength(1);
    expect(eventsA.tellings[0]!.circleMembers).toEqual(['ada', 'bez', 'cyn', 'dov']);
  });

  it('selects one same-actor intent by rank, kind, and ref', () => {
    const world = seededSimultaneousWorld('simultaneous-rank');
    const circle = { venue: 'square', members: ['ada', 'bez', 'cyn', 'dov'] };
    const extra: NpcAutonomousIntent[] = [
      { kind: 'directive-act', actor: 'ada', ref: 'd9', rank: 2 },
      { kind: 'network-forward', actor: 'ada', ref: '0000000000:0000000010', rank: 1 },
      { kind: 'network-forward', actor: 'ada', ref: '0000000000:0000000002', rank: 1 },
      { kind: 'ordinary-tell', actor: 'ada', ref: 'f9:bez', rank: 7,
        family: 'f9', addressedTo: 'bez' },
    ];
    const frame = collectCircleIntents(world, circle, 0, RULES, extra, new Set());
    expect(frame.selected.filter((intent) => intent.actor === 'ada')).toEqual([
      { kind: 'network-forward', actor: 'ada', ref: '0000000000:0000000002', rank: 1 },
    ]);
  });

  it('the Task-9 drop-pickup arm is installed and a stale payload ref realizes as a no-op', () => {
    const intent = { kind: 'drop-pickup' as const, actor: 'bez', ref: 'drop-payload-2', rank: 3 as const };
    const world = buildWorld(miniTown(), 'installed-drop-pickup');
    const frame = collectCircleIntents(
      world, { venue: 'square', members: ['ada', 'bez', 'cyn', 'dov'] },
      0, RULES, [intent], new Set(),
    );
    expect(frame.selected).toContainEqual(intent);
    const before = hashWorld(world);
    expect(realizeCircleIntents(world, frame, 0, RULES))
      .toEqual({ askings: [], answers: [], tellings: [], extras: [] });
    expect(hashWorld(world)).toBe(before);
  });

  it('names the uninstalled recruitment-answer arm', () => {
    const intent = { kind: 'recruitment-answer' as const, actor: 'bez', ref: 'approach-2', rank: 0 as const };
    const world = seededSimultaneousWorld(`uninstalled-${intent.kind}`);
    const frame = collectCircleIntents(
      world, { venue: 'square', members: ['ada', 'bez', 'cyn', 'dov'] },
      0, RULES, [intent], new Set(),
    );
    expect(frame.selected).toContainEqual(intent);
    expect(() => realizeCircleIntents(world, frame, 0, RULES))
      .toThrow('phase4: recruitment-answer handler not installed');
  });

  it('the Task-8 directive-act arm is installed and realizes a collected due intent', () => {
    const world = seededSimultaneousWorld('installed-directive-act');
    enrollPlayer(world, { home: 'square' });
    world.network.assets.push({
      id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [],
    });
    const brief: DirectiveBrief = {
      mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
      priority: 'urgent', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: 0, until: 120 }, report: 'full', reportBy: 120,
      purpose: 'learn locally',
    };
    applyDirective(world, 'ada', { outboundVia: [], reportVia: [] }, brief, 0);
    const message = world.network.directiveState!.messages[0]!;
    expect(realizeNetworkForward(
      world, message.id, { venue: 'square', members: ['you', 'ada'] }, 0, RULES,
    )).not.toBeNull();
    const record = world.network.directiveState!.records[0]!;
    const due = record.decision!.timing.actAt!;
    world.tick = due;
    markDirectiveDue(world, record.id, due);
    const intent = { kind: 'directive-act' as const, actor: 'ada', ref: record.id, rank: 2 as const };
    const frame = collectCircleIntents(
      world, { venue: 'square', members: ['ada', 'bez', 'cyn', 'dov'] },
      due, RULES, [intent], new Set(),
    );
    expect(frame.selected).toContainEqual(intent);
    expect(() => realizeCircleIntents(world, frame, due, RULES)).not.toThrow();
    expect(record.execution).toMatchObject({ state: 'completed', dueAt: null });
  });

  it('the Task-6 network-forward arm is installed and a stale message ref realizes as a no-op', () => {
    const world = seededSimultaneousWorld('installed-network-forward');
    const intent = { kind: 'network-forward' as const, actor: 'bez', ref: 'missing-message', rank: 1 as const };
    const frame = collectCircleIntents(
      world, { venue: 'square', members: ['ada', 'bez', 'cyn', 'dov'] },
      0, RULES, [intent], new Set(),
    );
    expect(frame.selected).toContainEqual(intent);
    expect(realizeCircleIntents(world, frame, 0, RULES).extras).toEqual([]);
  });

  it('resolves competing askers by answerer trust, then honors answeredDirectly', () => {
    const build = (): WorldState => {
      const world = seededSimultaneousWorld('simultaneous-answer');
      world.inquiries.bez = [{
        about: { family: 'f0' }, from: 'self', expiresDay: 2, asked: [], answersHeard: 0,
      }];
      return world;
    };
    const circle = { venue: 'square', members: ['dov', 'cyn', 'bez', 'ada'] };

    const world = build();
    const result = realizeCircleIntents(
      world, collectCircleIntents(world, circle, 0, RULES, [], new Set()), 0, RULES,
    );
    expect(result.askings.filter((asking) => asking.addressedTo === 'ada')).toHaveLength(2);
    expect(result.answers.filter((answer) => answer.speaker === 'ada')).toHaveLength(1);
    expect(result.answers.find((answer) => answer.speaker === 'ada')!.addressedTo).toBe('bez');

    const directWorld = build();
    const directResult = realizeCircleIntents(
      directWorld,
      collectCircleIntents(directWorld, circle, 0, RULES, [], new Set(['ada'])),
      0,
      RULES,
    );
    expect(directResult.askings.filter((asking) => asking.addressedTo === 'ada')).toHaveLength(2);
    expect(directResult.answers.filter((answer) => answer.speaker === 'ada')).toHaveLength(0);
    expect(directResult.tellings.filter((telling) => telling.speaker === 'ada')).toHaveLength(1);
  });

  it('keeps cooldowns for different-family and non-answering autonomous tellings', () => {
    const world = seededSimultaneousWorld('simultaneous-cooldown-controls');
    world.beliefs.ada!.f0!.credence = 0.6;
    applyInject(world, 'ada', { subject: 'bez', predicate: 'stole', object: null,
      count: null, severity: 5, place: null, attribution: SOMEONE });
    world.beliefs.ada!.f1!.apparentSources = ['bez', 'cyn'];
    world.beliefs.ada!.f1!.credence = 0.95;
    applyInject(world, 'cyn', { subject: 'bez', predicate: 'stole', object: null,
      count: null, severity: 5, place: null, attribution: SOMEONE });
    world.beliefs.cyn!.f2!.credence = 0.95;

    const frame = collectCircleIntents(
      world, { venue: 'square', members: ['dov', 'cyn', 'bez', 'ada'] },
      0, RULES, [], new Set(),
    );
    expect(frame.selected).toContainEqual(expect.objectContaining({
      kind: 'ordinary-tell', actor: 'ada', family: 'f1',
    }));
    expect(frame.selected).toContainEqual(expect.objectContaining({
      kind: 'ordinary-tell', actor: 'cyn', family: 'f2',
    }));

    const result = realizeCircleIntents(world, frame, 0, RULES);
    expect(result.answers).toContainEqual(expect.objectContaining({ speaker: 'ada' }));
    expect(world.lastTold['ada:f0']).toBeUndefined();
    expect(world.lastTold['ada:f1']).toBe(0);
    expect(world.lastTold['cyn:f2']).toBe(0);
  });

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
