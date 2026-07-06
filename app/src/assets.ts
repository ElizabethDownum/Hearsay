/**
 * The asset-manifest seam (docs/asset-slots.md, binding). DOM-free logic only — this module is
 * imported directly by vitest (no jsdom) as well as by the app. It resolves slot ids to either a
 * real asset (once GDM provenance is CONFIRMED in assets/LICENSES.md) or a primitive fallback.
 * Assets are never load-bearing: a missing/null slot always renders its fallback.
 *
 * Loader: a static Vite JSON import — the SAME assets/manifest.json that tests/app/assets.test.ts
 * re-reads independently via fs, so a bug in either reader can't silently pass the other's checks.
 */
import manifest from '../../assets/manifest.json';
import { fnv1a32 } from '../../src/core/rng';

type ManifestSlots = Record<string, string | string[] | null>;
const slots = (manifest as { version: number; slots: ManifestSlots }).slots;

export type Resolved =
  | { kind: 'asset'; url: string }
  | { kind: 'layers'; urls: string[] }
  | { kind: 'fallback' };

/**
 * Resolve a registered slot id to its asset, layered recipe, or primitive fallback.
 * Throws on an id that isn't a KEY in the manifest at all (even null counts as registered) — no
 * ad-hoc slots. Plans 8–10 must add a row to docs/asset-slots.md (and a null key here) before any
 * code may reference a new slot id. The throw is that rule's teeth.
 */
export function resolveSlot(id: string): Resolved {
  if (!Object.prototype.hasOwnProperty.call(slots, id)) {
    throw new Error(`resolveSlot: unregistered slot id '${id}' — add it to docs/asset-slots.md and assets/manifest.json first`);
  }
  const value = slots[id]!;
  if (value === null) return { kind: 'fallback' };
  if (Array.isArray(value)) return { kind: 'layers', urls: value };
  return { kind: 'asset', url: value };
}

/** Unicode-glyph fallback for every icon.venue.* archetype in the registry (asset-slots.md row 2). */
export const VENUE_GLYPHS: Record<string, string> = {
  tavern: '❦',
  market: '⚖',
  chapel: '✝',
  workshop: '⚒',
  well: '◉',
  'guard-post': '⛨',
  cathedral: '✚',
  docks: '⚓',
  safehouse: '⌂',
  home: '▪',
  salon: '❧',
  palazzo: '♛',
  press: '✒',
};

/** Number of hue bands the initials-avatar fallback rotates through — see note below. */
const DISTRICT_HUE_BANDS = 8;

/** First letters of up to two id segments (split on `-`/`_`), uppercased. Pure string op — no name lookup. */
function initialsFor(npcId: string): string {
  const parts = npcId.split(/[-_\s]+/).filter((p) => p.length > 0);
  if (parts.length >= 2) return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  const only = parts[0] ?? npcId;
  return only.slice(0, 2).toUpperCase() || '?';
}

/**
 * Deterministic face: pick from the portrait.npc.pool via fnv1a32(`${worldSeed}:${npcId}`), or an
 * initials-avatar fallback when the pool is empty (true today — no portrait pack is CONFIRMED).
 *
 * CONSCIOUS DEVIATION (noted for Ellie): the fallback hue is meant to be faction-tinted per
 * asset-slots.md's "faction-tinted" fallback contract, but faction/district assignment lives in
 * WorldState and this module is DOM-free, seam-only, composition-root-adjacent code that must NOT
 * import sim/world (headless-sim law) — portraitFor only ever receives (npcId, worldSeed). The
 * honest substitute is a "district" proxy hashed from the id itself (fnv1a32(`${worldSeed}:district:${npcId}`)
 * mod DISTRICT_HUE_BANDS), NOT the real district/faction. It is still deterministic and stable per
 * (npc, seed), but it is a stand-in, not the real faction tint — revisit once portraits are wired
 * and a real per-NPC district/faction can be threaded through as a prop instead.
 */
export function portraitFor(
  npcId: string,
  worldSeed: string,
): Resolved | { kind: 'initials'; initials: string; districtHue: number } {
  const poolSlot = slots['portrait.npc.pool'];
  const pool = Array.isArray(poolSlot) ? poolSlot : typeof poolSlot === 'string' ? [poolSlot] : [];
  if (pool.length > 0) {
    const idx = fnv1a32(`${worldSeed}:${npcId}`) % pool.length;
    return { kind: 'asset', url: pool[idx]! };
  }
  const districtIndex = fnv1a32(`${worldSeed}:district:${npcId}`) % DISTRICT_HUE_BANDS;
  const districtHue = Math.round((districtIndex * 360) / DISTRICT_HUE_BANDS);
  return { kind: 'initials', initials: initialsFor(npcId), districtHue };
}
