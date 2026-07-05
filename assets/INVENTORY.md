# Hearsay — Asset Inventory

**Date:** 2026-07-05
**What this is:** the index of every art asset physically copied into `assets/` from the 68
GameDev Market packs downloaded to `C:\Users\eliza\Downloads\UI_Components\`, mapped to the slot
registry in `docs/asset-slots.md`. Nothing here is wired into `assets/manifest.json` yet — see
`assets/LICENSES.md` for the license gate that must clear first (Steam release is the bar).

Source verdicts: `.superpowers/sdd/asset-inv-A.md`, `asset-inv-B.md`, `asset-inv-C.md` (three
independent inventory passes over all 68 packs). This file only records what was actually copied
to disk; the inv-*.md reports carry the full reasoning for every pack, including the 63 rejected
ones.

Total copied: **10.36 MB** across 5 kept packs (well under the 200MB budget) — 226 files.

---

## 1. `userinterfacemedievalbuttonscheckboxpanelsicons` (Wenrexa "UI Army")

- **Dest:** `assets/wenrexa-uiarmy/`
- **Verdict:** STRONG (texture.paper, one asset only) + PARTIAL (icon.ui / frame.portrait)
- **Kept:** `PreviewMap.png` — an aged, cross-hatched engraved world map on parchment; the single
  most on-brief asset found across all 68 packs (per inv-A). Plus 5 panel/chrome pieces the inv-A
  report specifically examined as PARTIAL frame/icon candidates: `Panel01.png`, `TitlePanel.png`,
  `Box01.png`, `MessageBox01.png`, `IconStats01.png`.
- **Rejected (not copied):** the remaining ~62 PNGs in the pack (buttons, mini-buttons, progress
  bars, stat icons, decor) — dark near-black fantasy-army HUD with gold metallic bevels, reads as
  generic dark-fantasy game chrome rather than period print. Not worth carrying forward.

| Slot id | File(s) under `assets/` | Notes |
|---|---|---|
| `texture.paper.*` | `wenrexa-uiarmy/PreviewMap.png` | STRONG. Full antique engraved map, hand-lettered place names, cross-hatched terrain. Style-anchor quality. Could also underlay `map.token.*` town graph with a light crop (inv-A). |
| `icon.ui.*` (PARTIAL) | `wenrexa-uiarmy/Panel01.png`, `TitlePanel.png`, `Box01.png`, `MessageBox01.png`, `IconStats01.png` | Gold-bevel panel chrome on black-void fill. Needs a full recolor (strip the black fill, retint gold→ink/sepia) before it reads as print rather than dark-fantasy HUD. Treat as reference/fallback, not final art. |
| `frame.portrait.*` (PARTIAL) | same panel files above | Gold corner-bracket shapes are nine-slice-able once recolored. |

---

## 2. `wooduielements` (Acasas)

- **Dest:** `assets/acasas-wood/`
- **Verdict:** PARTIAL (frame.portrait, texture.paper-as-desk/leather)
- **Kept:** all 12 usable PNGs in the pack (`arrow 1/2.png`, `panel 1`–`8.png`, `Slider 1/2.png`).
  Pack is tiny (13 files total) so full provenance was preserved rather than hand-picking.
- **Rejected (not copied):** `Wood Ui Elements Cover.png` — marketing cover sheet compositing all
  elements together (preview-of-previews, no unique content), and the `__MACOSX` resource-fork
  junk tree.

| Slot id | File(s) under `assets/` | Notes |
|---|---|---|
| `frame.portrait.*` | `acasas-wood/panel 2.png`, `panel 7.png` | Rustic wood-plank rectangular panels, flagged by inv-A as the best nine-slice frame candidates — pair with a parchment inset for the portrait window. |
| `texture.paper.*` (desk/leather variant) | `acasas-wood/panel 1.png`, `panel 5.png` | Painterly wood-grain, neutral (not cartoon-colored) — usable as the "desk" texture.paper variant the registry calls for (slot #4 wants 4-6 textures incl. one desk/leather). |
| (reference only) | `acasas-wood/arrow 1.png`, `arrow 2.png`, `Slider 1.png`, `Slider 2.png`, remaining `panel *.png` | Not currently slot-mapped; kept for provenance/possible UI-chrome reuse. |

---

## 3. `medievalgameui` (Acasas) — PROVISIONAL

- **Dest:** `assets/acasas-medieval/`
- **Verdict:** WEAK PARTIAL — cartoonish pack overall (thick black outlines, cartoon mascot face),
  only two pieces are usable. **Mark PROVISIONAL**: likely to be replaced once a real frame/paper
  purchase happens.
- **Kept:** `panel 1.png` (cracked-stone square frame, the single least-cartoon asset in the pack)
  and `Scroll Panel.png` (parchment-colored scroll, bright/cartoon but paper-shaped).
- **Rejected (not copied):** all other 54 PNGs — flat cartoon-vector buttons, signs, banners,
  potions, a cartoon mascot "User Icon," fantasy stat icons (sword/potion/compass). Reads as
  children's-book cartoon, not engraving.

| Slot id | File(s) under `assets/` | Notes |
|---|---|---|
| `frame.portrait.*` (PROVISIONAL) | `acasas-medieval/panel 1.png` | Cracked-stone frame, nine-slice-able. Still cartoon-adjacent — treat as a placeholder-grade frame, not final art. |
| `texture.paper.*` (PROVISIONAL) | `acasas-medieval/Scroll Panel.png` | Parchment-colored but bright/saturated cartoon rendering — panel-scale only, not full-page. |

---

## 4. `uimmorpgdarktemplar` (Wenrexa) — frames only

- **Dest:** `assets/wenrexa-darktemplar-frames/`
- **Verdict:** PARTIAL — genuine surprise per inv-C: hand-painted ink-brush / torn-edge borders,
  much closer to "printed/inked" than any candy-glossy kit in the batch.
- **Kept:** exactly 2 files, both named and validated in the inv-C report:
  `CharacterPlayer/Overlay Border.png` (circular ink-brush avatar frame) and
  `Backpack inventory big/Full Panel.png` (dark brushed-panel background).
- **Explicitly rejected (not copied):** all avatar/character art in the pack
  (`CharacterPlayer/Avatar.png`, `AvatarCircle.png`, `Preview.png`, and the entire
  `CharacterEnemy/` tree) — anime-adjacent fantasy portraiture, wrong for `portrait.npc.*` per the
  brief. Also skipped the rest of the 40+ MB pack (buttons, sliders, spell-cast bars, chat UI,
  map markers) — standard dark-fantasy MMO HUD, not style-fit.

| Slot id | File(s) under `assets/` | Notes |
|---|---|---|
| `frame.portrait.*` | `wenrexa-darktemplar-frames/CharacterPlayer/Overlay Border.png` | Circular ink-brush/torn-edge border, separable from the avatar art it originally framed. Nine-slice/mask candidate. |
| `texture.paper.*` (dark/dossier variant) | `wenrexa-darktemplar-frames/Backpack inventory big/Full Panel.png` | Dark brushed-panel background — candidate for a "suspect dossier"-style darker surface variant, not a light parchment page. |

---

## 5. `iconsandrpgandmilitaryandkitplus4182` (Wenrexa "Icons & RPG & Military KIT")

- **Dest:** `assets/silhouette-icons/`
- **Verdict:** PARTIAL — interim stopgap for `icon.ui.*`, explicitly NOT the final style (see gap
  #3 below).
- **Kept:** 102 unique flat monochrome silhouette glyphs — ONE PNG size variant per glyph (the
  largest available, 256×256px, White color/recolorable variant — verified byte-identical name set
  against 128×128px) in `silhouette-icons/png/`, plus all 102 SVG masters in `silhouette-icons/svg/`
  (SVG masters exist for every glyph and are the ideal recolorable format, so both were kept —
  204 files total, 0.86MB).
- **Rejected (not copied):** the other ~4080 files in the pack — these are the SAME 102 glyphs
  re-exported at 16/32/64/128px × 8 preset colors (Blue/Gray/Green/Orange/Pink/Red/Violet/White).
  Pure size/color duplicates of what's already kept; White is the one recolorable-via-CSS-tint
  base, so only it was copied. (Per inv-B: the pack's headline "+4182" count is really 102 unique
  icons — treat headline counts on this storefront as suspect.)

| Slot id | File(s) under `assets/` | Notes |
|---|---|---|
| `icon.ui.*` (interim) | `silhouette-icons/png/Wenrexa Coin*.png` → `Wenrexa Money Gold 1.png`/`2.png`, `Wenrexa Inkwell with pen.png` (quill), `Wenrexa Torch.png`, `Wenrexa Dagger.png`, `Wenrexa Paper.png` (letter-adjacent), `Wenrexa Notepad.png` | Direct-name hits for rumor-mill glyphs: coin, quill/forgery (inkwell w/ pen), dagger/duel, torch. Flat solid-silhouette style, genuinely recolorable (also has SVG masters) — but the flat-icon look itself is NOT woodcut/engraving, so this is a format win / style compromise, not a final match. |
| `icon.ui.*` (no direct hit) | remaining ~95 glyphs in `silhouette-icons/png/` and `/svg/` | Military/RPG-themed (weapons, armor, ammo, gear); no venue icons at all (`icon.venue.*` is unmet by this pack — see gap #2). Kept for completeness/possible reskins, not because each maps to a named slot glyph. |

---

## Rejected packs (63 of 68)

Full reasoning lives in the three inv-*.md reports; summarized rejection reasons:

- **Glossy 3D-bevel "candy" mobile-casual chrome** — the single most common reason (gem-studded
  gold frames, ribbon banners, treasure chests, casino/slots UI). Examples: `medievalgameguipack`,
  `woodenguiset`, `pirategameui`, `steampunkguiset`, `universalgameguipack`,
  `graphicaluserinterfacesetforgames`, `goldenuserinterface`, `5gameuikits`(+`_2`), and most of the
  icon megapacks in inv-B (`guiiconspack1`/`2`/`3`, `resourceandtoolicons`,
  `weaponarmorandequipmenticons`, `inventorypotionfoodandconsumableicons`, `90magicpotionicons`).
- **Flat modern-vector "app icon" style** — reads as contemporary mobile UI regardless of recolor;
  wrong silhouette proportions for a period-print game. Examples: `vectorgameui`,
  `gameuserinterface_vector`, `gameui`.
- **Sci-fi / tech / futuristic** — directly excluded genre. Examples: `steampunkindustriallevelmap`,
  `150sci-fiflaticons`, `assets_uisci-fiminimalismkitmmorpg`, `spaceassets`, `spacegameguiset`,
  `techbuttoncollection`, `sci-fistyleguinesia01`.
- **Anime / cartoon styling** — wrong illustration tradition entirely. Examples:
  `assets_uianimerpgnovellakit`, `assetsuianimenovellacasualinterface`, `cartoongameguipack`,
  `cartoonuserinterface`.
- **Hero-fantasy-only portraits, zero commoners** — `characteravatariconsfantasy` (30 unique
  fantasy-adventurer faces: knights, rogues, casters, pirates; zero merchants, bakers, clerks,
  priests, laborers, or elderly townsfolk). **Explicitly reviewed and rejected for
  `portrait.npc.*`** — technical polish (consistent framing, painterly quality) does not override
  wrong content and wrong style (modern painterly fantasy-RPG vs. woodcut/engraving Renaissance
  commoners) per the brief's explicit rule.
- **Slots/casual/match-3/tap-games** — thematically unrelated genres bundled into the same
  storefront category. Examples: `classicsevensslotsgamekit`, `enchantedvalleyslotsgamekit`,
  `lobbyandguiforslotsgames`, `zombieslotsgame`, `match3set`, `100itemscasualandlogicgames`,
  `casualwordgame2_assets`, `tapgameassets_lumberjack`.
- **Pixel art below spec** — explicitly excluded by the 2D/resolution-independent style commitment.
  Example: `pixelartinventoryicons_16x16`.
- **Tilesets/maps with no genuine parchment styling** — `forestmapui`, `gamelevelmap`,
  `gamelevelmapset2`, `gamelevelmapworldiii`, `gamelevelmapforwatergames` — all candy-cartoon,
  flat-vector-cartoon, or naturalistic-painted; none read as period print/engraving.
- **3D / low-poly** — breaks the 2D commitment outright. Example: `guiforlowpolygame`.

63 packs total reviewed and rejected; see the three inv-*.md reports for the complete per-pack
breakdown (7 in inv-A, 11 in inv-B, 17 image-checked + ~28 name/glance-triaged NO in inv-C).

---

## GAPS — Ellie's shopping list

Slots the 68 downloaded packs do NOT cover, in acquisition priority order per `docs/asset-slots.md`:

1. **`portrait.npc.*`** — HIGHEST PRIORITY. Need a composable/layered commoner-heavy portrait
   system (≥8 bases × hair/clothing/accessory layers) **or** 100+ static portraits from one
   consistent artist/series. **Nothing in the 68 packs qualifies** — the only portrait pack found
   (`characteravatariconsfantasy`) is 30 unique fantasy-adventurer faces with zero commoners, wrong
   style (painterly fantasy-RPG, not print/engraving), and short of both the layered-system bar and
   the 100-statics bar. This blocks the Evidence Board / Codex / Counter-Sketch face rendering the
   most — buy first.
2. **`icon.venue.*`** — 13 venue icons needed (tavern, market, chapel, workshop, well, guard-post,
   cathedral, docks, salon, palazzo, printing press, safehouse, home). **Zero venue/building icons
   exist in any of the 68 packs** (confirmed across all 11 icon-focused packs in inv-B plus the
   borderline sweep in inv-C). Second priority — town-view nodes render with only unicode-glyph
   fallbacks until this is bought.
3. **`icon.ui.*`** — ~20 glyphs needed (rumor, inquiry, watch-eye, secret-lock, informant, courier,
   dead-drop, coin, letter, forgery-quill, scrying, séance, doomclock, arrest, duel, faction ×3,
   assist, alert), in a CONSISTENT engraved/line-style set matching the venue icons (buy together
   per the registry). `silhouette-icons/` (kept above) is an INTERIM STOPGAP ONLY — it's a
   flat-solid-silhouette style, not woodcut/engraving/line-art, so it is style-mismatched with the
   printed-matter direction even though it's genuinely recolorable and covers a few glyphs
   (coin, quill, dagger, torch) by name.
4. **`texture.paper.*` full-page parchment ≥1024px** — the registry wants 4-6 textures including
   2 full-page parchment backgrounds. What's on hand (`wenrexa-uiarmy/PreviewMap.png`,
   `acasas-wood` panels, `acasas-medieval/Scroll Panel.png`) is all **panel-scale**, not full-page
   background-scale. Lowest priority of the four gaps since panel-scale paper already covers some
   surfaces adequately as a stopgap.

**Note:** fonts are NOT on this shopping list — Google Fonts OFL (Cinzel / IM Fell English /
EB Garamond + Inter / Source Sans 3) covers `font.display` / `font.ui` for free; do not buy fonts.
