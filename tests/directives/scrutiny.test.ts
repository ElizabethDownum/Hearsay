import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { perceivedScrutiny, pruneScrutiny, recordScrutiny } from '../../src/sim/directives/scrutiny';
import { hashWorld } from '../../src/sim/hash';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { stepTransaction } from '../../src/sim/phases';
import { circlesAt } from '../../src/sim/agents';
import { miniTown } from '../sim/helpers/minitown';
import { applyAsk, applyDirective } from '../../src/sim/actions';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type { DirectiveBrief } from '../../src/sim/directives/types';

const RECEIVED_BRIEF: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
  priority: 'important', authority: 'relationship', discretion: 'open', specificity: 'guided',
  guidance: [], active: { from: 0, until: 120 }, report: 'none', reportBy: null, purpose: null,
};

describe('perceived scrutiny', () => {
  it('deduplicates same-tick causes, sums exact decays, clamps, and reaches zero', () => {
    const world = buildWorld(miniTown(), 'scrutiny');
    recordScrutiny(world, 'ada', 'bez', 'questioning', 0);
    recordScrutiny(world, 'ada', 'bez', 'questioning', 0);
    recordScrutiny(world, 'ada', 'bez', 'confrontation', 0);
    expect(perceivedScrutiny(world, 'ada', 'bez', 0)).toBeCloseTo(0.60);
    expect(perceivedScrutiny(world, 'ada', 'bez', at(2, 0))).toBeCloseTo(0.45 * (5 / 7));
    expect(perceivedScrutiny(world, 'ada', 'bez', at(7, 0))).toBe(0);
    pruneScrutiny(world, at(7, 0));
    expect(world.network.directiveState!.scrutiny).toEqual([]);
  });

  it('a direct ask raises scrutiny only when the addressed person is an asset', () => {
    const assetWorld = buildWorld(miniTown(), 'scrutiny-ask-asset');
    enrollPlayer(assetWorld, { home: 'square' });
    assetWorld.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0,
      strikes: 0, facts: [] });
    applyAsk(assetWorld, 'ada', { subject: 'bez' }, 0);
    expect(perceivedScrutiny(assetWorld, 'ada', 'you', 0)).toBe(0.15);

    const civilianWorld = buildWorld(miniTown(), 'scrutiny-ask-civilian');
    enrollPlayer(civilianWorld, { home: 'square' });
    applyAsk(civilianWorld, 'ada', { subject: 'bez' }, 0);
    expect(civilianWorld.network.directiveState).toBeUndefined();
  });

  it('physical compel receipt and a second active same-issuer receipt raise scrutiny; issue alone does not', () => {
    const world = buildWorld(miniTown(), 'scrutiny-receipt');
    enrollPlayer(world, { home: 'square' });
    world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    applyDirective(world, 'ada', { outboundVia: [], reportVia: [] }, RECEIVED_BRIEF, 0);
    expect(perceivedScrutiny(world, 'ada', 'you', 0)).toBe(0);
    let message = world.network.directiveState!.messages[0]!;
    realizeNetworkForward(world, message.id, { venue: 'square', members: ['you', 'ada'] },
      0, STANDARD_RULES);
    applyDirective(world, 'ada', { outboundVia: [], reportVia: [] },
      { ...RECEIVED_BRIEF, authority: 'compel' }, 0);
    message = world.network.directiveState!.messages[1]!;
    realizeNetworkForward(world, message.id, { venue: 'square', members: ['you', 'ada'] },
      0, STANDARD_RULES);
    expect(perceivedScrutiny(world, 'ada', 'you', 0)).toBeCloseTo(0.40);
  });

  it('binds retasking scrutiny to the message principal when the claimed issuer was mutated', () => {
    const world = buildWorld(miniTown(), 'scrutiny-retasking-principal');
    enrollPlayer(world, { home: 'backroom' });
    world.npcs.ada!.schedule = [{ days: 'all', from: 0, to: 1439, venue: 'backroom' }];
    world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    const circle = circlesAt(world, 0).find((candidate) => candidate.members.includes('you'));
    expect(circle?.members).toEqual(expect.arrayContaining(['you', 'ada']));
    if (!circle) throw new Error('expected offered player circle fixture');
    for (let index = 0; index < 2; index += 1) {
      applyDirective(world, 'ada', { outboundVia: [], reportVia: [] }, RECEIVED_BRIEF, 0);
      const message = world.network.directiveState!.messages[index]!;
      if (message.payload.kind !== 'directive') throw new Error('expected directive fixture');
      message.payload.version.claimedIssuer = 'bez';
      realizeNetworkForward(world, message.id, circle, 0, STANDARD_RULES);
    }
    expect(perceivedScrutiny(world, 'ada', 'you', 0)).toBeCloseTo(0.10);
    expect(perceivedScrutiny(world, 'ada', 'bez', 0)).toBe(0);
  });

  it('pruning first or last at a nightly zero-contribution boundary hashes identically', () => {
    const a = buildWorld(miniTown(), 'scrutiny-order');
    recordScrutiny(a, 'ada', 'bez', 'questioning', 0);
    const b = structuredClone(a);
    a.tick = at(2, 23, 59);
    b.tick = at(2, 23, 59);
    pruneScrutiny(a, a.tick);
    stepTransaction(a, STANDARD_RULES);
    stepTransaction(b, STANDARD_RULES);
    expect(hashWorld(a)).toBe(hashWorld(b));
  });

  it('prunes zero-contribution traces inside the production tick transaction', () => {
    const world = buildWorld(miniTown(), 'scrutiny-transaction-prune');
    recordScrutiny(world, 'ada', 'bez', 'questioning', 0);
    world.tick = at(2, 23, 59);
    expect(world.network.directiveState!.scrutiny).toHaveLength(1);
    stepTransaction(world, STANDARD_RULES);
    expect(world.network.directiveState!.scrutiny).toEqual([]);
  });
});
