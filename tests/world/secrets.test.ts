import { describe, expect, it } from 'vitest';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { generateTown } from '../../src/world/gen';
import { worldFromTown } from '../../src/world/attach';
import { runUntil } from '../../src/sim/step';
import { runBotCampaignOn } from '../../src/bots/runner';
import { runLogOn } from '../../src/sim/campaign';
import { blitzCrier } from '../../src/bots/archetypes';
import { hashWorld } from '../../src/sim/hash';
import { at, TICKS_PER_DAY } from '../../src/core/time';

const town = generateTown('secrets-seed', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);

describe('secret generation', () => {
  it('is deterministic and shape-respecting', () => {
    const again = generateTown('secrets-seed', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
    expect(again.secrets).toEqual(town.secrets);
    expect(town.secrets).toHaveLength(STANDARD_GEN_CONFIG.secretCount);
    const subjects = town.secrets.map((s) => s.subject);
    expect(new Set(subjects).size).toBe(subjects.length); // one secret per subject
    const byId = new Map(town.fixture.npcs.map((n) => [n.id, n]));
    for (const s of town.secrets) {
      const shape = STANDARD_GEN_CONTENT.secretShapes.find((sh) => sh.predicate === s.predicate)!;
      expect(shape).toBeDefined();
      expect(s.object !== null).toBe(shape.needsObject);
      if (shape.needsPlace) {
        expect(byId.get(s.subject)!.schedule.map((e) => e.venue)).toContain(s.place);
      }
      expect(s.witnesses.length).toBeGreaterThanOrEqual(1);
      expect(s.witnesses.length).toBeLessThanOrEqual(2);
      expect(s.witnesses).not.toContain(s.subject);
      if (s.object) expect(s.witnesses).not.toContain(s.object);
    }
  });
});

describe('worldFromTown', () => {
  it('wires the enemy roster and map, seeds witnesses with witnessed+discretion beliefs, genesis-chronicled', () => {
    const world = worldFromTown(town, 'attach-1');
    // The guards, PLUS the embodied spymaster's civilian assets as flat-0.5 observers (Task 7 —
    // his coverage grows beyond the guards through the same observer machinery).
    expect(world.enemy.observers).toEqual([
      ...town.guards,
      ...town.enemyNet!.assets.map((id) => ({ id, vigilance: 0.5 })),
    ]);
    expect(world.enemy.map.directory).toHaveLength(town.fixture.npcs.length);
    for (const s of town.secrets) {
      for (const w of s.witnesses) {
        const b = world.beliefs[w]![s.id]!;
        expect(b.heardFrom).toBe('witnessed');
        expect(b.discretion).toBe(true);
        expect(b.credence).toBe(0.95);
      }
      const genesis = world.chronicle.filter((e) => e.kind === 'inject' && e.by === 'genesis'
        && world.claims[e.claimId]!.family === s.id);
      expect(genesis).toHaveLength(s.witnesses.length);
    }
  });

  it('secrets stay dormant: two quiet days produce zero tellings of any secret family', () => {
    const world = worldFromTown(town, 'attach-2');
    runUntil(world, at(2, 0), STANDARD_RULES);
    const secretIds = new Set(town.secrets.map((s) => s.id));
    const leaked = world.chronicle.filter(
      (e) => e.kind === 'telling' && secretIds.has(world.claims[e.claimId]!.family),
    );
    expect(leaked).toHaveLength(0);
  });

  it('enemy-attached worlds replay hash-identical (live ≡ replay)', () => {
    const live = runBotCampaignOn(worldFromTown(town, 'attach-3'), STANDARD_RULES, blitzCrier, 2);
    const replayed = runLogOn(worldFromTown(town, 'attach-3'), STANDARD_RULES, live.save.log, 2 * TICKS_PER_DAY);
    expect(hashWorld(replayed)).toBe(hashWorld(live.world));
  });
});
