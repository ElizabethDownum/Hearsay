# R18 measured watch-history dispositions

Normal-phase probes at independently approved R17 source `bc409d3` confirm that a
cancelled watch can resume work through ordinary presence. The actual tick loop
delivers watch d0 and its cancellation d1, removes the override, then lets the still
attempted d0 report another worked night. Its return packet restores HQ's post and
watched district. A separate correction proposal is commissioned; no R18 behavior
change is included in R17 or Task5A2.

The correction must retain the identity of the installed watch, including its
authored end day, so a later watch for the same guard/district cannot revive the
older record. The single-watch probe does not establish that supersession control;
the new proposal must measure it. R17's direct attempted-stage control needs an
explicit precondition amendment through the actual attempt/install path, preserving
its case identity and every assertion.

The expiry probe records eight real worked reports, followed by expiry at tick
12659 and a refusal at 12660. Task5A2's separate private outcome history addresses
the loss of earlier work from the final execution snapshot. Retain the work and the
later refusal as distinct evidence; expiry behavior and wording are outside the
cancellation correction.

The supported relocator probe changes guidance only; received/projected watch venue
remains square. That is a bounded non-reproduction of venue divergence, with a future
reprobe warranted if a trait can produce a non-null alternative place. The home-0
fixture is a non-delivery physical control, not a cancellation/re-latch control.

Root read the final report and complete harness, inspected the cancellation trace,
and rehashed 39 handoff entries plus all 38 final execution inputs. Final capture
passes 3/3 probes and retains four traces. Earlier v1 helper-level capture is
incomplete; earlier v2 helper/test revision bytes were not retained, although their
hashes remain in attempt maps. Final after-map stream locators are stale and corrected
only in an immutable addendum; actual captures-006 bytes match its recorded hashes.
These limits do not turn the earlier attempts into reproducible frozen sources.

All probe artifacts are under
`node_modules/hearsay-r18-probe-20260913/.superpowers/sdd/`:

- Completion report: `758612A1A684AA3E8747FD80D11F50312F06D3E163530897E0AA626989F2E3F7`.
- 37-entry base inventory: `EF94E1442C513F43BDF9C857668608C2D864B564BF158F928B5FC15326B8AF0C`.
- Immutable addendum: `D29B5AF964353C84034EF963B25BDD7B3366F3F0BD8635E11A6893154E9979B9`.
- Supplement: `2F56310C66B327E5B594A9E2964BF8D9B04F15C668C48BF96A65A281332655C2`.

The correction author uses a new isolated host at committed Task5A2 source `78ff1c2`;
that recording unit is in independent code review. Proposal approval, production
implementation, final gates and separate code review remain required for R18.
