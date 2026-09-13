# Guard self-presence code approval — 13 September 2026

**Approved: zero Critical, zero Important, zero Minor.** R16 is complete at
`36d090cdb6da3be5814e72d4262efa4d67ac94ea`, from approved recording source `252a481`.

A guard can now satisfy an advisory about their own presence using the local venue
already supplied to the evaluator. Other people's presence still requires an
observation. Time and avoid guidance remain intact. The same rule applies to a
player-authored directive naming its recipient. The patch adds one condition and
the exact ten regression cases, including the adopted execution-state assertion.

Worker, controller and independent reviewer each pass **2,055 tests in130 files**,
lint, both compilers, build, soak and Monte Carlo. The reviewer also passes seven
adversarial controls and39 focused cases. All10 report blocks/230 deterministic
lines remain unchanged, with four comparator controls. Build is512.71kB JavaScript /
151.87kB gzip, retaining the existing size warning. Native RED reproduced three
failures and seven passing controls on the predecessor.

Root read the complete review and verified all75 review entries and both current
source hashes. Report `.superpowers/sdd/r16-code-review-2026-09-13.md`, SHA-256
`7AC1E8BA1F689BEED02EABA18362E3EEE1E58831BE364741A47A759D567BCCFF`.
Review inventory SHA-256
`71C60F31BBD6F6C62BF03FDE79B975BB8D285BDCA5F64E3022FB99FCBDC03626`.
The29-entry controller gate inventory is
`F502999B47F96055F0DBDF24B6A224BB49AB1D12BC37A29B1B16905C9CDF67A4`.

The worker captured separate process streams and native exits but recorded source
hashes only after each run. Committed controller evidence and the reviewer's
before/after source identities and binary stream capture close that provenance
limit. All failed loader/audit/probe-host attempts remain preserved; no source,
configuration, assertion or game rule changed to fix the verification host.

R17 remains the separate next unit: require actual execution before a watch can
claim work. Its known intermediate duplicate report is not covered by this approval.
R18's three mechanism observations also retain their separate pre-closeout probes
and disposition requirement.
