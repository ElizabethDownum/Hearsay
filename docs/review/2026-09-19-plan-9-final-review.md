# Plan 9 — final whole-branch independent review and certification

The final full-plan independent review that plan item 8 requires returned **Ready to certify:
Yes — 0 Critical / 0 Important / 4 Minor** at `3de9892`, over the whole range
`2436a36..3de9892` (77 commits; 78 source and app files, +3,965/−160, read in full). The reviewer
was a native Claude worker (Opus, fresh context) that authored and reviewed nothing earlier on the
branch. With its one test-hygiene Minor repaired and its documentation Minor closed in this
commit, **root certifies Plan 9 complete.**

**What it established.**
- *Task 8 as installed:* both committed blobs hash to the reviewed values, the install commit
  touches nothing else, and the tests pass from the real tree layout.
- *Plan completeness:* each of items 1–8 is traced to installed code, tests and an approval;
  nothing the plan or a binding decision requires is absent, weaker than required or covered only
  by narration.
- *Carried Minors:* of every Minor across the twenty approvals, one was closed in range (the
  witnessed-presence receipt correction at `8f9b728`), three were closed by later work (desk
  ancestry measured in the browser; focus and narrow-table defects fixed by R36/R37), one was
  declined and closed, and the rest are open and harmless. None is now a real problem.
- *Integration and laws:* no contradictory assumption between the recording substrate, the debrief
  model, the panels and the Task 8 routes; no orphaned code from superseded corrections; no
  determinism hazard (`Math.random`/`Date` absent from `src/`, every new hash path ordered); the
  debrief model is read-only over the world (the canary's terminal world is a fixed point); the
  panel import fence is proved to fire; the running world cannot reach the debrief at three
  independent layers. The only `eslint.config.js` and `vitest.config.ts` changes exclude
  `.superpowers/**` review artifacts; no rule is weaker than at `2436a36`.
- *Gates in its own snapshot:* **2,490 tests / 150 files**, both compilers, lint, build, soak and
  Monte Carlo clean; certified comparator (`99B1F00F…`) against the Task 8 baselines, 10 blocks /
  230 deterministic lines all equal, four controls. Its build entry hash differs from root's
  `index-BpAIYnf0.js` by six bytes, root-caused by measurement: under a `node_modules` host the
  bundler does not apply the repository's class-field semantics, so one inert `state;` declaration
  in `src/core/rng.ts` is dropped. It is a property of the mandated host, not of the commit.
- *Docs:* fourteen concrete claims sampled across the approvals (hashes, counts, commit ids, closed
  statuses); thirteen true.

**Ruling on `meet` → `debrief`: post-plan, not blocking.** The reviewer reproduced the defect
independently with a live per-tick probe and a positive control: the promised window is ticks
15–30, the rendezvous override first exists at tick 16, a live `debrief` at 15 and at 30 both fail,
and the same one-beat override installed before the beat succeeds. The code is byte-identical at
`2436a36` (introduced at `4d6cf19`, 18 July), no Plan 9 requirement or decision names `meet` or
rendezvous, the capability Plan 9 does need (`debrief` reachable) is proved through the posting
route, and the repair changes sim behaviour and so needs its own RED/GREEN, comparison and review.
Conditions for that unit: prove the repair by a live `applyDebrief` succeeding through the tick
loop; convert `tests/network/hosting.test.ts`'s after-the-fact circle queries to live ones (they
currently pass against the broken window); correct the false comment at
`tests/network/debrief.test.ts:65`.

**The four Minors.**
- **N-1, repaired here.** The ESLint-API `it.each` in `tests/app/debrief-laws.test.ts` ran under
  vitest's 5-second default and failed once under machine load during the Task 8 install. It now
  carries the repository's 15-second allowance for ESLint-API cases (one line, test-only, root
  micro-task, disclosed): file 17/17, compiler and lint clean, full suite 2,490/150.
- **N-2, closed here.** Decisions R33–R37 existed only in approvals and commit subjects; they now
  have docket sections in `current.md`, with a note that the label R32 names two things.
- **N-3, not accepted.** The reviewer could not find "5.8 s" in the retained capture because it
  searched for that string; line 49 of `31-green-dirs.stdout.log` records the failing case at
  `5803ms` (the 5,985 ms figure is the file). The Task 8 approval stands as written.
- **N-4, recorded.** `FORGERY_LEAD_DAYS` in `src/sim/artifacts.ts` is exported with no outside use.
  Harmless; not worth a source change and a full comparison at certification.

**Carried beyond Plan 9:** the `meet` rendezvous window (above); rendering the debrief's artifact
section with real artifacts (browser observations F3/F4); the favicon; the live board's
`.diff-cell` contrast outside the desk; the open-and-harmless Minors in the register, of which the
Task 8 M-2 and M-6 are the two worth taking when those files are next touched.

- Review: `.superpowers/sdd/plan-9-final-whole-branch-review-2026-09-19.md` (SHA-256
  `B74D18E2E39145DB94BF34697AACA5B78D26B0067B9A1CE29FD105E9FB60BBC6`), evidence
  `.superpowers/sdd/plan-9-final-whole-branch-review-validation-2026-09-19/`, brief
  `.superpowers/sdd/plan-9-final-whole-branch-review-brief-2026-09-19.md`.
- Closeout captures: `.superpowers/sdd/plan-9-closeout-validation/native/`.
