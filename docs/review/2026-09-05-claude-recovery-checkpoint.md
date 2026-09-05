# Claude recovery checkpoint — 5 September 2026

Controller record; not a worker-authored review or implementation approval.
Source implementation remains a53551d6e47fc575f7c306f43f9fa0ff836250cc.
All changes and logs for this checkpoint stay inside Hearsay. No push.

## Completed work

Claude Fable 5.1 completed the bounded Task 3 author recovery and saved the draft
and report before its process exited successfully. The recovered proposal adds
physical-reference identity comparisons, conditional nested-copy isolation, five
real-digest consumer cases, and two ordinary-question collision controls. Total:
79 authored cases, not 79 executed gameplay tests.

Root extracted the exact authored count/syntax script into
`.superpowers/sdd/task-3-validation/count-authored-cases.mjs` and ran it against
the frozen recovered draft. Native exit 0; counts in document order:
8, 1, 7, 4, 27, 7, 5, 16, 2, 2. Complete TS/TSX blocks have no syntax diagnostics.
Fragments are not certified as standalone files. This is not a typecheck or
runtime test. Scoped ESLint for the extracted script also exited 0.

The initial extraction accidentally treated backticks inside the script's
regular expression as the closing Markdown fence. It failed before executing
the probe. Root retained that failure, anchored the extraction to a standalone
closing fence, and reran the authored script without changing its code.
Raw stdout/stderr/native exits remain under the validation directory.

For this documentation checkpoint, the literal `npm run lint` command passed.
The HTML rebuild contains all 32 decision cards and 48 unique element IDs, has
no external assets, and preserves the historical docket byte-for-byte. Checked
local handoff, snapshot-index and checkpoint-record links all resolve.

Root independently rehashed all four files in the earlier quota snapshot
manifest; all bytes match. Current author artifacts:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Task 3 corrected draft | 130187 | EBACFF982443BA604006D33CE62F5AD9AA11D95FE08E4C3DA70DB523A91176ED |
| Task 3 completed report | 13847 | 954AA918E2E59B9355318EEFE369E0D40283A9A3563D68887E5FB56D7DE97A40 |
| Task 4 completed draft | 87286 | 14ABA1730FF43696C17D0D81D293C6B96E2065F7B2DE83BD91F1515C4D8EE005 |
| Task 4 completed report | 7945 | A0200BFED039582714BC9AB96B9B9793553C0A41ED0ADFBAB61FFBF70F0E84F0 |

Byte-preserved tracked copies are linked by [the draft index](../plans/drafts/README.md).

## Interrupted work

The binding-stability author and independent séance plan reviewer both ended
with native exit 1 and API status 429. Each final result says the session limit
resets at **3:20 p.m. America/Chicago**, i.e. **20:20 UTC on 5 September**.
The controller observed these results at 16:16 UTC. They had permission denials
of zero. This is a capacity failure; the earlier transmission-authorization
rejection was resolved by Ellie's explicit approval and does not recur here.

The scanner author saved only its IN PROGRESS report; no correction plan exists.
The séance reviewer saved only its IN PROGRESS review header; no findings or
verdict exist. Neither is reconstructed from private model reasoning. Public
stream text and tool metadata confirm reading activity but supply no additional
review findings. All three CLI sessions are closed; no worker remains active.

The CLI's reported list-price estimates were approximately $8.60 for the completed
scrying recovery, $10.96 for the interrupted scanner author, and $13.12 for the
interrupted séance reviewer. These are provider-reported list estimates, not a
claim about actual billing, remaining quota, or a reliable quota percentage.

## Resume requirements

1. Finish the bounded R15 binding-stability plan, then separately implement with
   real RED/GREEN, run controller gates, and obtain independent committed-code
   review. Task 2 remains blocked on Task 1 closure.
2. Focused re-review of the corrected Task 3 proposal: close the two original
   findings and verify the added marker-collision controls. Reconcile against
   the actual certified Task 2 source before implementation.
3. Restart the independent Task 4 plan review from the exact frozen draft.
   Preserve Task 3's residue identity/copy branches, inspect marker guard ordering
   and controls, and assess copied physical refs in derived subjectful features.
4. Only after those prerequisites continue Plan 9 in the documented order.

The existing source gate remains 1,737 tests / 113 files, lint, both typechecks,
build, soak and MC passing at a53551d; 10 complete report blocks / 230
deterministic lines match. It does not close the known scanner false greens or
certify any proposed magic implementation.
