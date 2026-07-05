# Hearsay — Asset Slot Architecture

**Status:** ARCHITECTURE (authored 2026-07-05, ahead of Plan 7). This document is the canonical
registry of every visual asset slot the game renders, the contract each slot obeys, and the
seam future plans/AI sessions use to wire purchased assets in. Plan 7's authoring MUST consume
this doc (it defines Plan 7's asset-manifest task); Plans 8–10 add slots here, never ad-hoc.

## Style commitment (and the pivot path)

**2D, resolution-independent, "printed matter" — NOT pixel art.** Rationale:

1. **The boards are documents.** Evidence Board / Codex / Counter-Sketch are text-dense surfaces —
   diffs, tables, testimony. Crisp type on parchment coheres; pixel fonts and low-res portraits
   fight exactly the surfaces the player stares at most.
2. **The town view is a diagram, not a world.** Space is discrete (venue graph + circles; "the sim
   never knows pixels"), so the map renders as a living node-graph. Pixel art buys nothing on a
   diagram; clean vector nodes + tokens do.
3. **Theme synergy:** a Renaissance city-state with a printing quarter — woodcut/engraving-flavored
   illustration makes the whole game read as period print. The game about information looks like
   printed information.
4. **Practical:** resolution independence (Steam Deck → 4K) and CSS/SVG tinting (faction colors,
   suspect states) come free with flat/vector-leaning art; pixel art needs integer scaling discipline
   everywhere.

**Pivot safety:** every slot below is resolved through a data manifest. Style lives in the assets,
not the code. If Ellie's purchased packs turn out pixel-style (they're plentiful and cheap), the ONLY
things that change are the manifest, the art-direction doc, and a font/scaling choice — zero engine
or panel code. Buy what you love; the architecture doesn't care.

## The manifest seam (Plan 7 implements this — the "placeholder" contract)

- `assets/manifest.json` — pure data (content split, same law as Rules/GenContent):
  `slotId → file path | layered recipe | null`. Checked into the repo alongside the packs.
- `assets/LICENSES.md` — per-pack license inventory. **No asset is wired before its pack passes the
  commercial-redistribution gate** (see `asset-shopping-brief.md`).
- `app/src/assets.ts` (composition root only) resolves slots → URLs/recipes; **panels receive
  resolved props** (the panels lint fence stays intact).
- **Every slot has a primitive fallback** (CSS shape / initials-avatar / unicode glyph / flat color).
  A missing or null slot NEVER blocks a build or a plan — assets are additive, never a dependency.
  This is the standing law from Ellie: no asset hunting; placeholders always ship.
- **Deterministic portrait assignment:** `portraitFor(npcId, worldSeed)` picks from the pool or
  composes a layered recipe via the existing seeded-stream discipline (`Rng(seed, 'portraits')`) —
  same NPC, same face, every session, every machine.

## Slot registry v1 (= Ellie's acquisition focus list, in priority order)

| # | Slot family | Count needed | Contract | Fallback primitive | Surfaces | Wired in |
|---|-------------|--------------|----------|--------------------|----------|----------|
| 1 | `portrait.npc.*` | Layered system (≥8 bases × hair/clothing/accessory layers) **or** ≥100 statics, commoner-heavy | square PNG, transparent, ≥256px, one framing family | initials-avatar disc, faction-tinted | Board cluster detail, Codex rows, Counter-Sketch, town tooltips, debrief | Plan 7 |
| 2 | `icon.venue.*` | 13: tavern, market, chapel, workshop, well, guard-post, cathedral, docks, salon, palazzo, press, safehouse, home | SVG or mono PNG ≥64px, recolorable, ONE style set | unicode glyph + label | Town-view nodes, board venue refs, day-planner | Plan 7 |
| 3 | `icon.ui.*` | ~20: rumor, inquiry, watch-eye, secret-lock, informant, courier, dead-drop, coin, letter, forgery-quill, scrying, séance, doomclock, arrest, duel, faction ×3, assist, alert | same set/style as #2 (buy together) | unicode glyph | All panels, toasts, timeline | Plan 7 (subset), 8–9 (rest) |
| 4 | `texture.paper.*` | 4–6: full-page parchment ×2, tileable grain, desk/leather | ≥1024px, subtle contrast, readable overlay text in light+dark | flat CSS color + border | Board backgrounds, debrief, dossier | Plan 7 |
| 5 | `frame.portrait.*` | 2–3 nine-slice border variants (neutral / suspect / your-informant) | PNG nine-slice or CSS border-image | CSS border, state-tinted | Everywhere portraits render | Plan 7 |
| 6 | `font.display` / `font.ui` | 2 (DON'T buy — Google Fonts OFL: Cinzel / IM Fell / EB Garamond + Inter / Source Sans 3) | woff2, OFL license file in assets/ | system serif/sans stack | Everything | Plan 7 |
| 7 | `map.token.*` | optional: NPC/watch/player tokens for the graph view | tiny SVG/PNG, recolorable | colored circles/rings (these look GOOD on a diagram — genuinely optional) | Town view | Plan 7+ |
| 8 | `sfx.ui.*` | v1.1 — separate brief later | — | silence | — | post-v1 |

**Purchase guidance lives in `asset-shopping-brief.md`** (search terms, red flags, GDM license verdict).
Buying order if budget-constrained: **1 → 2+3 (one pack) → 4**; 5–7 are polish.

## Rules for future plans & AI sessions

1. **Plan 7 authoring** consumes this doc: it must include (a) the `assets.ts` loader + manifest task
   with per-slot fallbacks, (b) the inventory/license-gate task (skipped gracefully if `assets/` is
   empty), (c) the art-direction doc written FROM whatever packs exist at authoring time.
2. **New visual features in Plans 8–10 register slots HERE first** (add a row, then reference the
   slot id in the plan task) — no plan may hardcode an asset path.
3. **The P5 dev shell (Tasks 7–8) stays text-only** — it predates the manifest on purpose; do not
   retrofit it. First asset-rendering surface is Plan 7's real UI.
4. **Never block on assets.** A slot with no asset renders its fallback and the game ships that way
   if need be. Assets upgrade the look; they are never load-bearing.
5. **License gate is absolute:** unlisted-in-LICENSES.md ⇒ unwired, no exceptions (Steam is the bar).
