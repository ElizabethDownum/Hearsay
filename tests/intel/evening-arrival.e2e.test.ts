import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { miniTown } from '../sim/helpers/minitown';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { applyGoTo, applyInject } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { eveningReport } from '../../src/intel/report';
import { counterKnowledge, learnedAtByEntry } from '../../src/sim/debrief/knowledge';
import type { WorldState } from '../../src/sim/types';

/**
 * R47 (Astra I12), end to end: an informant's report preserves observation time in `IntelEntry.tick`,
 * which is right for the board; the evening report must file a story under the day it REACHED the
 * player. The lawful acquisition clock is the debrief's own receipt history (`counterKnowledge`),
 * handed to the pure fold beside the log; the fold itself still never sees `WorldState`.
 */
function eveningWorld(seed: string): WorldState {
  const town = miniTown();
  town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) {
    npc.traits = ['literalist'];
    npc.edges = npc.edges.filter((edge) => ['ada', 'bez'].includes(edge.to));
  }
  const world = buildWorld(town, seed, R);
  enrollPlayer(world, { home: 'backroom' });
  world.intel.informants.push({ id: 'ada', assignedVenue: 'square' });
  applyInject(world, 'bez', {
    subject: 'ada', predicate: 'poisoned', object: null, count: 3, severity: 5, place: 'square', attribution: 'someone',
  });
  return world;
}

describe('the evening report files a story under the day it reached the player (R47)', () => {
  it('stories first delivered on day 1 are new on day 1, not on the day they were observed', () => {
    const world = eveningWorld('evening-arrival');
    runUntil(world, 1440, R);
    expect(world.intel.log).toHaveLength(0);           // nothing has reached the player before contact
    applyGoTo(world, 'square');
    runUntil(world, 1456, R);

    const learned = learnedAtByEntry(world);
    expect(learned).toHaveLength(world.intel.log.length);
    const receipts = counterKnowledge(world).filter((row) => row.timing === 'report');
    expect(receipts.length).toBeGreaterThan(0);
    for (const row of receipts) expect(learned[row.entryIndex]).toBe(row.learnedAt);
    expect(world.intel.log.some((row) => row.tick < 1440)).toBe(true);   // observation time is kept on the rows

    const day1 = eveningReport(world.intel.log, 1, learned);
    const day0 = eveningReport(world.intel.log, 0, learned);
    expect(day1.newFamilies.length).toBeGreaterThan(0);
    expect(day0.newFamilies).toEqual([]);
    expect(Object.values(day0.entriesByVia).flat()).toEqual([]);
    expect(Object.values(day1.entriesByVia).flat().sort((a, b) => a - b))
      .toEqual(world.intel.log.map((_, i) => i));
  });

  it('the app hands the fold the lawful acquisition clock (composition-root pin)', () => {
    const src = readFileSync(join(process.cwd(), 'app/src/main.tsx'), 'utf8');
    expect(src).toMatch(/eveningReport\(log, .+, learnedAtByEntry\(world\)\)/);
  });
});
