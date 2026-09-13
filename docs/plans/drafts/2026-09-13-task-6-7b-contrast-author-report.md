# Task 6 / 7B contrast correction author report

13 September 2026. The bounded contrast correction is ready for independent review.
It changes one terminal CSS rule and appends five style assertions to the existing
UI law test. All 654 cases pass. This is an author-only complete-code proposal in
the detached 252a4813e1efffd15a5f08936bd3d64e2343af67 host; no production installation,
commit, index, package, service, browser or shared-AI change is claimed.

## Finding and correction

The independent 649-case review returned Needs-fixes with zero Critical, one
Important and zero Minor findings. It approved all other reviewed requirements.
Its Important finding showed that dark inline changed words had 1.54:1 contrast,
and light exact changed values had 2.46:1. Both carry normal-sized causal text;
the exact value also represents a deleted-only change when no later prose word
is added. Bold weight and the Changed label did not repair that readability issue.

The new rule is:

```css
.debrief-change, .debrief-desk .diff-cell { background: var(--ink); color: var(--paper); font-weight: 600; }
```

Both presentations now use each existing theme's ink/paper pair in reverse. The
exact-value override applies only inside the terminal desk. The shared live-panel
diff-cell primitive, palette values and every component body remain byte-identical.
No prose, causal comparison, Changed label, exact field value or deleted-only
rendering was altered. No model or gameplay behavior changed.

The four permanent contrast cases read actual theme.css, resolve its actual
selectors and custom properties, calculate sRGB relative luminance and require
normal-text contrast of at least 4.5:1. They check explicit and automatic palette
parity. A fifth case protects the unchanged shared live-panel primitive. The
bounded resolver supports the existing opaque six-digit colors and fails on
unsupported color syntax; it is not a general browser cascade/layout engine.
It does not hardcode resulting color ratios or merely assert class presence.

Calculated proof reads the complete old/new maps independently:

| Theme and presentation | Predecessor | Corrected |
| --- | --- | --- |
| Light inline words | 5.8222:1 | 14.3500:1 |
| Light exact values | 2.4647:1 | 14.3500:1 |
| Dark inline words | 1.5371:1 | 12.2711:1 |
| Dark exact values | 7.9830:1 | 12.2711:1 |

contrast-proof.json retains actual foreground/background colors and unrounded
ratios. The light corrected pair is paper #f3ead8 on ink #221a12; dark is paper
#23201b on ink #e8dfce. Both presentations use those same theme-specific pairs.

## Exact scope and inherited requirements

The full map still has 49 bodies: 29 approved transitive model/prerequisite/test
bodies, 18 UI targets and two unchanged existing app tests. Exactly two bodies
differ from the frozen 649 map: app/src/theme.css and tests/app/debrief-laws.test.ts.
The old test body remains a contiguous prefix; all other test bodies are exact.
All 29 approved model bodies and 47 complete-map bodies remain byte-identical.
The 649 original case-name multiplicities and assertions are preserved.

The new draft includes all 18 complete corrected UI bodies, not just a patch.
Its three complete disjoint chunk maps preserve the original serial split:
7B registry has five targets, 6A panels/styles has ten, and 6B gate/laws has three.
Only 6A's CSS and 6B's additive law body change. The registry unit is exact.
source-delta.json records old/new hashes for both changes and hashes for all 47
unchanged bodies. ui-source-inventory.json binds every draft body to its unit.

Actual committed 5A1 and approved 7A2 remain the fixed source basis. Only the named
future R16/R17/5A2 overlays remain transitive author-host prerequisites, as in the
predecessor; they are not UI installation targets. Installation must reconcile
actual committed predecessors and must not copy these legacy overlays wholesale.
The approved 321-case model remains exact, including receipt partition and ending
consistency. No prior cache is an input or a validation host for this correction.

All original constraints carry forward: one terminal fold, running non-reachability,
props-only panels and broad type/value import fence; complete three-surface history;
truthful clock/identity/uncertainty and changed-copy prose; unchanged glyph/slot/term
registries; explicit status text; ungraded terminal cards; no magic/physical causal
inference; no A7 composers, Task 8 campaign closure or unrelated gameplay work.

## Native evidence

| Check | Result |
| --- | --- |
| Unchanged CSS plus all five additive style tests | 652 passed / two failed of 654; exit 1 |
| Complete corrected map | 654 passed; exit 0 |
| Preserved original cases in both runs | All 649 passed, including all 321 model cases |
| Both actual compiler configurations | Zero diagnostics; exit 0 |
| Exact TypeScript/TSX lint | 46 bodies, zero errors and warnings |
| Broad panel fence and gate firing | Existing real-path probes pass within the complete suite |
| Jargon/assets/prose/Space/mixed-time controls | Preserved and passing within the complete suite |
| Separate SSR terminal capture | One passed; unchanged world hash 1734303072 |
| Captured card, Threads, Timeline, Overlay and campaign data | All five files byte-identical to prior captures |

RED and GREEN use the same 654 named tests and exact test bodies. The only map
difference between them is the corrected CSS rule. RED fails dark inline at
1.5371452564542716 and light exact value at 2.4647156054824193; the other three
additions pass, and all inherited cases stay green. GREEN passes those same tests
without changing test source. The original terminal-public-entry 640/9 causal
evidence remains preserved and approved by the prior reviewer; it was not rerun
for this unrelated CSS-only correction.

All bounded tests and compilers ran serially in the root-allocated lane, released
immediately after SSR completion. The host uses a new 365-file fixed archive and
owned virtual maps/cache, with existing ancestor dependencies and the previously
authorized narrow native loader escalation. No dependency or ESLint/TypeScript
configuration changes were made. Vite still reports the existing optional missing
TypeScript source-map warning; native tests and both compilers pass. No package was
installed to suppress that diagnostic.

Run commands, from the detached author checkout:

```text
python -X utf8 .superpowers/sdd/task-6-7b-contrast-validation/run.py tests red contrast-red
python -X utf8 .superpowers/sdd/task-6-7b-contrast-validation/run.py tests green complete-green
python -X utf8 .superpowers/sdd/task-6-7b-contrast-validation/run.py preflight green compiler-lint
python -X utf8 .superpowers/sdd/task-6-7b-contrast-validation/run.py tests capture render-purity
python -X utf8 .superpowers/sdd/task-6-7b-contrast-validation/run.py script audit.py integrity-v1
```

These labels are immutable; reviewers must use new output paths. Every captured
native run saves controller and child argv, executable identities, cwd, exact source
maps/configs/helper bytes, separate raw binary stdout/stderr, exit and after-run
input/archive identity. The runner verifies every one of the old 1,004 sealed
entries after each invocation. The original maps, reports, native attempts and
all original validation files remain untouched.

## Two author passes and retained preparation failure

Pass 1 traced the actual mark and exact-value cell to their frozen CSS declarations
and both explicit/automatic palettes. It confirmed that deleted-only changes depend
on the exact-value surface and selected a single grouped terminal rule that avoids
a broad live-panel style change. No component or model correction was necessary.

Pass 2 checked actual selector specificity/source order, token resolution and opaque
color luminance, then confirmed causal native RED/GREEN with identical tests. It
also checked the shared primitive, all inherited causal/UI controls, both compiler
configurations, real fences and unchanged SSR markup/world state. The final audit
checks exact source/draft/chunk identities, all original case multiplicities and
the new archive/runtime/source-copy preservation.

The initial direct preparation helper failed while resolving review-inventory paths
relative to the review-validation directory instead of the primary SDD directory.
Its original prepare.py and preparation-failure.md remain saved. The old 1,004
entries had passed first; 20 named input copies existed when it stopped. The first
direct invocation lacks separate native raw files; its tool-transcript failure is
disclosed rather than represented as a captured rerun. prepare-v2.py fixes the
inventory base and verifies existing copies before continuing. Its native run
passes with all 464 reviewer entries, 25 protected input pairs and 365 archive
files verified. No proposal/model/style behavior changed for that helper repair.

## Remaining gates

This correction requires separate independent review. The prior Needs-fixes verdict
is preserved and is not represented as approval of the corrected package. The
calculation closes the demonstrated CSS problem in author evidence; it does not
certify a complete accessibility audit or interactive browser rendering.

No browser or server was launched. The carried plan retains the concrete later
browser narrative, two viewports, both themes, actual focus/pointer/keyboard/scroll
checks and saved evidence. Actual installation, predecessor reconciliation,
accumulated code gates, interactive browser evidence and Task 8 whole-branch
certification remain outside this author-only correction.


## Frozen authority and identity

The predecessor review and inventory were fully read/verified before correction:

| Input | SHA-256 |
| --- | --- |
| C:/Users/eliza/Desktop/ClaudeFiles/hearsay/node_modules/hearsay-debrief-ui-author-20260913/.superpowers/sdd/task-6-7b-validation/file-inventory.json | `3dd32a3ddccbef3e0c63886de56adc39b0aedb15eb2d6b85fec121ab59b6abc8` |
| C:/Users/eliza/Desktop/ClaudeFiles/hearsay/node_modules/hearsay-debrief-ui-author-20260913/.superpowers/sdd/task-6-7b-validation/receipt-green/complete-ui-green-two.source-map.json | `da05ead3493699c8b983aa79c809657af5132a8279344cb33c5e25b3816ad493` |
| C:/Users/eliza/Desktop/ClaudeFiles/hearsay/.superpowers/sdd/task-6-7b-native-review-2026-09-13.md | `62a1a20ae7427d23e24503e392d9702ede8f2f7390ae2d2882f7a7f807f5d306` |
| C:/Users/eliza/Desktop/ClaudeFiles/hearsay/.superpowers/sdd/task-6-7b-review-validation-2026-09-13/file-inventory.json | `49d636dd34b1437cb96593fdd281ba81b95e9913636b64b3f527b56bbc0e834d` |
| complete-green.source-map.json | `f36230987294a0fc1582ed4e989e6ca4ebcff915eff047765d00ed69008ebc4c` |
| chunk-manifest.json | `db166708aef2cf067cc3b55a34d1c8d8a409a6265ecce1ac45f25dbe374936d9` |
| source-delta.json | `a9c42cb9ad36f1f8640400f6544295014f7eac754af93110835e2f65a50566c5` |
| integrity-proof.json | `932c75456a69dccfb944e90d7448ae3dc993389d0ed60df6faab229c03eb9d93` |
| contrast-proof.json | `82316aca870ab88e06f3b29064879b31423979e799aec9b76a759b76b4906372` |

The new self-excluding inventory covers the three new proposal documents, every
new input/map/chunk/helper/native stream/capture and all 365 fresh archived files.
Only the inventory itself and owned disposable .vite* caches are excluded. Old
1,004-entry and reviewer 464-entry inventories remain immutable external inputs.
No old inventory is retrofitted and no prior source/map/report is superseded in place.
