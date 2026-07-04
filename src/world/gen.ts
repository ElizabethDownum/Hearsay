import { Rng } from '../core/rng';
import type { EntityId, VenueId } from '../sim/rumors/claim';
import type { Npc, ScheduleEntry, Venue } from '../sim/types';
import type { DistrictInfo, GenConfig, GenContent, GeneratedTown, OccupationDef } from './types';

/** Round to 2 decimals — keeps generated trust values readable and JSON-stable. */
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Deterministic weighted pick. */
function weightedPick<T extends { weight: number }>(rng: Rng, items: readonly T[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = rng.float() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1]!;
}

const EVENING_STARTS = [1080, 1110, 1140] as const; // 18:00 / 18:30 / 19:00
const BRIDGE_FROM = 1080;
const BRIDGE_TO = 1200;

interface CastMeta {
  npc: Npc;
  district: string;
  occupation: OccupationDef;
}

export function generateTown(seed: string, config: GenConfig, content: GenContent): GeneratedTown {
  if (config.npcCount < 1 || config.districtCount < 1) throw new Error('generateTown: bad config');
  if (content.names.length < config.npcCount) {
    throw new Error(`generateTown: name pool ${content.names.length} < npcCount ${config.npcCount}`);
  }

  // Per-subsystem streams (spec: adding a feature never reshuffles another system's draws).
  const namesRng = new Rng(seed, 'gen:names');
  const householdsRng = new Rng(seed, 'gen:households');
  const castRng = new Rng(seed, 'gen:cast');
  const schedulesRng = new Rng(seed, 'gen:schedules');
  const bridgesRng = new Rng(seed, 'gen:bridges');
  const edgesRng = new Rng(seed, 'gen:edges');
  const rivalsRng = new Rng(seed, 'gen:rivals');
  const keystonesRng = new Rng(seed, 'gen:keystones');

  // ── 1. Districts + institutional venues (fixed grammar) ─────────────────
  const districtIds = Array.from({ length: config.districtCount }, (_, i) => `d${i}`);
  const venues: Venue[] = [];
  const venuesByDistrict = new Map<string, VenueId[]>(districtIds.map((d) => [d, []]));
  for (const arch of content.venueArchetypes) {
    const targets = arch.scope === 'singleton' ? [districtIds[0]!] : districtIds;
    for (const d of targets) {
      const id = arch.scope === 'singleton' ? arch.id : `${arch.id}-${d}`;
      venues.push({ id, district: d, access: arch.access });
      venuesByDistrict.get(d)!.push(id);
    }
  }

  // ── 2. Households: sizes 1–4; each gets a private home in its district ──
  // (venueAt falls back to home, so households meet overnight for free — kin gossip physics.)
  const drawnNames = namesRng.shuffle(content.names).slice(0, config.npcCount);
  interface Household { district: string; home: VenueId; memberNames: string[] }
  const households: Household[] = [];
  let cursor = 0;
  while (cursor < config.npcCount) {
    const size = Math.min(config.npcCount - cursor, householdsRng.int(1, 5));
    const district = districtIds[householdsRng.int(0, districtIds.length)]!;
    const home: VenueId = `home-${households.length}`;
    venues.push({ id: home, district, access: 'private' });
    venuesByDistrict.get(district)!.push(home);
    households.push({ district, home, memberNames: drawnNames.slice(cursor, cursor + size) });
    cursor += size;
  }

  // ── 3. Cast: occupation, faction, traits ─────────────────────────────────
  const cast: CastMeta[] = [];
  for (const hh of households) {
    for (const name of hh.memberNames) {
      const occupation = weightedPick(castRng, content.occupations);
      const faction = weightedPick(castRng, content.factions).id;
      const traitCount = castRng.int(2, 5); // 2..4
      const pool = [...content.traitPool];
      const traits: string[] = [];
      for (let i = 0; i < traitCount; i++) {
        const picked = weightedPick(castRng, pool);
        traits.push(picked.id);
        pool.splice(pool.indexOf(picked), 1);
      }
      const npc: Npc = {
        id: name.toLowerCase(), name, home: hh.home, occupation: occupation.id,
        faction, traits, rivals: [], schedule: [], edges: [],
      };
      cast.push({ npc, district: hh.district, occupation });
    }
  }
  const byId = new Map(cast.map((m) => [m.npc.id, m]));

  // ── 4. Schedules: weekday shift + optional evening tavern + restday chapel ──
  const workplaceOf = (meta: CastMeta): VenueId => {
    const arch = content.venueArchetypes.find((a) => a.id === meta.occupation.workplace);
    if (!arch) throw new Error(`generateTown: occupation '${meta.occupation.id}' names unknown archetype '${meta.occupation.workplace}'`);
    return arch.scope === 'singleton' ? arch.id : `${arch.id}-${meta.district}`;
  };
  for (const meta of cast) {
    const { npc, occupation } = meta;
    npc.schedule.push({ days: 'weekday', from: occupation.from, to: occupation.to, venue: workplaceOf(meta) });
    if (occupation.eveningTavern) {
      const start = EVENING_STARTS[schedulesRng.int(0, EVENING_STARTS.length)]!;
      npc.schedule.push({ days: 'all', from: start, to: Math.min(start + 150, 1439), venue: `tavern-${meta.district}` });
    }
    if (schedulesRng.float() < 0.8) {
      npc.schedule.push({ days: 'restday', from: 540, to: 660, venue: `chapel-${meta.district}` });
    }
  }

  // ── 5. Designated bridges: evenings in the adjacent district's tavern ────
  // Firebreaks are strategic terrain; bridges are how stories cross them (spec amendment #2).
  const adjacentPairs: [string, string][] = [];
  for (let i = 0; i + 1 < districtIds.length; i++) adjacentPairs.push([districtIds[i]!, districtIds[i + 1]!]);

  const windowOverlaps = (s: ScheduleEntry, dayType: 'weekday' | 'restday', from: number, to: number): boolean =>
    (s.days === 'all' || s.days === dayType) && s.from < to && from < s.to;

  const bridgeIds = new Set<EntityId>();
  for (const [a, b] of adjacentPairs) {
    for (let k = 0; k < config.bridgesPerAdjacentPair; k++) {
      const home = k % 2 === 0 ? a : b; // alternate sides: routes in both directions
      const far = home === a ? b : a;
      const eligible = cast
        .filter((m) => {
          if (m.district !== home || bridgeIds.has(m.npc.id)) return false;
          // must be free 18:00–20:00 once their own-tavern evening block is swapped out
          const kept = m.npc.schedule.filter((s) => !(s.days === 'all' && s.venue === `tavern-${m.district}`));
          return (['weekday', 'restday'] as const).every((dt) =>
            kept.every((s) => !windowOverlaps(s, dt, BRIDGE_FROM, BRIDGE_TO)));
        })
        .sort((x, y) => x.npc.id.localeCompare(y.npc.id));
      if (eligible.length === 0) continue; // the validator judges the town that results
      const chosen = eligible[bridgesRng.int(0, eligible.length)]!;
      bridgeIds.add(chosen.npc.id);
      chosen.npc.schedule = chosen.npc.schedule.filter((s) => !(s.days === 'all' && s.venue === `tavern-${chosen.district}`));
      chosen.npc.schedule.push({ days: 'all', from: BRIDGE_FROM, to: BRIDGE_TO, venue: `tavern-${far}` });
      // A bridge needs trusted addressees to SPEAK on the far side, not just listen.
      const regulars = cast
        .filter((m) => m.district === far &&
          m.npc.schedule.some((s) => s.days === 'all' && s.venue === `tavern-${far}` && s.from < BRIDGE_TO && BRIDGE_FROM < s.to))
        .sort((x, y) => x.npc.id.localeCompare(y.npc.id));
      for (const p of bridgesRng.shuffle(regulars).slice(0, 2)) {
        const trust = r2(0.5 + bridgesRng.float() * 0.3);
        chosen.npc.edges.push({ to: p.npc.id, kind: 'friend', trust });
        p.npc.edges.push({ to: chosen.npc.id, kind: 'friend', trust });
      }
    }
  }

  // ── 6. Edges: kin cliques, workplace colleagues, venue-sharing friends ──
  for (const hh of households) {
    const ids = hh.memberNames.map((n) => n.toLowerCase());
    for (const from of ids) for (const to of ids) {
      if (from === to) continue;
      byId.get(from)!.npc.edges.push({ to, kind: 'kin', trust: r2(0.85 + edgesRng.float() * 0.1) });
    }
  }

  const byWorkplace = new Map<VenueId, CastMeta[]>();
  for (const m of cast) {
    const w = workplaceOf(m);
    (byWorkplace.get(w) ?? byWorkplace.set(w, []).get(w)!).push(m);
  }
  for (const [, group] of [...byWorkplace.entries()].sort(([x], [y]) => x.localeCompare(y))) {
    const sorted = [...group].sort((x, y) => x.npc.id.localeCompare(y.npc.id));
    if (sorted.length < 2) continue;
    const span = sorted.length === 2 ? 1 : 2;
    sorted.forEach((m, i) => {
      for (let step = 1; step <= span; step++) {
        const other = sorted[(i + step) % sorted.length]!;
        if (other.npc.id === m.npc.id || m.npc.edges.some((e) => e.to === other.npc.id)) continue;
        m.npc.edges.push({ to: other.npc.id, kind: 'colleague', trust: r2(0.5 + edgesRng.float() * 0.2) });
      }
    });
  }

  // Friends share at least one scheduled venue, so friendships usually MEET
  // (the validator's speakable invariant stays cheap to satisfy).
  const scheduledVenues = (npc: Npc): Set<VenueId> => new Set(npc.schedule.map((s) => s.venue));
  for (const meta of cast) {
    const mine = scheduledVenues(meta.npc);
    const candidates = cast
      .filter((o) =>
        o.npc.id !== meta.npc.id &&
        o.district === meta.district &&
        o.npc.home !== meta.npc.home &&
        !meta.npc.edges.some((e) => e.to === o.npc.id) &&
        [...scheduledVenues(o.npc)].some((v) => mine.has(v)))
      .sort((x, y) => x.npc.id.localeCompare(y.npc.id));
    const want = edgesRng.int(1, 4);
    for (const p of edgesRng.shuffle(candidates).slice(0, want)) {
      const trust = r2(0.5 + edgesRng.float() * 0.3);
      meta.npc.edges.push({ to: p.npc.id, kind: 'friend', trust });
      if (!p.npc.edges.some((e) => e.to === meta.npc.id)) {
        p.npc.edges.push({ to: meta.npc.id, kind: 'friend', trust });
      }
    }
  }

  // ── 7. Rivals: ~30% of NPCs nurse one same-district grudge ──────────────
  for (const meta of cast) {
    if (rivalsRng.float() >= 0.3) continue;
    const candidates = cast
      .filter((o) => o.npc.id !== meta.npc.id && o.district === meta.district && o.npc.home !== meta.npc.home)
      .map((o) => o.npc.id)
      .sort();
    if (candidates.length === 0) continue;
    meta.npc.rivals = [candidates[rivalsRng.int(0, candidates.length)]!];
  }

  // ── 8. Keystones: spread across districts first, then fill ──────────────
  const shuffledIds = keystonesRng.shuffle(cast.map((m) => m.npc.id).sort());
  const keystones: EntityId[] = [];
  const seenDistricts = new Set<string>();
  for (const id of shuffledIds) {
    if (keystones.length >= config.keystoneCount) break;
    const d = byId.get(id)!.district;
    if (seenDistricts.has(d)) continue;
    seenDistricts.add(d);
    keystones.push(id);
  }
  for (const id of shuffledIds) {
    if (keystones.length >= config.keystoneCount) break;
    if (!keystones.includes(id)) keystones.push(id);
  }

  const districts: DistrictInfo[] = districtIds.map((d) => ({
    id: d,
    venueIds: venuesByDistrict.get(d)!,
    npcIds: cast.filter((m) => m.district === d).map((m) => m.npc.id),
  }));

  return { fixture: { venues, npcs: cast.map((m) => m.npc) }, districts, keystones };
}
