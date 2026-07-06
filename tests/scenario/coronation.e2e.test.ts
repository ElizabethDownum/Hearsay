import { describe, expect, it } from 'vitest';
import { generateValidTown } from '../../src/world/serve';
import { validateTown } from '../../src/world/validate';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { attachScenario, councilTurns } from '../../src/sim/scenario/referee';
import { applyInject, type InjectSpec } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { at } from '../../src/core/time';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import { CORONATION } from '../../src/content/scenarios/coronation';
import { TERMS } from '../../src/content/terms';
import type { GeneratedTown } from '../../src/world/types';
import type { InstitutionRecord, Npc, WorldState } from '../../src/sim/types';

// ── env-gated seed counts (positive-int guard idiom, soak.report precedent) ─────────────
const ENV = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
function posIntEnv(name: string, def: number): number {
  const raw = ENV[name];
  const n = Number(raw ?? def);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer (got '${raw}')`);
  return n;
}

const OPTS = {
  knownTraitIds: Object.keys(STANDARD_RULES.traits),
  knownPredicateIds: Object.keys(STANDARD_RULES.predicates),
};

/** Full V1 staging pipeline: valid town → live world → avatar → campaign referee. */
function buildFull(seed: string): { world: WorldState; town: GeneratedTown } {
  const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES, OPTS);
  const world = worldFromTown(town, seed);
  attachPlayer(world, town);
  attachScenario(world, town, CORONATION);
  return { world, town };
}

const institutionsOf = (world: WorldState): InstitutionRecord[] =>
  world.chronicle.filter((e): e is InstitutionRecord => e.kind === 'institution');

/** The gravest dirt in the game, aimed at the usurper — what a carrier is handed on day 0. */
const poison = (subject: EntityId): InjectSpec => ({
  subject, predicate: 'poisoned', object: SOMEONE, count: null, severity: 5, place: null, attribution: SOMEONE,
});

/**
 * Deterministic carrier selection FROM the town graph (no reaching into council minds):
 * for each council member, the two non-council, non-guard, non-usurper NPCs with the highest
 * edge-count who share a scheduled venue with them. Deduped across council; total lexicographic
 * orders throughout (council asc, candidates by edge-count desc then id asc, result asc).
 */
function carriersFor(town: GeneratedTown): EntityId[] {
  const cast = town.cast!;
  const guardIds = new Set(town.guards.map((g) => g.id));
  const councilSet = new Set(cast.council);
  const byId = new Map(town.fixture.npcs.map((n) => [n.id, n]));
  const venuesOf = (n: Npc): Set<string> => new Set(n.schedule.map((s) => s.venue));
  const eligible = (id: EntityId): boolean =>
    !councilSet.has(id) && !guardIds.has(id) && id !== cast.usurper;

  const carriers = new Set<EntityId>();
  for (const councilId of [...cast.council].sort()) {
    const councilVenues = venuesOf(byId.get(councilId)!);
    const picks = town.fixture.npcs
      .filter((n) => eligible(n.id))
      .filter((n) => [...venuesOf(n)].some((v) => councilVenues.has(v)))
      .sort((a, b) => b.edges.length - a.edges.length || (a.id < b.id ? -1 : 1))
      .slice(0, 2);
    for (const p of picks) carriers.add(p.id);
  }
  return [...carriers].sort();
}

/** Each council member's strongest damaging-about-usurper credence (0 if none) — trajectory data. */
function councilCredences(world: WorldState): number[] {
  const s = world.scenario!;
  return [...s.cast.council].sort().map((npc) => {
    const store = world.beliefs[npc] ?? {};
    let best = 0;
    for (const family of Object.keys(store)) {
      const b = store[family]!;
      if (b.claim.subject !== s.cast.usurper) continue;
      if (STANDARD_RULES.predicates[b.claim.predicate]?.valence !== 'damaging') continue;
      if (b.credence > best) best = b.credence;
    }
    return best;
  });
}

// ── Step 1: day-0 sanity ────────────────────────────────────────────────────────────────
describe('Coronation — day-0 sanity (full pipeline)', () => {
  for (const seed of ['cor-1', 'cor-2', 'cor-3']) {
    it(`${seed}: attaches running, cast complete + validator-clean, dossier seeded, objective term resolves`, () => {
      const { world, town } = buildFull(seed);

      // status running
      expect(world.scenario!.status).toBe('running');
      expect(world.scenario!.defId).toBe(CORONATION.id);
      expect(world.scenario!.days).toBe(CORONATION.days);

      // cast complete + validator-clean
      expect(town.cast).toBeTruthy();
      const cast = town.cast!;
      expect(world.npcs[cast.usurper]).toBeDefined();
      expect(cast.council).toHaveLength(STANDARD_GEN_CONFIG.keystoneCount);
      for (const c of cast.council) expect(world.npcs[c]).toBeDefined();
      expect(cast.council).not.toContain(cast.usurper);
      expect(validateTown(town, STANDARD_GEN_CONFIG, OPTS).ok).toBe(true);

      // dossier intel seeded (attachPlayer wired the day-0 briefing)
      expect(town.dossier).not.toBeNull();
      expect(world.playerId).toBe('you');
      expect(world.intel.informants).toHaveLength(STANDARD_GEN_CONFIG.dossierInformants);
      expect(world.intel.log.length).toBeGreaterThan(0);
      expect(world.intel.log.every((e) => e.via === 'dossier')).toBe(true);

      // cross-content integrity: the objective line the UI will show exists in the registry
      const term = TERMS[CORONATION.objectiveTerm];
      expect(term, `objective term '${CORONATION.objectiveTerm}' unregistered`).toBeDefined();
      expect(term!.label.length).toBeGreaterThan(0);
      expect(term!.short.length).toBeGreaterThan(0);
    });
  }
});

// ── Step 2: hands-off clock loss (hypothesis-flagged) ───────────────────────────────────
describe('Coronation — hands-off clock loss', () => {
  const HANDS_SEEDS = ['cor-1', 'cor-2'];
  const count = Math.min(posIntEnv('COR_SEEDS', 1), HANDS_SEEDS.length);

  for (const seed of HANDS_SEEDS.slice(0, count)) {
    it(`${seed}: the town alone does NOT topple the usurper → lost-clock on day 39 + coronation record`, { timeout: 30000 }, () => {
      const { world, town } = buildFull(seed);
      runUntil(world, at(CORONATION.days, 0), STANDARD_RULES); // through the day-(days-1) nightly

      const s = world.scenario!;
      // HYPOTHESIS (P4-proven: secrets dormant; vignette damage should not organically reach
      // act-tier on the usurper). A hands-off WIN is a DESIGN FINDING, not a test bug — capture
      // the thread here so the controller can adjudicate story-vs-pacing-leak.
      if (s.status !== 'lost-clock') {
        console.log(`[HANDS-OFF ${seed}] STOP — unexpected status '${s.status}'. resolution=${JSON.stringify(s.resolution)}`);
        console.log(`[HANDS-OFF ${seed}] council turned=${JSON.stringify(councilTurns(world, STANDARD_RULES))}`);
      }
      expect(s.status).toBe('lost-clock');
      expect(s.resolution?.kind).toBe('lost-clock');
      if (s.resolution?.kind === 'lost-clock') expect(s.resolution.day).toBe(CORONATION.days - 1);

      const last = institutionsOf(world).at(-1)!;
      expect(last.action).toBe('coronation');
      expect(last.subject).toBe(town.cast!.usurper);
    });
  }
});

// ── Step 3: the open-final-door proof (staged win through REAL physics) ──────────────────
interface DoorResult {
  seed: string;
  won: boolean;
  world: WorldState;
  carriers: EntityId[];
  turnedTraj: number[];
  credTraj: number[][];
}

function runDoorSeed(seed: string): DoorResult {
  const { world, town } = buildFull(seed);
  const carriers = carriersFor(town);
  // poisoned-about-the-usurper into each carrier at the top of day 0 — NOT into council minds.
  // The council must be turned by the TOWN carrying the rumor, read from real propagated beliefs.
  for (const c of carriers) applyInject(world, c, poison(town.cast!.usurper));

  const turnedTraj: number[] = [];
  const credTraj: number[][] = [];
  for (let day = 0; day < CORONATION.days; day++) {
    runUntil(world, at(day + 1, 0), STANDARD_RULES); // through day `day` nightly (the referee beat)
    turnedTraj.push(councilTurns(world, STANDARD_RULES).length);
    credTraj.push(councilCredences(world));
    if (world.scenario!.status !== 'running') break; // referee latches — no need to run further
  }
  return { seed, won: world.scenario!.status === 'won', world, carriers, turnedTraj, credTraj };
}

describe('Coronation — the open-final-door proof', () => {
  const DOOR_SEEDS = ['cor-door-1', 'cor-door-2', 'cor-door-3', 'cor-door-4', 'cor-door-5'];
  const count = Math.min(posIntEnv('COR_DOOR_SEEDS', DOOR_SEEDS.length), DOOR_SEEDS.length);
  const seeds = DOOR_SEEDS.slice(0, count);

  // 30s idiom on long tests; early break on the latch keeps winning seeds cheap (a 0/5 STOP run is
  // the worst case: 5 seeds × 40 days ≈ 5s, comfortably inside the budget).
  it(`≥1 of ${seeds.length} seeds reaches 'won' before day 40 via carrier propagation`, { timeout: 30000 }, () => {
    const results = seeds.map(runDoorSeed);

    console.log(`\n=== open-final-door · ${seeds.length} seeds · deterministic carriers · poisoned injection ===`);
    for (const r of results) {
      const st = r.world.scenario!;
      console.log(`${r.seed}: carriers=${r.carriers.length} [${r.carriers.join(',')}] → ${st.status}${r.won ? ` on day ${st.resolution?.kind === 'won' ? st.resolution.day : '?'}` : ''}`);
    }

    const winners = results.filter((r) => r.won);
    if (winners.length === 0) {
      // STOP finding: pacing at the heart of the game. Print per-day council-credence trajectories
      // (juiciness × trust × corroboration could not lift credence past 0.75 in 40 days). Do NOT
      // touch physics/seeds/thresholds — the controller takes this to Ellie as a tuning question.
      for (const r of results) {
        console.log(`\n[DOOR STOP ${r.seed}] per-day (turned · council credences):`);
        r.turnedTraj.forEach((t, d) => {
          console.log(`  day ${String(d).padStart(2)}: turned=${t}  creds=[${r.credTraj[d]!.map((c) => c.toFixed(2)).join(', ')}]`);
        });
      }
    }

    expect(winners.length).toBeGreaterThanOrEqual(1);

    // Fair-cop on every win: quorum satisfied and every claimId resolves against the registry.
    for (const r of winners) {
      const res = r.world.scenario!.resolution!;
      expect(res.kind).toBe('won');
      if (res.kind === 'won') {
        expect(res.turned.length).toBeGreaterThanOrEqual(CORONATION.win.quorum);
        for (const t of res.turned) expect(r.world.claims[t.claimId]).toBeDefined();
        expect(res.day).toBeLessThan(CORONATION.days);
      }
    }
  });
});
