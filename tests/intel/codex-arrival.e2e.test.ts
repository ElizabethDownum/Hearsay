import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { miniTown } from '../sim/helpers/minitown';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { applyGoTo, applyInject } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { corroborations, suggestTraits } from '../../src/intel/codex';
import type { WorldState } from '../../src/sim/types';

/**
 * R47 (Astra I11), end to end: an informant's report appends OLDER observations to the board after
 * NEWER ones the avatar witnessed directly. The Codex must pair a telling with what the teller had
 * demonstrably received BEFORE it in time, never with a later reception that merely sits earlier in
 * the array; otherwise a truthful channel manufactures a false deduction against a literalist.
 */
function arrivalWorld(seed: string): WorldState {
  const town = miniTown();
  town.npcs = town.npcs.filter((npc) => ['ada', 'bez', 'cyn'].includes(npc.id));
  for (const npc of town.npcs) {
    npc.traits = [npc.id === 'ada' ? 'exaggerator' : 'literalist'];
    npc.edges = npc.id === 'cyn' ? [] : [{ to: npc.id === 'ada' ? 'bez' : 'ada', kind: 'friend', trust: 0.8 }];
  }
  const world = buildWorld(town, seed, R);
  enrollPlayer(world, { home: 'backroom' });
  world.intel.informants.push({ id: 'cyn', assignedVenue: 'square' });
  applyInject(world, 'bez', {
    subject: 'cyn', predicate: 'stole', object: null, count: 2, severity: 3, place: 'square', attribution: 'someone',
  });
  return world;
}

describe('a delayed report cannot turn a later reception into the cause of an earlier telling (R47)', () => {
  it('literalist bez earns no minimizer corroboration from ada\'s later exaggeration reaching him', () => {
    const world = arrivalWorld('codex-arrival');
    runUntil(world, 15, R);
    applyGoTo(world, 'square');
    runUntil(world, 16, R);

    const rows = world.intel.log.map((row) => ({ tick: row.tick, via: row.via, speaker: row.speaker, addressedTo: row.addressedTo }));
    // The staging really is reversed on the board: the avatar's own tick-15 hearing precedes cyn's tick-0 report.
    expect(rows.findIndex((row) => row.tick === 15 && row.via === 'self')).toBeLessThan(
      rows.findIndex((row) => row.tick === 0 && row.via === 'cyn' && row.speaker === 'bez'));
    expect(world.npcs['bez']!.traits).toEqual(['literalist']);

    const hits = corroborations(world.intel.log, 'bez', 'minimizer', R);
    const chronological = corroborations([...world.intel.log].sort((a, b) => a.tick - b.tick), 'bez', 'minimizer', R);
    expect(chronological).toEqual([]);
    expect(hits).toEqual([]);
    expect(suggestTraits(world.intel.log, 'f0', R)).not.toContain('minimizer');
  });
});
