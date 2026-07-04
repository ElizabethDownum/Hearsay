/**
 * Town validator: named structural + graph invariants, report-style (never throws).
 * It is the repair-or-reroll driver — Task 6 reads the failures and acts on them.
 *
 * Structural invariants run first; graph invariants (built on a weekly MEETING GRAPH)
 * run only on structurally sound towns. The meeting graph is an OVER-APPROXIMATION of
 * information flow (same venue != same conversation circle in a crowded tavern) — it
 * bounds STRUCTURE, not pacing. Pacing truth comes from the Task-8 MC probes. The graph
 * is sampled via the sim's own `venueAt` so the validator sees the same physics the sim does.
 */
import { TICKS_PER_DAY } from '../core/time';
import { venueAt } from '../sim/agents';
import type { EntityId } from '../sim/rumors/claim';
import type { TownFixture } from '../sim/types';
import type { GenConfig, GeneratedTown, InvariantFailure, ValidateOptions, ValidationReport } from './types';

const WEEKDAY_SAMPLE_DAY = 0; // dayOfWeek 0 — a work day
const RESTDAY_SAMPLE_DAY = 6; // REST_DAY
const SAMPLE_STEP = 15;       // minutes — finer than any schedule boundary in use

/** A meets B iff some venue holds both at some sampled minute of a weekday or restday. */
export function meetingGraph(fixture: TownFixture): Map<EntityId, Set<EntityId>> {
  const graph = new Map<EntityId, Set<EntityId>>(fixture.npcs.map((n) => [n.id, new Set<EntityId>()]));
  for (const day of [WEEKDAY_SAMPLE_DAY, RESTDAY_SAMPLE_DAY]) {
    for (let m = 0; m < TICKS_PER_DAY; m += SAMPLE_STEP) {
      const t = day * TICKS_PER_DAY + m;
      const occupants = new Map<string, EntityId[]>();
      for (const n of fixture.npcs) {
        const v = venueAt(n, t);
        (occupants.get(v) ?? occupants.set(v, []).get(v)!).push(n.id);
      }
      for (const ids of occupants.values()) {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            graph.get(ids[i]!)!.add(ids[j]!);
            graph.get(ids[j]!)!.add(ids[i]!);
          }
        }
      }
    }
  }
  return graph;
}

function componentOf(start: EntityId, graph: Map<EntityId, Set<EntityId>>, excluded: EntityId | null): Set<EntityId> {
  const seen = new Set<EntityId>([start]);
  const queue: EntityId[] = [start];
  while (queue.length > 0) {
    const cur = queue.pop()!;
    for (const next of graph.get(cur) ?? []) {
      if (next === excluded || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

function firstDuplicate(ids: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

/** Report-style (never throws): the repair-or-reroll driver reads the failures. */
export function validateTown(town: GeneratedTown, config: GenConfig, opts: ValidateOptions = {}): ValidationReport {
  const failures: InvariantFailure[] = [];
  const fail = (invariant: string, detail: string): void => { failures.push({ invariant, detail }); };
  const { fixture } = town;

  const dupVenue = firstDuplicate(fixture.venues.map((v) => v.id));
  if (dupVenue) fail('ids-unique', `duplicate venue id '${dupVenue}'`);
  const dupNpc = firstDuplicate(fixture.npcs.map((n) => n.id));
  if (dupNpc) fail('ids-unique', `duplicate npc id '${dupNpc}'`);

  const venueIds = new Set(fixture.venues.map((v) => v.id));
  const npcIds = new Set(fixture.npcs.map((n) => n.id));
  for (const n of fixture.npcs) {
    if (!venueIds.has(n.home)) fail('refs-resolve', `npc ${n.id}: unknown home '${n.home}'`);
    for (const s of n.schedule) if (!venueIds.has(s.venue)) fail('refs-resolve', `npc ${n.id}: unknown venue '${s.venue}'`);
    for (const e of n.edges) if (!npcIds.has(e.to)) fail('refs-resolve', `npc ${n.id}: edge to unknown '${e.to}'`);
    for (const r of n.rivals) if (!npcIds.has(r)) fail('refs-resolve', `npc ${n.id}: unknown rival '${r}'`);
  }

  for (const n of fixture.npcs) {
    for (const s of n.schedule) {
      if (!(s.from >= 0 && s.from < s.to && s.to <= 1440)) {
        fail('schedule-sane', `npc ${n.id}: bad block ${s.from}..${s.to} at '${s.venue}'`);
      }
    }
    for (const dt of ['weekday', 'restday'] as const) {
      const active = n.schedule
        .filter((s) => s.days === 'all' || s.days === dt)
        .sort((a, b) => a.from - b.from);
      for (let i = 0; i + 1 < active.length; i++) {
        if (active[i]!.to > active[i + 1]!.from) {
          fail('schedule-sane', `npc ${n.id}: overlapping ${dt} blocks at ${active[i + 1]!.from} (shadowed block = phantom schedule)`);
        }
      }
    }
  }

  for (const n of fixture.npcs) {
    if (n.traits.length < 2 || n.traits.length > 4) fail('traits-in-range', `npc ${n.id}: ${n.traits.length} traits`);
    if (new Set(n.traits).size !== n.traits.length) fail('traits-in-range', `npc ${n.id}: duplicate trait`);
    if (opts.knownTraitIds) {
      for (const t of n.traits) {
        if (!opts.knownTraitIds.includes(t)) fail('traits-in-range', `npc ${n.id}: unknown trait '${t}'`);
      }
    }
  }

  if (fixture.npcs.length !== config.npcCount) {
    fail('npc-count', `${fixture.npcs.length} NPCs !== configured ${config.npcCount}`);
  }

  if (town.keystones.length !== config.keystoneCount) {
    fail('keystones-valid', `${town.keystones.length} keystones !== configured ${config.keystoneCount}`);
  }
  if (new Set(town.keystones).size !== town.keystones.length) fail('keystones-valid', 'duplicate keystone');
  for (const k of town.keystones) if (!npcIds.has(k)) fail('keystones-valid', `unknown keystone '${k}'`);

  // Graph invariants only mean something on a structurally sound town.
  if (failures.length > 0) return { ok: false, failures };

  const graph = meetingGraph(fixture);
  const all = [...npcIds].sort();

  // "no critical role isolated" starts with: nobody is fully isolated.
  const main = componentOf(all[0]!, graph, null);
  if (main.size !== all.length) {
    const outside = all.filter((id) => !main.has(id));
    fail('connected', `meeting graph splits: ${outside.length} NPCs unreachable from '${all[0]}' (e.g. '${outside[0]}')`);
  }

  // Every mind must be able to ADDRESS someone it actually meets — else it can hear but never retell.
  for (const n of fixture.npcs) {
    const meets = graph.get(n.id)!;
    if (!n.edges.some((e) => e.trust > 0 && meets.has(e.to))) {
      fail('speakable', `npc ${n.id} meets ${meets.size} people but trusts none of them`);
    }
  }

  // Spec: "keystone NPCs reachable via >=2 independent social routes" —
  // no single NPC's removal may sever a keystone from the majority of the town.
  const majority = Math.ceil((all.length - 1) / 2);
  for (const k of town.keystones) {
    for (const v of all) {
      if (v === k) continue;
      const comp = componentOf(k, graph, v);
      if (comp.size < majority) {
        fail('keystone-2routes', `keystone '${k}' severed from the majority by removing '${v}' (${comp.size} < ${majority})`);
        break; // one witness per keystone keeps the report readable
      }
    }
  }

  return { ok: failures.length === 0, failures };
}
