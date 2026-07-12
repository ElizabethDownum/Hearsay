import { dayOf } from '../../core/time';
import { STANCE } from '../rumors/propagation';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import type { GeneratedTown } from '../../world/types';
import { exposureStatus } from './exposure';
import type { ScenarioDef, TurnEvidence, WinCondition } from './types';

/** Enroll the campaign: copies the def's DATA into WorldState (defs are injected, never stored). */
export function attachScenario(world: WorldState, town: GeneratedTown, def: ScenarioDef): void {
  if (world.scenario) throw new Error('attachScenario: a scenario is already attached');
  if (!town.cast) throw new Error('attachScenario: town has no scenario cast');
  world.scenario = {
    defId: def.id, days: def.days, win: def.win,
    cast: { usurper: town.cast.usurper, council: [...town.cast.council] },
    status: 'running', resolution: null,
  };
}

export function isTerminal(world: WorldState): boolean {
  return world.scenario !== null && world.scenario.status !== 'running';
}

function quorumOf(win: WinCondition): number {
  switch (win.kind) {
    case 'council-turns': return win.quorum;
    default: {
      const kind = (win as { kind: string }).kind;
      throw new Error(`scenario: unknown win condition '${kind}'`);
    }
  }
}

/**
 * A council member turns when they hold an act-tier (>= STANCE.BELIEVE) belief in a
 * DAMAGING claim whose subject is the usurper. One evidence row per member — their
 * strongest qualifying belief (credence desc, family asc for the zero-entropy tie).
 */
export function councilTurns(world: WorldState, rules: Rules): TurnEvidence[] {
  const s = world.scenario;
  if (!s) return [];
  const turned: TurnEvidence[] = [];
  for (const npc of [...s.cast.council].sort()) {
    const store = world.beliefs[npc] ?? {};
    let best: TurnEvidence | null = null;
    for (const family of Object.keys(store).sort()) {
      const b = store[family]!;
      if (b.claim.subject !== s.cast.usurper) continue;
      if (rules.predicates[b.claim.predicate]?.valence !== 'damaging') continue;
      if (b.credence < STANCE.BELIEVE) continue;
      if (!best || b.credence > best.credence) {
        best = { npc, family, claimId: b.claim.id, credence: b.credence };
      }
    }
    if (best) turned.push(best);
  }
  return turned;
}

/** Nightly referee: win first (ties go to the player), then exposure, then the clock. Latches on any ending. */
export function scenarioNightly(world: WorldState, rules: Rules): void {
  const s = world.scenario;
  if (!s || s.status !== 'running') return;
  const day = dayOf(world.tick);
  const turned = councilTurns(world, rules);

  if (turned.length >= quorumOf(s.win)) {
    s.status = 'won';
    s.resolution = { kind: 'won', day, turned };
    world.chronicle.push({
      kind: 'institution', tick: world.tick, action: 'denounce',
      subject: s.cast.usurper, actors: turned.map((t) => t.npc),
      claimIds: turned.map((t) => t.claimId),
    });
    return;
  }

  const exp = exposureStatus(world);
  if (exp.identified) {
    s.status = 'lost-exposed';
    s.resolution = { kind: 'lost-exposed', day, features: exp.features };
    world.chronicle.push({
      kind: 'institution', tick: world.tick, action: 'unmasking',
      subject: world.playerId ?? s.cast.usurper, actors: [], claimIds: [],
    });
    return;
  }

  if (day >= s.days - 1) {
    s.status = 'lost-clock';
    s.resolution = { kind: 'lost-clock', day, turned };
    world.chronicle.push({
      kind: 'institution', tick: world.tick, action: 'coronation',
      subject: s.cast.usurper, actors: [], claimIds: turned.map((t) => t.claimId),
    });
  }
}
