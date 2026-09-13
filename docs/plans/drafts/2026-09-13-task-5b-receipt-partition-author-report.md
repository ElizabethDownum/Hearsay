# Task 5B current feature and future receipt author report

13 September 2026. Complete bounded replacement, ready for independent re-review.
The current uniquely supported feature survives a future duplicate receipt; future
history remains reachable in the existing typed beyondClock section. Public shape
and the independently closed ending validator remain unchanged. Exactly threads.ts
and additive composition.test.ts differ from the frozen 313 proposal; all other
32 map bodies and all original 313 test bytes/assertions remain exact.

The final complete suite passes 321 = 313 + 8 cases. The exact independent fixture
is permanent; the original five independent probes also pass. Both actual compiler
configurations and all 34 scoped lint bodies pass. Four mandatory laws fire at the
actual threads.ts path. Root's native timing clearance was observed; the bounded
heavy lane was released after these gates.

| Corrected target | SHA-256 | Bytes |
| --- | --- | --- |
| `src/sim/debrief/threads.ts` | `907574815e3a3491a30c9245c77318ed60e3e30820c41a40aa437e06a4b322e6` | 6192 |
| `tests/debrief/composition.test.ts` | `0b09a4ad5fa592df6e6d431a1226ed39345594b99efb422fcdd90c56b037eac1` | 50214 |

Complete executed map: task-5b-receipt-partition-validation/green/complete-green.source-map.json,
SHA-256 `d3b54a75415482ab5f5045940a43215093532ee42cd3943934b09b4a8b4e6b05`. green-map.json is byte-identical. The draft supplies
both complete corrected bodies, unchanged API semantics, exact five-chunk installation
amendment, actual-versus-future prerequisite reconciliation and verification commands.

## Corrected representation contract

No public type, field or value export is added. The existing typed section remains:

```text
operations.beyondClock = {
  enemyEvidence: OperationThreads['enemyEvidence'],
  physicalEvidence: PhysicalObservationHistory['evidence'],
  featureReferences: FeatureLink[]
}
```

The previous rule that any future indexed receipt makes the entire feature future
is replaced with a projection. A feature whose own retained day, recorded decision
day and raw reference observation timestamps are current or undated remains in
operations.featureReferences. If one of its references names a future evidence row,
the current copy filters that future index from evidenceIndexes,
undatedEvidenceIndexes and laterEvidenceIndexes. Every retained current or unknown
index keeps its original identity and order. No array is renumbered.

The same feature may also occur in beyondClock.featureReferences. That copy retains
the complete original lower-reader FeatureLink as context for its later receipt
occurrences, including earlier context. Its presence means retained future receipt
information for this feature; it does not mean a new feature was created in the
future. Consumers may display its original feature ID in both sections and identify
the later receipt indexes through beyondClock.enemyEvidence. They must not count
the contextual copy as an additional feature creation. The current and beyond-clock
copies, including nested metadata and arrays, are detached from each other and world.

Removing only a separate later duplicate preserves a uniquely resolved current
evidence association and its original attention IDs exactly. Filtering is never
used to infer a new causal join. If primary or undated support is removed, or if
removing later support leaves no retained support in any of the three arrays, the
current reference has resolution:'unrecorded', attentionResolution:'unrecorded'
and attentionIds:[]. Its retained reference and remaining indexes stay visible.
An undated competing occurrence that survives the projection retains the original
ambiguity. The beyond-clock copy always preserves the original lower-reader result.

Pure future features retain prior behavior: a future own/recorded day or raw reference
observation timestamp places the entire row only in beyondClock. Contradictory
current/future feature dates are not repaired. At the exact view-clock boundary,
the retained occurrence is current, so a link with no other future date remains
the unchanged full current link with no contextual beyond-clock copy.

Evidence and physical evidence partition predicates are unchanged. Unknown receipt
time stays null/unrecorded; explicit future physical receipt/observation metadata
still partitions future even if acquisition is not corroborated. No operation or
orphan is removed, no source state is mutated and no timestamp is invented.

The independently closed R31 ending validator is byte-identical. index.ts remains
SHA-256 5585e10d0ec4cd75211f6361be2c60559d449070514670cce52e5e729a2103ae.
Its consistent/missing/inconsistent union and raw payload are unchanged. This unit
does not reconsider historical ending identities, rosters, thresholds or referee
outcomes. All other 32 bodies, including the lower feature/arrival/attention readers,
calendar, overlay, magic identity and future recording/watch inputs, remain exact.

## Acceptance and native verification

321 = 313 preserved cases + the exact reviewer regression + seven adjacent controls.
Migrated cases: zero. Original composition.test.ts bytes are one unchanged contiguous
body between additive imports and appended cases. Existing case-name multiplicities
and every old assertion remain present; all 313 old cases pass in baseline, RED and
GREEN. RED and GREEN use identical test bytes; only threads.ts changes between them.

The exact reviewer probe is rebased only at its imports in the new host. Its permanent
test adapts SPEC/ANSWER_AT/direct helper names and removes an unused destructured
answer binding; fixture values and all assertions remain exact. Preparation and audit
prove that correspondence. The seven additional cases cover current/future index
separation and raw future context, retained unknown ambiguity, multiple references,
detached nested ownership and purity, future-only support for a current feature,
inclusive receipt boundary, and conservative same-day future support clipping.
Existing 313 cases retain pure-future rows, physical receipts and unknown-clock controls.

| Native gate | Measured result |
| --- | --- |
| Frozen original model/test baseline | 313 passed, exit 0 |
| Exact mixed-time reviewer probe on old model | 0 passed / 1 failed, exit 1 |
| Permanent RED on old model | 314 passed / 7 failed, exit 1 |
| Permanent GREEN | 321 passed, exit 0 |
| Exact mixed-time reviewer probe on corrected model | 1 passed, exit 0 |
| Original five reviewer probes on corrected model | 5 passed, exit 0 |
| Both actual compiler configurations | Zero diagnostics, exit 0 |
| Exact-body lint | 34 files, zero errors/warnings, exit 0 |
| Mandatory law firing at actual threads.ts path | Four expected diagnostics, exit 0 |
| Final native integrity audit | All identities, inventory entries and original bytes preserved, exit 0 |

The exact reviewer RED first proves one resolved current occurrence and one separate
later occurrence, then proves current/future evidence partition, then fails at
featureReferences length 0 instead of 1. This is the same causal failure as the
binding review. The combined RED's only new passing case is the exact clock boundary;
all seven failures concern the missing current feature. No unexpected failed compiler,
lint or test attempt occurred in this correction. Original prior failures remain
frozen at their source and in copied exact inputs where bound.

Executed commands from the isolated author checkout (PowerShell 7, python -X utf8):

```text
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py baseline tests original-313
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py mixed-red tests exact-mixed-red
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py red tests complete-red
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py green tests complete-green
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py green preflight compiler-lint
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py mixed-green tests exact-mixed-green
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py reviewer-green tests original-five-green
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py root firing final-firing
python -X utf8 .superpowers/sdd/task-5b-receipt-partition-validation/run.py root audit final-integrity
```

These labels are immutable executed evidence, not rerun destinations. Independent
review uses a fresh owned host/cache and new prefixes. prepare.py/host.py show the
exact archive and virtual-loader preparation; each stage retains its entry/config,
relative bodies and actual-path map. Every gate records native executable identity,
argv/cwd, separate binary stdout/stderr, actual exit and input/archive preservation.
Test/compiler stages retain their executed full source map. Mandatory firing records
the exact scratch injection and actual model path. Compiler diagnostics and lint
arrays are copied to the immutable compiler-lint prefix before formatting.
The known native-owned archive read constraint uses narrow native escalation without
ACL, package, network or project configuration changes. No old cache is executed.

## Two adversarial author passes

Pass 1 reproduced the precise independent defect with the retained actual forge,
plant and questioning fixture. Ada's compelled answer produces the current document
evidence and day-one forged-document feature. At world tick 2879, an actual remote
capture of the duplicate report has retained receipt tick 4320. The lower feature
reader resolves the original occurrence uniquely and keeps the duplicate separately
in laterEvidenceIndexes. The old composition classifies any referenced future index
as a future feature, incorrectly removing the whole current feature despite the
already-correct evidence partition. The exact native reviewer RED fails at that point.

The correction inspects feature dates separately from occurrence receipt dates and
projects only the latter. Adjacent lower-reader consumers were checked: featureLinks
retains current/undated/later occurrence categories and attention IDs; evidenceArrivals
provides retained acquisition clocks; physical receipt markers can be future despite
unknown acquisition. Their bytes remain unchanged. The composition uses the existing
future predicate and clones the current link, preserving the original full link as
context in beyondClock. It does not create a new identity or rerun attention matching.

Pass 2 challenged projection with unknown competitors, a separate missing second
reference, mutation of nested copies, a current feature with only future support,
the exact inclusive receipt boundary, and a same-day future competing primary
occurrence. Clipping support must not turn old ambiguity into a newly proven join;
the documented unrecorded downgrade prevents that. These controls also prove that
the full raw future context stays visible and independent. The first final proposal
passes all 321 cases; no additional model scope or unexpected gate failure was needed.
Both author passes are distinct from the still-required independent replacement review.

## Immutable evidence and authority

fixed-inputs.json protects 25 original source/copy pairs. The later reviewer evidence
addendum, supplement inventory and preparation proof are three separate additive
source/copy pairs under review-supplement-inputs.json. Earlier maps and run preservation
proofs remain untouched. The final audit independently re-reads all 576 frozen author
entries, all 97 original review entries and all 360 supplemental review entries.
Those review inventories overlap on 14 files: 97 + 360 - 14 = 443 unique covered files.
The supplemental map itself and addendum are additional fixed artifacts, not counted
again as original inventory entries.

The original review report omitted the final C of the author inventory hash; the
correct bound hash is 217e03d4c18bc2b2ab2f2e6183f53a1e63c740dbd5135d0ad457447939429a8c.
The immutable addendum is SHA-256
fe860b916e0ffa2b17c221338d5f93cfb33fdb6928110dd64723ae977bc54893;
the supplement is SHA-256
f2c19c4515efc5a0f315e089b8225a39f0ed5f7b210210645dfda38825b79633.
It adds the 346 native archive files omitted by the reviewer's ordinary sandbox
traversal. The reviewer's evidence-only enumeration and parse failures are disclosed
in that addendum; they do not change the semantic finding, original report or 97 seal.

All 356 files in this author's fresh base archive remain exact, and native recursive
enumeration proves none are omitted. The final self-excluding file-inventory.json
is relative to this isolated .superpowers/sdd and includes all three markdown files,
every non-cache owned archive/helper input, maps, case identities, binary logs and
proofs. It excludes only itself and owned disposable .vite-* cache directories.
source-inventory.json records every body and whether it is one of the nine future
predecessor overlays. chunk-reconciliation-proof.json records the four byte-identical
chunk maps and exactly two corrected bodies in 5B5. Git reports no tracked writes;
only this unit's permitted proposal files are untracked.

## Release and remaining integration

All work is author-only in the permitted isolated proposal tree; no production,
configuration, index, commit, dependency or shared-AI changes occurred. All original
and current native failures remain immutable. Lower-reader uncertainty is retained;
the projection does not reconstruct arbitrary damaged history or certify data that
was never recorded. Repeated IDs across current and beyond-clock sections indicate
one current feature with later receipt context, not two creations.

Root and the UI author received the representation contract early. The final map is
released frozen for independent re-review; it must be approved before final UI/model
certification consumes it. The UI's old 313/638 evidence remains provisional and its
new mixed-time presentation fixture awaits the approved replacement. Actual recording
and watch predecessors, production installation, full-game/build/soak/Monte Carlo,
accumulated code review and Plan 9 completion remain separate execution work.

## Exact final native test output

```text

 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay/node_modules/hearsay-debrief-receipt-author-20260913/.superpowers/sdd/task-5b-receipt-partition-validation/node_modules/hearsay-baseline

 ✓ ../../green/entry.probe.ts (321 tests) 693ms

 Test Files  1 passed (1)
      Tests  321 passed (321)
   Start at  16:51:36
   Duration  2.15s (transform 403ms, setup 0ms, collect 1.08s, tests 693ms, environment 0ms, prepare 83ms)

JSON report written to C:/Users/eliza/Desktop/ClaudeFiles/hearsay/node_modules/hearsay-debrief-receipt-author-20260913/.superpowers/sdd/task-5b-receipt-partition-validation/green/complete-green.results.json
```
