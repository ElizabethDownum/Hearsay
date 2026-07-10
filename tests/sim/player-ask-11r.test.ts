import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAsk, applyInject } from '../../src/sim/actions';
import { applyAction } from '../../src/sim/campaign';
import { runAskPhase } from '../../src/sim/inquiry';
import { step, runUntil } from '../../src/sim/step';
import { circlesAt, type Circle } from '../../src/sim/agents';
import { hashWorld } from '../../src/sim/hash';
import { at } from '../../src/core/time';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import type { WorldState } from '../../src/sim/types';

const RULES = STANDARD_RULES;

/** Pin an NPC to a venue for the whole run (the standard test staging shape). */
function pinTo(world: WorldState, id: EntityId, venue: string): void {
  world.scheduleOverrides[id] = [{ fromDay: 0, toDay: null, from: 0, to: 1440, venue, source: 'enemy' }];
}

/** Askings the avatar itself spoke, in the chronicle. */
const avatarAskings = (world: WorldState): { addressedTo: EntityId; tick: number }[] =>
  world.chronicle.flatMap((e) =>
    e.kind === 'asking' && e.speaker === 'you' ? [{ addressedTo: e.addressedTo, tick: e.tick }] : []);

// Rider 11R — the player's ask is a speech act: addressed to exactly the named person, fired and
// consumed at its beat, never trust-repicked or substituted. NPC/enemy dispatch is untouched.
describe('11R — the avatar ask honors the addressee', () => {
  // (t1) RED against base: trust ranking would pick a DIFFERENT member, but the named one is honored.
  it('(t1) addresses exactly the person the human named — never the highest-trust circle-mate', () => {
    const world = buildWorld(miniTown(), 'ask-11r-t1');
    enrollPlayer(world, { home: 'backroom' });
    // The avatar trusts ada MORE than bez: the old trust-repick would address ada. We name bez.
    world.npcs['you']!.edges = [
      { to: 'ada', kind: 'friend', trust: 0.9 },
      { to: 'bez', kind: 'friend', trust: 0.5 },
    ];
    pinTo(world, 'ada', 'backroom');
    pinTo(world, 'bez', 'backroom');
    const circle = circlesAt(world, 0).find((c) => c.members.includes('you'))!;
    expect(new Set(circle.members)).toEqual(new Set(['you', 'ada', 'bez']));

    applyAction(world, { tick: 0, kind: 'ask', to: 'bez', about: { subject: 'cyn' } });
    step(world, RULES);

    const mine = avatarAskings(world);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.addressedTo).toBe('bez'); // the named person — NOT ada (higher trust)
  });

  // (t2) No substitution when the named addressee is ineligible (already spoke this beat). Direct
  // runAskPhase call so the member order is controlled: ada speaks (asks bez) BEFORE the avatar's turn.
  it('(t2) the named addressee already spoke → the asking still happens, addressed to them, unanswered; no substitution', () => {
    const world = buildWorld(miniTown(), 'ask-11r-t2');
    enrollPlayer(world, { home: 'backroom' });
    world.npcs['you']!.edges = [
      { to: 'ada', kind: 'friend', trust: 0.9 },
      { to: 'bez', kind: 'friend', trust: 0.5 }, // the base substitution target
    ];
    // ada has her own question this beat (ada→bez 0.8): she asks bez and thus SPEAKS before the avatar.
    world.inquiries['ada'] = [{ about: { subject: 'cyn' }, from: 'self', expiresDay: 2, asked: [], answersHeard: 0 }];
    // The avatar's logged ask names ada — who will already have spoken by the avatar's turn.
    world.inquiries['you'] = [
      { about: { subject: 'cyn' }, from: 'self', expiresDay: 2, asked: [], answersHeard: 0, addressee: 'ada' },
    ];
    // Controlled order: ada, then bez, then you (the avatar is processed last).
    const circle: Circle = { venue: 'backroom', members: ['ada', 'bez', 'you'] };

    const { askings } = runAskPhase(world, circle, 0, RULES);
    const mine = askings.filter((a) => a.speaker === 'you');

    expect(mine).toHaveLength(1);
    expect(mine[0]!.addressedTo).toBe('ada');          // addressed to the named person...
    expect(mine.some((a) => a.addressedTo !== 'ada')).toBe(false); // ...and to NO ONE else (no substitution)
    expect(world.inquiries['you'] ?? []).toHaveLength(0); // consumed even though it went unanswered
  });

  // (t3) RED against base: the family-2 dispatch tail (2-day / 2-answer persistence, next-beat re-fire)
  // is deleted for player asks. Consumed at the firing beat; zero residue; no next-day re-fire.
  it('(t3) consumed at the firing beat — zero residue, and no later beat re-fires the old task', () => {
    const world = buildWorld(miniTown(), 'ask-11r-t3');
    enrollPlayer(world, { home: 'backroom' });
    world.npcs['you']!.edges = [
      { to: 'ada', kind: 'friend', trust: 0.9 },
      { to: 'bez', kind: 'friend', trust: 0.5 },
    ];
    pinTo(world, 'ada', 'backroom');
    pinTo(world, 'bez', 'backroom');

    applyAction(world, { tick: 0, kind: 'ask', to: 'ada', about: { subject: 'cyn' } });
    step(world, RULES); // the firing beat

    // Structural: after the firing tick, ZERO player-ask residue in world.inquiries.
    expect(world.inquiries['you'] ?? []).toHaveLength(0);

    // And no later beat re-fires it: over the rest of day 0 and into day 1 the avatar asks exactly once.
    runUntil(world, at(1, 12), RULES);
    expect(avatarAskings(world)).toHaveLength(1);
    expect(avatarAskings(world)[0]!.tick).toBe(0);
  });

  // (t6) The walked-off case stays visible: applyAsk throws when the named addressee is not co-circled.
  it('(t6) applyAsk throws when the named addressee is not in the avatar’s circle this beat (walked-off)', () => {
    const world = buildWorld(miniTown(), 'ask-11r-t6');
    enrollPlayer(world, { home: 'backroom' }); // the avatar is alone in the private backroom
    // ada is at the square, never co-circled with the avatar at the backroom.
    expect(() => applyAsk(world, 'ada', { subject: 'cyn' }, 0)).toThrow(/circle/);
    expect(world.inquiries['you']).toBeUndefined(); // zero residue on the refused ask
  });
});

// (t4) NPC + enemy inquiry dispatch is byte-unchanged vs base. The hash below was captured on the
// pre-11R base (acf2f7b) and MUST stay equal after the change — proof the NPC path never moved.
describe('11R — NPC / enemy inquiry dispatch is byte-identical to base', () => {
  const NPC_ENEMY_PIN = 3062497362; // captured on the pre-11R base (acf2f7b); must not move

  const build = (): WorldState => {
    const world = buildWorld(miniTown(), 'ask-11r-t4');
    // An NPC self-asker (the reactions-style dispatch task) with real answerers — exercises the
    // trust-repick, the 2-answer tail, and retirement.
    applyInject(world, 'bez', { subject: 'dov', predicate: 'stole', object: null,
      count: null, severity: 3, place: null, attribution: SOMEONE });
    applyInject(world, 'cyn', { subject: 'dov', predicate: 'stole', object: null,
      count: null, severity: 3, place: null, attribution: SOMEONE });
    world.inquiries['ada'] = [{ about: { family: 'f0' }, from: 'self', expiresDay: 3, asked: [], answersHeard: 0 }];
    // An enemy interrogation (authority path, from:'enemy').
    world.inquiries['dov'] = [{ about: { subject: 'cyn' }, from: 'enemy', expiresDay: 3, asked: [], answersHeard: 0 }];
    return world;
  };

  it('(t4) an NPC-asker + enemy-interrogation run hashes to the pinned base value', () => {
    const world = build();
    runUntil(world, at(2, 0), RULES);
    expect(hashWorld(world)).toBe(NPC_ENEMY_PIN);
  });
});
