# Font sources (Plan 7, Task 4)

All three families are Google Fonts, OFL-licensed, **never bought** — these are the free fonts
`docs/asset-slots.md` slot #6 explicitly calls for instead of purchasing. Downloaded 2026-07-06.

Each `woff2` below is the **latin** subset (Google's `css2` API splits by unicode-range; the
`latin` block, not `latin-ext`, is the one covering plain ASCII + Western punctuation). `OFL.txt`
per family is the unmodified license file from the `google/fonts` GitHub repo.

| File | Exact source URL |
|---|---|
| `Cinzel-Regular.woff2` | https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnfY3lDQ.woff2 |
| `Cinzel-Bold.woff2` | https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-jHgfY3lDQ.woff2 |
| `Cinzel-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/OFL.txt |
| `EBGaramond-Regular.woff2` | https://fonts.gstatic.com/s/ebgaramond/v33/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RkBI9_.woff2 |
| `EBGaramond-Bold.woff2` | https://fonts.gstatic.com/s/ebgaramond/v33/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-DPNkBI9_.woff2 |
| `EBGaramond-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/OFL.txt |
| `Inter-Regular.woff2` | https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2 |
| `Inter-Bold.woff2` | https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiA.woff2 |
| `Inter-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt |

The gstatic URLs above were the exact `src: url(...)` values returned by
`https://fonts.googleapis.com/css2?family=<Family>:wght@<weight>&display=swap` (weight 400/700) for
each family, read directly off the wire on 2026-07-06 (not fabricated/guessed). Only `font.display`
(Cinzel-Regular), `font.text` (EBGaramond-Regular), and `font.ui` (Inter-Regular) are wired into
`assets/manifest.json` today, per the brief — the Bold cuts are downloaded and committed now so
Task 5's `theme.css` `@font-face` rules don't need a second asset-fetch pass.
