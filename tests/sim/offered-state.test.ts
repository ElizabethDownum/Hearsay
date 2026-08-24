import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAction, type Action } from '../../src/sim/campaign';
import { blankIntel } from '../../src/sim/fieldwork';
import { prepareTick } from '../../src/sim/phases';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import type { TownFixture, WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';

/**
 * OFFER/EXECUTION IDENTITY for every local verb (Part 5, design-spec.md:226 and 334-347; controller
 * ruling P11-18 adopting the whole-branch review's resolution 1 for finding I-2).
 *
 * The chosen action must execute against the state in which it was OFFERED. `applyAction` already
 * carries the `PreparedTick` whose frozen circles compose that offer, and phase 2 speaks into those
 * same circles — but before this wave only `recruit` consumed them. The other eight rebuilt locality
 * from a LIVE `circlesAt(world, tick)`, so an earlier same-tick action could change whether the verb
 * validated at all. That is reachable from every general production path: `applyAction` itself, bot
 * execution, replay, and imported action logs.
 *
 * Each pin below stages exactly that divergence with the only same-tick mutation the player's own
 * verb surface can make to locality — `goTo`, which moves the avatar — and then asserts the verb
 * answers to the FRAME. The paired liveness half runs the identical pair through the FRAMELESS
 * compatibility call (no `PreparedTick`, the pre-existing posture every direct-call test uses) and
 * requires the live refusal, which is what makes the framed half non-vacuous: the two states really
 * do disagree at the moment the verb runs.
 */
const RULES = STANDARD_RULES;

const npc = (id: string, venue: string) => ({
  id, name: id, home: venue, occupation: 'grocer', faction: 'none' as const,
  traits: ['literalist' as const], rivals: [], edges: [],
  schedule: [{ days: 'all' as const, from: 0, to: 1439, venue }],
});

/**
 * `square` is where the offer is composed (the avatar and `ada`); `market` is an empty public room
 * the avatar can legally walk to mid-beat; `safehouse` holds `bez`, so a walk THERE creates the
 * mirror-image divergence the debrief pin needs.
 */
const FIXTURE: TownFixture = {
  venues: [
    { id: 'square', district: 'd0', access: 'public' },
    { id: 'market', district: 'd0', access: 'public' },
    { id: 'salon', district: 'd0', access: 'invitational' },
    { id: 'safehouse', district: 'd0', access: 'private' },
  ],
  npcs: [npc('ada', 'square'), npc('bez', 'safehouse')],
};

function staged(): WorldState {
  const world = buildWorld(FIXTURE, 'offered-state', RULES);
  enrollPlayer(world, { home: 'square' });
  for (const id of ['ada', 'bez']) {
    world.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    world.npcs[id]!.edges.push({ to: 'you', kind: 'friend', trust: 0.75 });
  }
  return world;
}

/** The production shape: one PreparedTick, every same-tick action applied inside it. */
function framed(world: WorldState, actions: readonly Action[]): void {
  const frame = prepareTick(world, RULES);
  for (const action of actions) applyAction(world, action, RULES, frame);
}

/** The pre-existing frameless compatibility call — live locality, exactly as before. */
function frameless(world: WorldState, actions: readonly Action[]): void {
  for (const action of actions) applyAction(world, action, RULES);
}

const SPEC = {
  subject: 'bez', predicate: 'stole', object: null, count: 2, severity: 3,
  place: null, attribution: SOMEONE,
} as const;

/** The avatar walks out of the offered room before choosing — the prior same-tick mutation. */
const WALK_AWAY: Action = { tick: 0, kind: 'goTo', venue: 'market' };
/** …and, for debrief, walks INTO a room the offer never contained. */
const WALK_IN: Action = { tick: 0, kind: 'goTo', venue: 'safehouse' };

function seedIntel(world: WorldState): void {
  const claim: Claim = {
    id: 'c-x', family: 'f-x', parent: null, subject: 'bez', predicate: 'stole',
    object: null, count: 2, severity: 3, place: null, attribution: SOMEONE,
  };
  world.claims['c-x'] = claim;
  world.intel.log.push({
    ...blankIntel(), tick: 0, venue: 'square', via: 'self', kind: 'utterance', overheard: false,
    speaker: 'ada', addressedTo: 'you', mode: 'telling', claimId: 'c-x', family: 'f-x',
    reported: { subject: 'bez', predicate: 'stole', object: null, count: 2, severity: 3,
      place: null, attribution: SOMEONE },
  });
}

const BRIEF = {
  mission: { kind: 'learn' as const, target: { kind: 'person' as const, id: 'bez' } },
  priority: 'routine' as const, authority: 'relationship' as const, discretion: 'quiet' as const,
  specificity: 'detailed' as const, guidance: [], active: { from: 0, until: 90 },
  report: 'outcome' as const, reportBy: 90, purpose: null,
};

interface VerbCase {
  kind: string;
  stage(world: WorldState): void;
  intent: Action;
  applied(world: WorldState): void;
}

const CASES: VerbCase[] = [
  {
    kind: 'tell',
    stage: () => {},
    intent: { tick: 0, kind: 'tell', to: 'ada', spec: { ...SPEC } },
    applied: (world) => expect(world.pendingTell).toMatchObject({ to: 'ada' }),
  },
  {
    kind: 'ask',
    stage: () => {},
    intent: { tick: 0, kind: 'ask', to: 'ada', about: { subject: 'bez' } },
    applied: (world) => expect(world.inquiries['you']).toEqual([
      expect.objectContaining({ addressee: 'ada', from: 'self' }),
    ]),
  },
  {
    kind: 'sell',
    stage: seedIntel,
    intent: { tick: 0, kind: 'sell', buyer: 'ada', family: 'f-x' },
    applied: (world) => expect(world.pendingSell).toMatchObject({ buyer: 'ada', family: 'f-x' }),
  },
  {
    kind: 'courier',
    stage: () => {},
    intent: { tick: 0, kind: 'courier', asset: 'ada', spec: { ...SPEC }, target: 'bez', viaDrop: null },
    applied: (world) => expect(world.network.directiveState!.records.at(-1)).toMatchObject({
      recipient: 'ada', principal: 'player',
    }),
  },
  {
    kind: 'meet',
    stage: () => {},
    intent: { tick: 0, kind: 'meet', asset: 'ada' },
    applied: (world) => expect(world.network.directiveState!.records.at(-1)).toMatchObject({
      recipient: 'ada', principal: 'player',
    }),
  },
  {
    kind: 'host',
    stage: (world) => { world.station = 'noble'; },
    intent: { tick: 0, kind: 'host', venue: 'salon', invitees: ['ada'] },
    applied: (world) => expect(world.network.invitations).toEqual([
      expect.objectContaining({ kind: 'hosting', invitee: 'ada', venue: 'salon' }),
    ]),
  },
  {
    kind: 'directive',
    stage: () => {},
    intent: { tick: 0, kind: 'directive', recipient: 'ada',
      handoff: { outboundVia: [], reportVia: [] }, brief: BRIEF },
    applied: (world) => expect(world.network.directiveState!.records.at(-1)).toMatchObject({
      recipient: 'ada', principal: 'player',
    }),
  },
];

describe('local verbs execute against the frozen offered state', () => {
  it.each(CASES)('$kind reads the offered frame, not the live circle it was moved out of',
    ({ stage, intent, applied }) => {
      const world = staged();
      stage(world);
      framed(world, [WALK_AWAY, intent]);
      applied(world);
    });

  it.each(CASES)('$kind: the same pair is still refused on live locality with no frame ($kind)',
    ({ stage, intent }) => {
      const world = staged();
      stage(world);
      expect(() => frameless(world, [WALK_AWAY, intent]))
        .toThrow(/circle|with you|handoff/);
    });

  /**
   * The mirror image, and the one the offered-state law exists for: `debrief`'s own precondition
   * (the avatar at the safehouse) is satisfied only by the LIVE walk, while the offered frame never
   * put `bez` in front of the avatar. A live-reading arm ACCEPTS this — debiting a strike and
   * writing an intel row for a conversation the offer never contained. The frame-bound arm refuses.
   */
  it('debrief refuses an asset the offered frame never stood next to, even after walking to them', () => {
    const world = staged();
    world.beliefs['bez']!['f-old'] = {
      claim: { id: 'c-old', family: 'f-old', parent: null, subject: 'ada', predicate: 'stole',
        object: null, count: 1, severity: 2, place: null, attribution: SOMEONE },
      credence: 0.9, heardFrom: 'ada', heardAt: 0, firstHeardAt: 0, timesHeard: 1,
      apparentSources: ['ada'], discretion: false, counterSpun: false,
    };
    const debrief: Action = { tick: 0, kind: 'debrief', asset: 'bez' };
    expect(() => framed(world, [WALK_IN, debrief])).toThrow(/with you at the safehouse/);
    expect(world.intel.log).toEqual([]);
    expect(world.network.assets.find((row) => row.id === 'bez')!.strikes).toBe(0);

    // Liveness: the frameless compatibility call still accepts it, so the refusal above is the
    // frame talking and not an unrelated precondition.
    const live = staged();
    live.beliefs['bez']!['f-old'] = { ...world.beliefs['bez']!['f-old']! };
    frameless(live, [WALK_IN, debrief]);
    expect(live.intel.log).toHaveLength(1);
    expect(live.network.assets.find((row) => row.id === 'bez')!.strikes).toBe(1);
  });
});
