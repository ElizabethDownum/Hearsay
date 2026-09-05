# Task 3 author report — recovered corrected draft for focused independent re-review

**Recovery status, 2026-09-05: COMPLETE (author-only).** Recovery seat `claude-fable-5-1` under the explicit user authorization recorded in `.superpowers/sdd/task-3-claude-recovery-author-brief.md`; the original draft and corrections 1–2 were authored by the native Codex seat whose quota expired mid-correction. All three bounded corrections are now in `task-3-author-draft.md`. No production, test, index, documentation, snapshot or shared file was touched. No child agent, shell, network, install, commit or push was used. This session had Read/Glob/Grep/Edit/Write only, so **no parse, typecheck, test, hash or runtime probe ran here**; every runtime statement below is either the previous author's historical probe, cited with its limits, or an authored expectation for root to execute.

Owned outputs only:

- `C:\Users\eliza\Desktop\ClaudeFiles\hearsay\.superpowers\sdd\task-3-author-draft.md` (1793 lines after recovery; 1676 before)
- `C:\Users\eliza\Desktop\ClaudeFiles\hearsay\.superpowers\sdd\task-3-author-report.md` (this file)

Final immutable hash: not computable by this seat. Root records it with the script in "Scripts for root" below.

## Snapshot verification (by reading, not by hash)

The recovery brief names snapshot `quota-recovery-2026-09-05/task-3-author-draft.md.txt` (SHA-256 `243F6E86…CFEC1`, 114923 bytes) and `task-3-author-report.md.txt` (`C00DF77B…A4480`, 8547 bytes), with `manifest.json` carrying the same values. Before editing, the working draft and the snapshot were compared by content: both had exactly 1676 lines, and every distinguishing line checked sat at the same line number with the same text (header line 3, calibration line 8, the 3C2 file list at 350, the `sameRefs` comparator at 608–617, the conditional nested copy at 627, the `scry-ref-runaround` intro at 1258, the auditor residue branch at 1387–1398, the fourteen-fault list at 1480/1510, the count sentence at 1516, and the self-review lines 1670/1674). The saved report matched its 59-line snapshot in the same way. The recovery therefore edited the exact interrupted state. Byte-level identity to the manifest hashes is root's check; it was not performed here.

Verified against the saved bytes before editing: corrections 1 and 2 were already present in 3C2 (comparator, conditional copy, the five-case `tests/sim/scry-ref-runaround.test.ts`). Correction 3 was absent: the auditor's residue branch was selected only by `ref.residue !== undefined`, and the retained `missing-ref-discriminant` fault failed at the legacy finder only because the fixture happened to hold no same-tick asking. That is the fall-through the brief describes.

## What changed in the draft (recovery edits only)

1. **Header and calibration** (`task-3-author-draft.md:3,5,8`): names both authoring seats, records that neither executed anything, replaces the expired "no Claude worker" pause wording with the explicit fallback authorization, keeps capability-based seat binding, and notes the frozen `a53551d` re-read.
2. **3C2 atomic unit** (`:350`): the auditor's required `residue` discriminant for `arcane-residue` features is named as part of the same atomic 3C2 unit as the widening, comparator and nested copy.
3. **Auditor precondition** (`:1384–1389`): `if (feature.kind === 'arcane-residue') expect(ref.residue, …).toBeDefined();` inserted before the value-keyed residue branch and before the legacy "exactly one id" check. Imports for `type SketchEvidenceRef, type SketchFeature` added to the file's import instruction. The legacy-finder paragraph (`:1445`) now states the two converse protections.
4. **Asking-twin controls** (`:1519–1578`): `stageAskingTwin` (asking evidence row in the exact `counterintel.ts:48-54` shape plus chronicle row in the exact `phases.ts:500-506` shape, same tick/venue/observer as the sighting), `legacyAskingFeature` (an `entry-point` with a null/null legacy ref), a positive legacy-path control proving two evidence rows share the ref's tick/observer/null ids and the audit still passes, and a corrupted-copy control that passes the identical world, strips `residue`, re-asserts the twin is resolvable, and expects the audit to throw. Authored RED: without the precondition the corrupted-copy control fails because the audit accepts the stripped ref through the twin.
5. **3C2 focused command** (`:1643`): now also runs `tests/sim/scry-ref-runaround.test.ts` and the legacy consumer control `tests/sim/enemy-runaround.test.ts`.
6. **Sketch-reference consumer inventory** (`:1724`): complete list of `SketchEvidenceRef` / `SketchFeature.evidence` readers at `a53551d` in production (`state.ts:80-103`, `digest.ts:188-191,132-135,361,365`), the modules that read sketches without touching refs, the absence of any panel reader, and the sixteen test files that hold ref-shaped literals, with the reason they stay valid.
7. **Self-review passes 3 and 4** (`:1736,1738`): absent-marker collision and nested-ref aliasing, each read in a fresh order, including the walk of all fourteen faults against the new precondition and the Task 4 seam check.
8. **Evidence separation and arithmetic** (`:1740–1790`): historical probes relabelled as the Codex session's; a paragraph stating this session ran nothing; the checksum corrected from 72 to **79** with the per-file breakdown; and an exact `count-authored-cases.mjs` script for root.

Preserved unchanged: every production edit, every earlier test body, D1–D6, R5/R6 defaults, the 3A→3E unit boundaries, all file licenses, the `sameRefs` comparator and conditional copy text, the five `scry-ref-runaround` cases, the fourteen fault controls, and the comparator script.

## Authored case arithmetic

| File | Cases | Note |
|---|---|---|
| `tests/sim/scry-perception.test.ts` | 9 | 8 in 3A + 1 appended in 3C1 |
| `tests/sim/scrying.test.ts` | 27 | 16 + 1 + 3 + 2 invalid/boundary, 5 live-window |
| `tests/sim/scry-residue.test.ts` | 7 | |
| `tests/intel/magic-provenance.test.ts` | 7 | |
| `tests/app/magic-provenance.test.tsx` | 4 | |
| `tests/sim/sketch-faircop.test.ts` additions | 18 | 2 positive + 14 faults + 2 asking-twin controls |
| `tests/sim/scry-ref-runaround.test.ts` | 5 | 4 identity modes + 1 nested-copy isolation |
| `tests/app/magic-session.test.ts` | 2 | |
| **Total** | **79** | historical 72 predates the runaround file and twin controls |

## Source observations (read at the frozen `a53551d` working tree)

- `src/sim/enemy/digest.ts:132-135` compares only tick/observer/claimId/messageId; `:361` is the only `sameRefs` call; `:365` copies refs with a flat spread; `:188-191` mints refs. These match the plan review's cited lines.
- `src/sim/enemy/state.ts:86-91` `SketchEvidenceRef` has no nested field yet; `EvidenceEntry` has three arms and no `residue`/`receipt` keys.
- `tests/sim/sketch-faircop.test.ts:24-61` selects the chronicle arm purely by which id is null; the legacy finder at `:35-37` would resolve any same-tick/observer null/null evidence row.
- `src/sim/counterintel.ts:48-54` and `src/sim/phases.ts:500-506` are the exact shapes the staged asking twin copies; `src/sim/types.ts:91-101` is the `AskingRecord` type and `perception.ts:16` the `InquiryKey` union.
- `tests/sim/enemy-runaround.test.ts` stages leads and ledgers exactly as the new `stagedRunaroundState` fixture does, and asserts `toEqual` on legacy ref literals that gain no key.
- `task-4-author-draft.md:889-902,920-928,934-981` appends `nightVisit` comparisons, the conditional copy and a symmetric `if (feature.kind === 'night-visit') expect(ref.nightVisit).toBeDefined();` precondition at `:937`.

## Author-proposed mechanisms (not executed)

- Correction 1: `sameRefs` adds `residue?.id/witness/observedAt` clauses after the four legacy fields (draft `:611-617`).
- Correction 2: runaround copy adds `...(row.residue === undefined ? {} : { residue: { ...row.residue } })` (draft `:625-628`); five real-`enemyDigest` cases use refs from actual paid-trace capture with explicitly staged subjectful leads (draft `:1258-1382`).
- Correction 3: feature-kind precondition before channel dispatch, plus the two asking-twin controls (draft `:1387-1389,1519-1578`).
- The corrupted-copy control asserts `toThrow()` without a message pattern on purpose: the exact prefixing of a custom `expect` message in the thrown text was not verified here, and the non-vacuity is carried by the positive control and the in-test resolvability assertions instead. Root may tighten it to a pattern after seeing the real message.

## Executed evidence

- This session: none.
- Historical (native Codex session, cited from the previous report and draft): TypeScript 5.9.3 `transpileModule` on the then-twelve complete blocks with zero syntax diagnostics; a 22-source projection with zero diagnostics in eleven authored roots and fourteen inspected dependency diagnostics; an AST count of 72. None of these covered the five `scry-ref-runaround` cases, the precondition, or the twin controls, and none was a production typecheck, lint, build, suite, replay, soak or MC run.
- Independent plan review (`task-3-plan-review-2026-09-05.md`): focused pre-Task-3 baseline 6 files / 95 tests passed; in-memory identity probes reproduced both collisions and the spread alias. That evidence predates every recovery edit.

## Issues and questions held for root (route to `docs/review.html`)

1. **Derived physical refs are not covered by a feature-kind precondition.** A later subjectful `runaround`/`carrier-profile` carrying a copied residue ref (Task 4's seam) whose `residue` were stripped would again reach the legacy path when an asking twin exists. Task 3 emits no such feature (null subject). Recommended: Task 4 adds the same feature-kind precondition for its physical kinds and, if root wants broader coverage, a Task 4 corrupted-copy control on a copied lead; not widened here.
2. **Task 4 ordering.** Task 4's draft already holds the symmetric `night-visit` precondition (`:937`); root should confirm it lands before Task 3's residue branch and that its `nightVisit` comparator/copy clauses append after Task 3's exactly as the seam text says.
3. **`toThrow()` without pattern** in the corrupted-copy control, as explained above.
4. **Historical base line.** The draft's Base still names the pre-restart documentation HEAD; root records the actual certified Task 2 hash at dispatch, as the draft already instructs.
5. **Hash and count reproduction** are root's: see scripts below. The manifest hashes were not re-verified here.

## Shared seam to relay to the Task 4 author (no spawn)

`sameRefs` = four legacy clauses + three `residue?.` clauses, Task 4 appends three `nightVisit?.` clauses; runaround copy = `...row` + conditional `residue` spread, Task 4 appends the conditional `nightVisit` spread; auditor = feature-kind precondition(s) → value-keyed physical branch(es) → legacy "exactly one id" check → legacy finder excluding `'arcane-residue'` (Task 4 extends the exclusion to `'night-visit'`); the residue branch must keep `expect(ref.nightVisit).toBeUndefined()` when Task 4 adds it.

## Scripts for root (exact; nothing here was run by this seat)

Hashes of the working artifacts and the preserved snapshots, from the repository root in PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 `
  .superpowers/sdd/task-3-author-draft.md, `
  .superpowers/sdd/task-3-author-report.md, `
  .superpowers/sdd/quota-recovery-2026-09-05/task-3-author-draft.md.txt, `
  .superpowers/sdd/quota-recovery-2026-09-05/task-3-author-report.md.txt |
  Format-Table Hash, @{ n = 'Bytes'; e = { (Get-Item $_.Path).Length } }, Path -AutoSize
```

Expected: the two `.txt` rows equal the manifest values (`243F6E86…CFEC1` / 114923 and `C00DF77B…A4480` / 8547); the two working rows are the new immutable hashes to record.

Authored-case count and complete-block syntax parse: save the `count-authored-cases.mjs` block from the draft (`task-3-author-draft.md:1748-1789`; its instructions are at `:1746` and `:1791`) as `.superpowers/sdd/task-3-validation/count-authored-cases.mjs`, then:

```powershell
node .superpowers/sdd/task-3-validation/count-authored-cases.mjs .superpowers/sdd/task-3-author-draft.md
```

Expected `total` 79 with per-block counts 8, 1, 7, 4, 27, 7, 5, 16, 2, 2 and empty diagnostics on complete blocks. This is a syntax parse over the draft only, not a typecheck and not a test run.

After implementation of 3C2 on the certified Task 2 base, the focused command is the draft's 3C2 row:

```powershell
npm test -- tests/sim/scry-residue.test.ts tests/sim/scry-ref-runaround.test.ts tests/sim/enemy-runaround.test.ts tests/sim/sketch-faircop.test.ts tests/sim/no-omniscience.test.ts
```

Authored RED expectations to confirm before accepting GREEN: with the old comparator, `different-residue` and `physical-versus-legacy` collapse to one runaround; with the old shallow copy, the nested identity/isolation case fails; with the residue branch but no precondition, the corrupted-copy asking-twin control fails.

## Historical context carried forward from the interrupted report

Root accepted D1–D6 and R5/R6 during authorship; no decision is re-asked. The coordinated Task 4 seam (`MagicProvenance`, `PhysicalReceipt`, `tests/sim/helpers/sketch-audit.ts`, positive claim-bearing voicings narrowing, Task 3 owning only `ScryRecord`/`ResidueRecord`/`WorldState.magic`) is unchanged. Task 2 still supplies no certified implementation base; root must certify Task 1/2, verify the real document-marker projections, fill the real base and baseline log paths, run the scripts above, and send the focused independent re-review before any implementation dispatch. No production test, suite gate, live/replay or simulation proof is certified by this artifact.
