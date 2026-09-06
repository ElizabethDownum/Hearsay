import { dayOf, TICKS_PER_DAY, type Tick } from '../core/time';
import { blankIntel } from './fieldwork';
import { canAfford, debitCoin } from './network/roster';
import { observationsAtVenue, type ResidueEvent } from './perception';
import type { TickEvents } from './perception';
import type { EntityId, VenueId } from './rumors/claim';
import type { Rules } from './rules';
import type { WorldState } from './types';

export interface ScryAction {
  tick: Tick; kind: 'scry'; venue: VenueId; day: number; from: number; to: number;
}
export interface ScryWindow {
  id: string; venue: VenueId; day: number; from: number; to: number;
}
export interface ArcaneTrace extends ResidueEvent {
  seenBy: { observer: EntityId; tick: Tick }[];
}
export interface MagicState {
  nextId: number;
  scries: ScryWindow[];
  traces: ArcaneTrace[];
}

export function applyScry(world: WorldState, action: ScryAction, rules: Rules): void {
  if (!Number.isInteger(action.tick) || action.tick < 0 || action.tick !== world.tick) {
    throw new Error('scry: action tick must equal the current tick');
  }
  if (world.playerId === null || !world.npcs[world.playerId]) throw new Error('scry: no avatar');
  if (typeof action.venue !== 'string' || !Object.hasOwn(world.venues, action.venue)) {
    throw new Error('scry: unknown venue');
  }
  if (!Number.isInteger(action.day) || action.day !== dayOf(world.tick) + 1) {
    throw new Error('scry: choose the next day');
  }
  if (!Number.isInteger(action.from) || !Number.isInteger(action.to)
    || action.from < 0 || action.to > TICKS_PER_DAY || action.from >= action.to
    || action.from % 15 !== 0 || action.to % 15 !== 0 || action.to - action.from > 60) {
    throw new Error('scry: choose a 15-aligned window of at most 60 minutes');
  }
  const cost = rules.economy.scrying;
  if (!Number.isInteger(cost) || cost < 0) throw new Error('scry: invalid price');
  if (!canAfford(world, cost)) throw new Error('scry: insufficient coin');
  const id = `s${world.magic?.nextId ?? 0}`;
  if (world.magic?.scries.some((row) => row.id === id)) throw new Error('scry: duplicate operation id');
  debitCoin(world, cost);
  const state = world.magic ?? (world.magic = { nextId: 0, scries: [], traces: [] });
  state.nextId += 1;
  state.scries.push({ id, venue: action.venue, day: action.day, from: action.from, to: action.to });
  world.chronicle.push({ kind: 'scry', tick: world.tick, operation: id,
    venue: action.venue, day: action.day, from: action.from, to: action.to });
}

/** Prior setup: the previous day's purchase begins, independent of whether anyone is present. */
export function beginScryWindows(world: WorldState, tick: Tick): void {
  const state = world.magic;
  if (state === undefined) return;
  for (const window of state.scries) {
    if (window.day * TICKS_PER_DAY + window.from !== tick) continue;
    if (state.traces.some((trace) => trace.id === window.id)) continue;
    state.traces.push({ id: window.id, venue: window.venue, createdAt: tick, seenBy: [] });
    world.chronicle.push({ kind: 'residue', act: 'created', tick,
      residueId: window.id, venue: window.venue, observer: null });
  }
}

/** Only physical fields are projected; delivery/seen latches never cross into live events. */
export function residueEvents(world: WorldState): ResidueEvent[] {
  return (world.magic?.traces ?? []).map(({ id, venue, createdAt }) => ({ id, venue, createdAt }));
}

export function captureScryIntel(world: WorldState, events: TickEvents): void {
  if (world.magic === undefined || world.playerId === null) return;
  for (const window of world.magic.scries) {
    const from = window.day * TICKS_PER_DAY + window.from;
    const to = window.day * TICKS_PER_DAY + window.to;
    if (events.tick < from || events.tick >= to) continue;
    const provenance = { kind: 'magic' as const, spell: 'scrying' as const, operation: window.id };
    for (const observation of observationsAtVenue({ kind: 'venue-sensor', venue: window.venue, from, to }, events)) {
      const base = { ...blankIntel(), tick: observation.tick, venue: observation.venue,
        via: 'scrying', provenance, overheard: true };
      if (observation.kind === 'presence') {
        world.intel.log.push({ ...base, kind: 'scene-presence', actor: observation.actor });
      } else if (observation.kind === 'asking') {
        world.intel.log.push({ ...base, kind: 'asking', speaker: observation.speaker,
          addressedTo: observation.addressedTo, about: observation.about, authority: observation.authority,
          family: 'family' in observation.about ? observation.about.family : null });
      } else {
        const { subject, predicate, object, count, severity, place, attribution } = observation.claim;
        world.intel.log.push({ ...base, kind: 'utterance', speaker: observation.speaker,
          addressedTo: observation.addressedTo, mode: observation.mode,
          claimId: observation.claim.id, family: observation.claim.family,
          reported: { subject, predicate, object, count, severity, place, attribution } });
      }
    }
  }
}
