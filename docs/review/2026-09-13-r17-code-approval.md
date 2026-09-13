# R17 watch execution stage — independent code approval

**Approved, zero Critical / Important / Minor findings.** Source commit
`bc409d3d4cdba6bc1242a09ba1d24ab0b3c435fc` adds one execution-state condition and
the exact four-case acceptance file. A pending or deferred watch cannot record a
worked night; a physically valid attempted watch still records its work once.
The independently approved R16 guard-presence fix and original watch pin remain.

Worker causal RED reproduced three failures and one passing control before the
source change. Worker, controller and independent reviewer each pass2,059 tests
in131 files, lint, both TypeScript configurations, build, soak and Monte Carlo.
The reviewer additionally passes eight adversarial boundary cases. Build output
is512.75kB JavaScript/151.88kB gzip, with the existing size warning retained.

All10 complete simulation report blocks/230 deterministic lines match the
approved R16 baseline. The unchanged certified comparator's known-good,
changed-value, extra-output and missing-output controls pass.

Root read the full independent report and verified all77 review evidence entries,
both actual source hashes, the80-entry worker seal and29-entry controller seal.
Frozen evidence under `.superpowers/sdd`:

- Review: `r17-code-review-2026-09-13.md`, SHA-256
  `8E9F5C6716C9C0DA7F6A652E59C607D78F4376B4F820BFBDEF1FAE4293699D39`.
- Review inventory: `r17-code-review-validation-2026-09-13/evidence-inventory.json`,
  SHA-256 `061D250BDB1956057E4BE9CD345083A074A8E1B56F29A4C698BA23EB192A1D13`.
- Root gate inventory: `r17-implementation-validation/controller-final/file-inventory.json`,
  SHA-256 `E500F39F2A34EA3870A1C159C918D456F104CE5C146D306E64E4BA1905E76DFB`.
- Root verification: `r17-review-controller-proof.json` and
  `r17-implementation-validation/controller-source-proof.json`.

The original review incorrectly carries R16's PowerShell capture description into
its R17 worker-evidence paragraph. R17 actually used Python binary pipes with
before/after source identity. The reviewer is preserving the report and adding an
immutable evidence erratum. Its independent committed checks already use the
complete binary capture chain; this factual correction does not affect approval.
The two failed reviewer preflight assumptions and the worker's initial sandbox
loader denial also remain preserved and explicitly distinguished from test failures.

R17 is closed. Task5A2 private outcome recording follows as a separate unit.
R18 cancellation, expiry and interpreted-venue probes are now separately bound to
the actual approved R17 source; they do not widen this fix or its approval.
