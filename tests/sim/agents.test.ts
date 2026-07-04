import { venueAt, circlesAt, CIRCLE_SIZE } from '../../src/sim/agents';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { at } from '../../src/core/time';

const world = buildWorld(TESTFORD, 'agents-seed');

describe('venueAt', () => {
  it('follows the weekday schedule and defaults home', () => {
    const mara = world.npcs['mara']!;
    expect(venueAt(mara, at(0, 8))).toBe('market');     // day 0 = weekday
    expect(venueAt(mara, at(0, 15))).toBe('home-mara'); // gap -> home
    expect(venueAt(mara, at(0, 20))).toBe('tavern');
    expect(venueAt(mara, at(6, 10))).toBe('chapel');    // day 6 = rest day
    expect(venueAt(mara, at(6, 8))).toBe('home-mara');  // no market on rest day
  });
});

describe('circlesAt', () => {
  it('partitions every present NPC into exactly one circle of <= CIRCLE_SIZE', () => {
    const t = at(0, 20); // tavern crowd: mara, osric, hew, jonet, seth
    const circles = circlesAt(world, t);
    const tavern = circles.filter((c) => c.venue === 'tavern');
    const members = tavern.flatMap((c) => c.members).sort();
    expect(members).toEqual(['hew', 'jonet', 'mara', 'osric', 'seth']);
    for (const c of tavern) expect(c.members.length).toBeLessThanOrEqual(CIRCLE_SIZE);
    expect(tavern.length).toBe(2); // 5 people -> 2 circles
  });

  it('is deterministic within an hour window and stable across calls', () => {
    const a = circlesAt(world, at(0, 20, 10));
    const b = circlesAt(world, at(0, 20, 50));
    expect(a).toEqual(b);
    const c = circlesAt(world, at(0, 21, 5)); // new hour -> may reshuffle
    expect(c.flatMap((x) => x.members).sort()).toEqual(a.flatMap((x) => x.members).sort());
  });

  it('different world seeds give different tavern groupings somewhere in the week', () => {
    const w2 = buildWorld(TESTFORD, 'other-seed');
    const days = [0, 1, 2, 3, 4, 5];
    const differs = days.some(
      (d) => JSON.stringify(circlesAt(world, at(d, 20))) !== JSON.stringify(circlesAt(w2, at(d, 20))),
    );
    expect(differs).toBe(true);
  });
});
