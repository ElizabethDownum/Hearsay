import { dayOf } from '../../core/time';
import { mintClaim, SOMEONE } from '../rumors/claim';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import type { VignetteCondition, VignetteDef, VignetteRole } from './types';

type Binding = { a: string; b: string | null };

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function bound(binding: Binding, role: VignetteRole): string {
  const id = role === 'a' ? binding.a : binding.b;
  if (id === null) throw new Error('vignette: consequence references unbound role b');
  return id;
}

function holds(world: WorldState, rules: Rules, cond: VignetteCondition, bind: Binding): boolean {
  switch (cond.kind) {
    case 'mutual-damaging': {
      if (bind.b === null) return false;
      const damages = (holder: string, about: string): boolean =>
        Object.values(world.beliefs[holder] ?? {}).some((bl) =>
          bl.claim.subject === about &&
          rules.predicates[bl.claim.predicate]?.valence === 'damaging' &&
          bl.credence >= cond.minCredence);
      return damages(bind.a, bind.b) && damages(bind.b, bind.a);
    }
    case 'believed-about': {
      const about = bound(bind, cond.role);
      let holders = 0;
      for (const npcId of Object.keys(world.npcs).sort()) {
        if (npcId === about || npcId === world.playerId) continue;
        const hit = Object.values(world.beliefs[npcId] ?? {}).some((bl) =>
          bl.claim.subject === about && bl.claim.predicate === cond.predicate &&
          bl.credence >= cond.minCredence);
        if (hit) holders += 1;
      }
      return holders >= cond.minHolders;
    }
    case 'lover-betrayed': {
      if (bind.b === null) return false;
      const a = world.npcs[bind.a]!;
      if (!a.edges.some((e) => e.to === bind.b && e.kind === 'lover')) return false;
      return Object.values(world.beliefs[bind.a] ?? {}).some((bl) =>
        bl.claim.subject === bind.b && bl.claim.predicate === 'is-having-an-affair-with' &&
        bl.claim.object !== bind.a && bl.credence >= cond.minCredence);
    }
    default: {
      const kind = (cond as { kind: string }).kind;
      throw new Error(`vignette: unknown condition '${kind}'`);
    }
  }
}

function apply(world: WorldState, def: VignetteDef, bind: Binding): void {
  const day = dayOf(world.tick);
  for (const c of def.consequences) {
    switch (c.kind) {
      case 'trust-delta': {
        const from = world.npcs[bound(bind, c.from)]!;
        const to = bound(bind, c.to);
        const edge = from.edges.find((e) => e.to === to);
        if (edge) edge.trust = clamp01(edge.trust + c.delta);   // no edge → no-op (drama needs a relationship)
        break;
      }
      case 'edge-rekind': {
        const from = world.npcs[bound(bind, c.from)]!;
        const edge = from.edges.find((e) => e.to === bound(bind, c.to));
        if (edge) edge.kind = c.newKind;
        break;
      }
      case 'mint-claim': {
        // Genesis machinery re-aimed: ONE shared claim, witnessed into each target mind.
        const family = `vg:${def.id}:${bind.a}`;
        const claim = mintClaim(world, {
          family, parent: null,
          subject: bound(bind, c.subject),
          predicate: c.predicate,
          object: c.object === null ? null : bound(bind, c.object),
          count: null, severity: c.severity, place: null, attribution: SOMEONE,
        });
        world.claims[claim.id] = claim;
        for (const role of c.intoMinds) {
          const mind = bound(bind, role);
          world.beliefs[mind]![family] = {
            claim, credence: 0.95, heardFrom: 'witnessed', heardAt: world.tick,
            firstHeardAt: world.tick, timesHeard: 1, apparentSources: [],
            discretion: false, counterSpun: false,
          };
          world.chronicle.push({ kind: 'inject', tick: world.tick, target: mind, claimId: claim.id, by: bind.a });
        }
        break;
      }
      case 'schedule-home': {
        const who = bound(bind, c.who);
        const home = world.npcs[who]!.home;
        const list = world.scheduleOverrides[who] ?? (world.scheduleOverrides[who] = []);
        list.push({ fromDay: day + 1, toDay: day + 1 + c.days, from: 0, to: 1439, venue: home, source: 'vignette' });
        break;
      }
      default: {
        const kind = (c as { kind: string }).kind;
        throw new Error(`vignette: unknown consequence '${kind}'`);
      }
    }
  }
}

/** Nightly pass: per def, first qualifying binding fires (one per def per night — drama trickles). */
export function runVignettes(world: WorldState, rules: Rules): void {
  const ids = Object.keys(world.npcs).sort().filter((id) => id !== world.playerId);
  for (const def of rules.vignettes) {
    const bindings: Binding[] =
      def.binding === 'solo'
        ? ids.map((a) => ({ a, b: null }))
        : ids.flatMap((a) => ids.filter((b) => b !== a).map((b) => ({ a, b })));
    for (const bind of bindings) {
      const key = `${def.id}:${bind.a}:${bind.b ?? '-'}`;
      if (world.vignettesFired.includes(key)) continue;
      if (!def.conditions.every((cond) => holds(world, rules, cond, bind))) continue;
      apply(world, def, bind);
      world.vignettesFired.push(key);
      world.chronicle.push({ kind: 'vignette', tick: world.tick, defId: def.id, a: bind.a, b: bind.b });
      break;   // one per def per night
    }
  }
}
