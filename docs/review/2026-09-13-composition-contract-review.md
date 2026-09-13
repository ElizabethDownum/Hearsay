# Composition contract correction review — 13 September 2026

**Needs-fixes: zero Critical, one Important, zero Minor.** Independent review closes
the ending-evidence finding, R31. The313-case correction still has one R30 chronology
defect: a future duplicate receipt removes a valid current feature from current
history even though that feature has uniquely resolved current supporting evidence.

The correction correctly separates the future evidence row. Its feature filter then
scans the later receipt indexes and moves the whole feature into the future section.
This loses known current history and weakens an existing lower-reader guarantee.
The next correction must retain a current feature with current/unknown references,
exclude future indexes from that current projection, and preserve the future receipt
in the explicitly typed future data. Missing dates and source identities remain
unchanged; neither evidence nor a causal relationship may be invented.

The original278 and all313 corrected cases pass independently, as do the original
five reviewer probes, both compilers,34-body lint and mandatory law checks. Causal
RED reproduces284 passed/29 failed. One new mixed-time control fails only after
confirming that the current and future evidence rows were separated correctly.
The ending validator passes real endings and malformed, missing, ambiguous and
future-record controls without rerunning gameplay rules.

Root read the full review, verified all97 sealed review entries, and commissioned
another bounded author-only correction in a new isolated host. Only proposed
threads.ts and additive composition tests may change; the ending validator and all
other bodies remain frozen. All313 assertions and the new reviewer regression are
binding. UI evidence on the313 input remains provisional until a replacement passes
independent review. No debrief model or UI is installed.

Report: `.superpowers/sdd/task-5b-contract-native-review-2026-09-13.md`, SHA-256
`EE8807351D79C0D91ED02E1CD9AF88648275F6034E3DD6C46EA64AE0C6689D7C`.
Original97-entry inventory SHA-256
`C6CAB8040C7B8E488DB865D04095FDCECB4EADC848DF9FF6E47A8B8E365BB5AE`.
The report truncates the author inventory hash by one character; the actual verified
hash ends `429A8C`. The immutable erratum is SHA-256
`FE860B916E0FFA2B17C221338D5F93CFB33FDB6928110DD64723AE977BC54893`;
the360-entry archive/helper supplement is
`F2C19C4515EFC5A0F315E089B8225A39F0ED5F7B210210645DFDA38825B79633`.
Root read the addendum and verified all360 entries. Ordinary sandbox traversal had
omitted346 nested archive files from the first seal; the supplement completes the
coverage and preserves the original report and97-entry inventory unchanged.
