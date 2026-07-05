# Hearsay — Asset License Gate

**Date:** 2026-07-05
**Purpose:** the license-gate record required by `docs/asset-slots.md` rule 5 — *"unlisted-in-
LICENSES.md ⇒ unwired, no exceptions (Steam is the bar)."* No asset from `assets/` may be
referenced in `assets/manifest.json` until its row below is CONFIRMED. See `assets/INVENTORY.md`
for what was copied and where, and `docs/asset-shopping-brief.md` for the original purchase brief.

## Store license (blanket, applies to every pack)

All 68 source packs were downloaded from **GameDev Market (GDM)** under Ellie's single account.
GDM uses ONE license across the whole storefront (their **"Pro Licence"**):

- Commercial use in shipped games: **permitted**
- Number of projects: **unlimited**
- Royalties: **none**
- Raw-asset redistribution: **prohibited** — assets may ship *inside* a compiled/built game, but the
  source PNG/SVG/PSD files themselves may not be redistributed standalone (e.g. re-uploaded,
  shared as a bare asset pack, committed to a public repo where they could be extracted and reused
  independently of the game). **This is why asset binaries are gitignored** in this repo — see the
  `.gitignore` change below. Docs (`INVENTORY.md`, `LICENSES.md`, this file) stay tracked; the
  binaries themselves do not go into git history.

Verified via secondary sources 2026-07-05 (GDM's licence page blocks automated fetchers). **Ellie
re-confirms https://www.gamedevmarket.net/about/licences in-browser before shipping** — this
verification is a re-confirmation gate, not a one-time check-and-forget.

## IMPORTANT FINDING

**None of the 68 downloaded packs contained a license file or purchase receipt inside the zip.**
All three inventory passes (inv-A, inv-B, inv-C) checked exhaustively — at most an author
`Help.txt`/`Readme.txt` thank-you note or contact email was found, never a license grant or proof
of purchase. Per-pack provenance therefore rests entirely on **Ellie's GDM purchase history**
(order confirmations / account dashboard), not on anything inside the downloaded files themselves.

## Per-kept-pack provenance table

| Dest dir | Source pack folder (Downloads\UI_Components\) | Artist | Provenance status |
|---|---|---|---|
| `assets/wenrexa-uiarmy/` | `userinterfacemedievalbuttonscheckboxpanelsicons` | Wenrexa | TBD — confirm in GDM purchase records |
| `assets/acasas-wood/` | `wooduielements` | Acasas | TBD — confirm in GDM purchase records |
| `assets/acasas-medieval/` | `medievalgameui` | Acasas | TBD — confirm in GDM purchase records |
| `assets/wenrexa-darktemplar-frames/` | `uimmorpgdarktemplar` | Wenrexa | TBD — confirm in GDM purchase records |
| `assets/silhouette-icons/` | `iconsandrpgandmilitaryandkitplus4182` | Wenrexa | TBD — confirm in GDM purchase records |

All five rows are currently **TBD**. None of the five packs may be wired into
`assets/manifest.json` until each row above reads CONFIRMED (with an order/receipt reference Ellie
can point to), per the standing gate rule below.

## Gate rule (absolute, no exceptions)

- No asset is wired into the manifest before its row in this file is confirmed.
- "Confirmed" means Ellie has checked the row against her actual GDM purchase history (order id,
  receipt, or account library entry) — not merely that the pack exists in `Downloads/`.
- Steam release is the bar: every shipped asset must have a confirmed row here before the game
  ships, not just before it's wired.
- This gate is independent of style/quality verdicts in `assets/INVENTORY.md` — a pack can be a
  STRONG style match and still be blocked here until provenance is confirmed.
