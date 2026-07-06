import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { STANDARD_VIGNETTES } from '../../src/content/vignettes';
import { TRAITS } from '../../src/content/traits';
import { buildWorld } from '../../src/sim/world';
import { runBotCampaignOn } from '../../src/bots/runner';
import { bestConnected, type Bot } from '../../src/bots/archetypes';
import type { Action } from '../../src/sim/campaign';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { InjectSpec } from '../../src/sim/actions';
import type { WorldState } from '../../src/sim/types';

/**
 * Vignette reachability probe (report-style, hypothesis-flagged). Silent-cap law: seeds/days/bot
 * are stated explicitly and printed. Fire counts are EMERGENT — there is no pass/fail threshold on
 * them; the test asserts only that every run completes and the report prints. This is the
 * measurement that seeds the retune conversation (Pillar 7 staging: content-width is post-v1 work).
 */

const bankrupt = (subject: string): InjectSpec => ({
  subject, predicate: 'is-bankrupt', object: null, count: null, severity: 3, place: null, attribution: SOMEONE,
});

/**
 * Blitz the three best-connected hubs into ruin: day 0 seeds `is-bankrupt` about each of the top-3
 * hubs into three other best-connected minds (≥3 holders ≥ 0.75 ⇒ merchant-ruin qualifies). Three
 * qualifying solo bindings then TRICKLE out under the one-per-def-per-night cap over the six days.
 */
const bankruptBlitz: Bot = {
  name: 'bankrupt-blitz',
  decide(world, _rules, day) {
    if (day !== 0) return [];
    const ranked = bestConnected(world).filter((id) => id !== world.playerId);
    const subjects = ranked.slice(0, 3);
    const actions: Action[] = [];
    let slot = 0;
    for (const subject of subjects) {
      for (const target of ranked.filter((id) => id !== subject).slice(0, 3)) {
        actions.push({ tick: at(0, 8, slot * 15), kind: 'inject', target, spec: bankrupt(subject) });
        slot += 1;
      }
    }
    return actions;
  },
};

const fires = (world: WorldState, defId: string): number =>
  world.chronicle.filter((e) => e.kind === 'vignette' && e.defId === defId).length;

describe('vignette reachability probe (npm run mc)', () => {
  const SEEDS = ['vr-1', 'vr-2', 'vr-3', 'vr-4', 'vr-5'];
  const DAYS = 6;

  it('fires micro-scenes across procgen towns with a bankrupt-blitz bot — prints per-def counts', () => {
    const totals: Record<string, number> = Object.fromEntries(STANDARD_VIGNETTES.map((d) => [d.id, 0]));
    const perSeed: { seed: string; npcs: number }[] = [];

    for (const seed of SEEDS) {
      const { town } = generateValidTown(
        seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES, { knownTraitIds: Object.keys(TRAITS) },
      );
      const world = buildWorld(town.fixture, seed);
      runBotCampaignOn(world, STANDARD_RULES, bankruptBlitz, DAYS);

      const counts = STANDARD_VIGNETTES.map((d) => {
        const n = fires(world, d.id);
        totals[d.id]! += n;
        return `${d.id}=${n}`;
      });
      console.log(`seed ${seed} · ${town.fixture.npcs.length} NPCs · ${DAYS} days · bot ${bankruptBlitz.name}: ${counts.join('  ')}`);
      perSeed.push({ seed, npcs: town.fixture.npcs.length });
    }

    console.log(`\n=== vignette fires · ${SEEDS.length} seeds × ${DAYS} days · bot ${bankruptBlitz.name} ===`);
    for (const d of STANDARD_VIGNETTES) {
      console.log(`${d.id.padEnd(18)} total ${totals[d.id]}  (mean ${(totals[d.id]! / SEEDS.length).toFixed(1)}/seed)`);
    }

    // No threshold on emergent fire counts — only that every run completed and the report printed.
    expect(perSeed).toHaveLength(SEEDS.length);
    expect(perSeed.every((s) => s.npcs > 0)).toBe(true);
  });
});
