# R16 self-presence correction — constraints

- Existing local location is sufficient evidence of the recipient's own presence.
  Every other person's presence still requires the existing observation check.
- Preserve time/avoid guidance, all eight decision dimensions, and evaluator purity.
- No new self observation, hidden-world input, threshold, price, seed or watch-window change.
- Only evaluator.ts and the new self-presence.test.ts are production/test edit targets.
  Preserve all prior source and tests; any count drop needs per-test disposition.
- Full test/lint/types/build/soak/MC gates; compare complete simulation reports and
  investigate changes from this intentional execution repair. Never retune a pin to pass.
- All files remain inside Hearsay; no push, installs, settings or shared-memory writes.
- Independent plan review before implementation and separate code review afterward.
- Emergent assertions are hypotheses: failure means stop and report evidence;
  never weaken physics/formulas/seeds. Untraceable suite failure is BLOCKED.
