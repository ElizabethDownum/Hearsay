import { Rng } from '../core/rng';
import type { EntityId, VenueId } from '../sim/rumors/claim';
import type { Npc, ScheduleEntry, Venue } from '../sim/types';
import type { ObserverSpec } from '../sim/enemy/state';
import type { DistrictInfo, Dossier, GenConfig, GenContent, GeneratedTown, OccupationDef, Secret } from './types';
import type { ScenarioCast } from '../sim/scenario/types';

/** Round to 2 decimals — keeps generated trust values readable and JSON-stable. */
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Deterministic weighted pick. */
function weightedPick<T extends { weight: number }>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('weightedPick: empty pool');
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
  for (const occ of content.occupations) {
    if (occ.eveningTavern && occ.to > 1080) {
      throw new Error(`generateTown: occupation '${occ.id}' has eveningTavern but works past 1080 (${occ.to})`);
    }
  }

  // Per-subsystem streams (spec: adding a feature never reshuffles another system's draws).
  const namesRng = new Rng(seed, 'gen:names');
  const householdsRng = new Rng(seed, 'gen:households');
  const castRng = new Rng(seed, 'gen:cast');
  const schedulesRng = new Rng(seed, 'gen:schedules');
  const bridgesRng = new Rng(seed, 'gen:bridges');
  const guardsRng = new Rng(seed, 'gen:guards');
  const edgesRng = new Rng(seed, 'gen:edges');
  const rivalsRng = new Rng(seed, 'gen:rivals');
  const keystonesRng = new Rng(seed, 'gen:keystones');
  const secretsRng = new Rng(seed, 'gen:secrets');
  const dossierRng = new Rng(seed, 'gen:dossier');
  const scenarioRng = new Rng(seed, 'gen:scenario');

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

  // ── 5b. Designated guards: quality + placement (enemy coverage terrain) ──
  const GUARD_PATROL = { from: 600, to: 840 };   // market patrol — where gossip flows
  const GUARD_EVENING = { from: 1080, to: 1230 } // tavern presence
  const guards: ObserverSpec[] = [];
  for (const d of districtIds) {
    for (let k = 0; k < config.guardsPerDistrict; k++) {
      const eligible = cast
        .filter((m) => m.district === d && !bridgeIds.has(m.npc.id) && m.npc.occupation !== content.guardOccupation.id)
        .sort((x, y) => x.npc.id.localeCompare(y.npc.id));
      if (eligible.length === 0) continue; // the validator judges the town that results
      const chosen = eligible[guardsRng.int(0, eligible.length)]!;
      chosen.occupation = content.guardOccupation;
      chosen.npc.occupation = content.guardOccupation.id;
      chosen.npc.schedule = chosen.npc.schedule.filter((s) =>
        !(s.days === 'weekday') && !(s.days === 'all' && s.venue === `tavern-${d}`));
      chosen.npc.schedule.push(
        { days: 'weekday', from: content.guardOccupation.from, to: content.guardOccupation.to, venue: workplaceOf(chosen) },
        { days: 'weekday', from: GUARD_PATROL.from, to: GUARD_PATROL.to, venue: `market-${d}` },
        { days: 'all', from: GUARD_EVENING.from, to: GUARD_EVENING.to, venue: `tavern-${d}` },
      );
      guards.push({ id: chosen.npc.id, vigilance: r2(0.3 + guardsRng.float() * 0.6) });
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

  // ── 9. Secrets: the true hidden history — real dirt with real witnesses ──
  const secrets: Secret[] = [];
  const secretSubjects = new Set<EntityId>();
  const sharesVenueWith = (a: Npc, b: Npc): boolean => {
    const av = new Set(a.schedule.map((s) => s.venue));
    return b.schedule.some((s) => av.has(s.venue));
  };
  for (let i = 0; i < config.secretCount; i++) {
    const candidates = cast.filter((m) => !secretSubjects.has(m.npc.id))
      .sort((x, y) => x.npc.id.localeCompare(y.npc.id));
    if (candidates.length === 0) break;
    const subjectMeta = candidates[secretsRng.int(0, candidates.length)]!;
    const shape = weightedPick(secretsRng, content.secretShapes);
    let object: EntityId | null = null;
    if (shape.needsObject) {
      const others = cast.filter((m) => m.district === subjectMeta.district && m.npc.id !== subjectMeta.npc.id)
        .map((m) => m.npc.id).sort();
      if (others.length === 0) continue;
      object = others[secretsRng.int(0, others.length)]!;
    }
    let place: VenueId | null = null;
    if (shape.needsPlace) {
      const venuesOfSubject = [...new Set(subjectMeta.npc.schedule.map((s) => s.venue))].sort();
      if (venuesOfSubject.length === 0) continue;
      place = venuesOfSubject[secretsRng.int(0, venuesOfSubject.length)]!;
    }
    const witnessPool = cast.filter((m) =>
      m.npc.id !== subjectMeta.npc.id && m.npc.id !== object && sharesVenueWith(m.npc, subjectMeta.npc))
      .map((m) => m.npc.id).sort();
    if (witnessPool.length === 0) continue;
    const witnesses = secretsRng.shuffle(witnessPool).slice(0, secretsRng.int(1, 3));
    secretSubjects.add(subjectMeta.npc.id);
    secrets.push({ id: `s${secrets.length}`, subject: subjectMeta.npc.id, predicate: shape.predicate,
      object, place, severity: shape.severity, witnesses });
  }

  // ── 10. Day-0 dossier: truthful, capped starting intelligence ───────────
  // References the finished cast + secrets; a fresh 'gen:dossier' stream keeps every earlier draw
  // byte-identical, so adding the dossier never reshuffles another subsystem.
  const nonGuardIds = cast.filter((m) => m.npc.occupation !== content.guardOccupation.id)
    .map((m) => m.npc.id).sort();
  const informantIds = dossierRng.shuffle(nonGuardIds).slice(0, config.dossierInformants);
  const readPool = dossierRng.shuffle(cast.map((m) => m.npc.id).sort());
  const traitReads: Dossier['traitReads'] = [];
  const readCount = dossierRng.int(1, config.dossierTraitReadMax + 1);
  for (const id of readPool.slice(0, readCount)) {
    const npc = byId.get(id)!.npc;
    traitReads.push({ npc: id, trait: npc.traits[dossierRng.int(0, npc.traits.length)]! });
  }
  const allEdges = cast.flatMap((m) => m.npc.edges.map((e) => ({ from: m.npc.id, to: e.to, kind: e.kind })))
    .sort((a, b) => `${a.from}:${a.to}:${a.kind}`.localeCompare(`${b.from}:${b.to}:${b.kind}`));
  const edgeReads = dossierRng.shuffle(allEdges).slice(0, dossierRng.int(2, config.dossierEdgeReadMax + 1));
  const hintedSecret = secrets.length > 0 && dossierRng.float() < 0.5
    ? secrets[dossierRng.int(0, secrets.length)]! : null;
  const dossier: Dossier = {
    informants: informantIds, traitReads, edgeReads,
    secretHint: hintedSecret ? { about: hintedSecret.subject, witness: hintedSecret.witnesses[0]! } : null,
  };

  // ── 11. Scenario casting: a crown usurper + the council (keystones wear the robes) ──
  // The council IS the keystone set — GenConfig already calls keystones "scenario-cast
  // placeholders the validator must protect", and keystone-2routes is exactly the
  // objective-reachability guarantee the cast needs. NEVER reuse the `cast: CastMeta[]` local
  // from section 3 here — the scenario cast is `scenarioCast`.
  let scenarioCast: ScenarioCast | null = null;
  {
    const guardIds = new Set(guards.map((g) => g.id));
    const keystoneSet = new Set(keystones);
    const candidates = cast
      .map((m) => m.npc)
      .filter((n) => n.faction === 'crown' && !guardIds.has(n.id) && !keystoneSet.has(n.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (candidates.length > 0) {
      const usurper = candidates[scenarioRng.int(0, candidates.length)]!;
      // Investigation-route guarantee: the usurper must own true dirt. If the secret draw
      // missed them, retarget the lexicographically-last secret (deterministic, count-stable —
      // 'secrets-valid' arithmetic is untouched) onto the usurper with rewitnessed onlookers.
      if (!secrets.some((s) => s.subject === usurper.id)) {
        const donor = [...secrets].sort((a, b) => a.id.localeCompare(b.id)).at(-1);
        const sharers = cast
          .map((m) => m.npc)
          .filter((n) => n.id !== usurper.id &&
            n.schedule.some((sb) => usurper.schedule.some((ub) => sb.venue === ub.venue)))
          .sort((a, b) => a.id.localeCompare(b.id));
        if (donor && sharers.length > 0) {
          donor.subject = usurper.id;
          const wCount = 1 + scenarioRng.int(0, Math.min(3, sharers.length));
          donor.witnesses = sharers.slice(0, wCount).map((n) => n.id);
          if (donor.object !== null) {
            const others = sharers.filter((n) => !donor.witnesses.includes(n.id));
            donor.object = (others[0] ?? sharers[0]!).id;
          }
          if (donor.place !== null) {
            donor.place = usurper.schedule[0]!.venue;
          }
        }
        // If donor/sharers are missing the town stays castless — the validator rerolls it.
        if (secrets.some((s) => s.subject === usurper.id)) {
          scenarioCast = { usurper: usurper.id, council: [...keystones] };
        }
      } else {
        scenarioCast = { usurper: usurper.id, council: [...keystones] };
      }
    }
  }

  const districts: DistrictInfo[] = districtIds.map((d) => ({
    id: d,
    venueIds: venuesByDistrict.get(d)!,
    npcIds: cast.filter((m) => m.district === d).map((m) => m.npc.id),
  }));

  return { fixture: { venues, npcs: cast.map((m) => m.npc) }, districts, keystones, guards, secrets, dossier, cast: scenarioCast };
}
