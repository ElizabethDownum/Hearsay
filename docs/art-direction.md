# Hearsay — Art Direction (v1, printed matter)

**Status: STANDING LAW for Plans 7–10** (authored with Plan 7, per `asset-slots.md`).
**One line:** the game about information looks like period-printed information — engraving,
broadsheet, ledger — rendered resolution-independent, never pixel art.

## The three surfaces and their metaphors
1. **Boards (Evidence / Codex / Counter-Sketch / Web / Ledger) = broadsheets & ledgers.**
   Text-dense documents on paper. Hairline rules, small caps headers, stamped accents.
   Diff highlights read as editor's ink, not neon.
2. **Town view = an engraved city diagram.** Space is discrete; the map IS a graph and
   proud of it: district washes, venue nodes bearing engraved icons, courier-dotted edges.
   It should feel like a surveyor's plate someone annotates by hand, and it must never
   pretend to be a streets-and-roofs world.
3. **Chrome (planner, clock, toasts) = the spymaster's desk.** Restrained, functional,
   letterpress buttons; the paper does the warmth, the ink does the hierarchy.

## Palette (CSS custom properties — theme.css is generated from THIS table)
Light ("parchment"):        Dark ("chalk on slate"):
--paper:   #F3EAD8          --paper:   #23201B
--ink:     #221A12          --ink:     #E8DFCE
--sepia:   #7A5C3E          --sepia:   #A98F6E     (secondary text, rules, borders)
--verdigris:#3E6E64         --verdigris:#6FA79A    (YOUR things: avatar, informants, tags)
--vermilion:#9E2B25         --vermilion:#C65B4E    (danger: watches, authority, losses)
--gilt:    #B8912F          --gilt:    #D4B25E     (locks, wins, the coronation)
--wash:    rgba(122,92,62,.08)  --wash: rgba(169,143,110,.10)  (district hulls, row zebra)
Rules: ink on paper everywhere; verdigris = player-owned, vermilion = enemy-flavored,
gilt = resolution/ceremony. Color is NEVER the only channel (pair with shape/weight/glyph).
Contrast floor 4.5:1 for text, 3:1 for large glyphs — check both themes.

## Typography (all OFL, in assets/fonts/)
- **Display / panel titles:** Cinzel — engraved Roman capitals; use sparingly, letterspaced.
- **Document text (boards, testimony, tooltips):** EB Garamond — the period text face.
- **UI / data (tables, numbers, planner):** Inter — quiet, legible, never in prose.
Scale: 12/14/16/20/28px steps; boards default 14 EB Garamond; never below 12.

## Iconography & portraits
One engraved/silhouette family for ALL icons (venue + ui share a style — buy together).
Recolor via currentColor/CSS filter; state = tint + shape badge, never tint alone.
Portraits: square, one framing family, engraved flavor preferred; until assets land,
initials-discs (district-hued ring, EB Garamond initials) are the SHIPPED look — they
must look intentional, not like a TODO.

## The town view language
- District = pale --wash hull with a hairline border and a small-caps label.
- Venue node = circle bearing its engraved icon (fallback: glyph); diameter by access
  (public > invitational > private); guard-post nodes carry a vermilion keyline ONLY
  when the player has seen a watch there (intel-driven, never omniscient).
- Presence: small ink dots in a ring around a covered venue — one dot per occupant you
  can currently see; your avatar is a verdigris ring; informants are verdigris dots.
- Edges: none by default (adjacency is geography, not a social graph); the WEB VIEW owns
  relationship spokes. Courier/route overlays (Plan 8+) draw dotted sepia lines.
- Motion: paper doesn't animate. State changes cross-fade ≤150ms; reduced-motion = none.

## Do-nots
No drop shadows, no gradients, no glassmorphism, no neon, no pixel fonts, no photo
textures, no emoji in shipped UI (fallback glyphs are dingbat-class, not emoji faces).

## Pivot note
If Ellie's purchased packs land pixel-style, THIS DOC and the manifest change; panel and
engine code do not (asset-slots.md pivot law). The diagram-not-world commitment survives
any style pivot.
