# Hearsay — Asset Shopping Brief (GameDev Market)

**Purpose:** exact specs for purchasing licensed art, so every purchase maps to a game surface.
**Store license:** GameDev Market uses ONE license (their "Pro Licence") across all assets — commercial
use in shipped games permitted, unlimited projects, no royalties; raw-asset redistribution prohibited
(fine — assets ship inside the build). **Before buying: skim https://www.gamedevmarket.net/about/licences
in your browser once to confirm nothing changed** (the site blocks automated fetchers, so this was
verified via secondary sources on 2026-07-05).

**Style anchor (all categories):** low-fantasy Renaissance city-state — guilds, cathedral, docks,
printing quarter. Grounded and human. Search words that work: *renaissance, medieval town, merchant,
villager, tavern, nobility*. Avoid: anime styling, sci-fi, high-fantasy creatures (no elves/orcs),
modern items.

**Delivery:** drop each pack into `hearsay/assets/<pack-name>/` UNZIPPED, with the pack's license/readme
kept inside its folder. Tell Claude the folder exists at next startup — an inventory pass builds
`assets/LICENSES.md` + the asset manifest, and Plan 7's art-direction doc gets written FROM the packs'
palette.

---

## 1. NPC portraits — the priority buy

**Why:** towns have 60–90 procgen NPCs; faces transform the Evidence Board and Codex.

- **Best option: a COMPOSABLE/layered portrait system** (base face + hair + clothing + accessories as
  separate layers). Even ~8 bases × a few layers beats 100 statics — we assign layers deterministically
  from the world seed, so every town gets unique-looking residents for free.
- **Acceptable: a large static set** — 100+ distinct portraits minimum, or several same-artist packs
  that total that (STYLE CONSISTENCY across packs matters more than count; buy from one artist's series).
- **Must cover commoners, not just heroes:** dockworkers, laundresses, smiths, grocers, bartenders,
  priests, guards, plus some nobles. Mixed ages and genders. No armor-clad adventurers as the majority.
- **Format:** PNG with transparency preferred (square crop, bust/shoulders framing), ≥256×256.
  Consistent framing across the set (same zoom/angle family).
- **Red flags:** "personal use" anywhere in the pack description; pixel-art portraits below 64px
  (won't read on boards); AI-generated packs with no license clarity.

## 2. Icon set — one consistent set, ~40–60 glyphs

**Why:** venue archetypes + UI verbs carry the whole interface.

- **Venues:** tavern, market, chapel, workshop, well, guard post, cathedral, docks — plus future:
  salon, palazzo, printing press, safehouse, home.
- **UI glyphs:** speech/rumor, question/inquiry, eye/watch, lock/secret, informant/hood, courier,
  dead drop, coin, letter, quill/forgery, crystal/scrying, candle/séance, hourglass/doom-clock,
  manacles/arrest, dagger/duel, faction crests (generic).
- **Format:** SVG ideal; else white-or-black-on-transparent PNG ≥64px. **Monochrome/recolorable
  strongly preferred** (we tint per faction/state in CSS). Flat or line style — pick ONE set so
  everything matches; a single "medieval/RPG icon pack" with 100+ glyphs usually covers this.

## 3. Paper & parchment textures — cheap atmosphere

- 5–10 textures: a couple of full-page parchment backgrounds + tileable paper grain + one darker
  leather/desk texture. Subtle contrast (text must stay readable on top, light AND dark UI).
- **Format:** ≥1024px JPG/PNG. Seamless/tileable versions preferred.

## 4. Fonts — DON'T buy these

Google Fonts (SIL Open Font License) is free for commercial games and better-tested:
display candidates *Cinzel*, *IM Fell English*, *EB Garamond*; UI candidates *Inter*, *Source Sans 3*.
Plan 7's art-direction doc pairs one of each against the purchased packs' palette.

## Skip entirely (for v1)

- **Tilesets / scene art / character sprite sheets** — the town view is a living graph, not a painted
  map; side-scroller sprites have no surface to live on.
- **Animated VFX packs** — nothing animates in v1 beyond CSS.
- **Audio/SFX** — later decision, separate brief (a subtle UI-sound set is the only v1 candidate).

## Budget shape

Portrait system + one big icon pack + one texture pack is typically a handful of packs total on GDM —
this is a small, targeted buy, not a library. If choosing where to spend: portraits > icons > textures.
