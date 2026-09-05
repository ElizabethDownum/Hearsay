# Task 5A recording repair — binding constraints

Source authority: docs/design-spec.md, “The debrief — the intuition engine”; current
plan Task 5 and HTML R8; prior Plan 11 speech, frame, serialization and import laws.
This is a narrow recording repair inside Plan 9, not a new gameplay mechanic.

- Preserve the actual tick transaction, prices, dates, seeds, gates and trait rules.
- Artifact viewings mint exactly the same claims, families and evidence weights.
  Record their actual IDs at the existing mint site. No matching words or counter
  complement may substitute for the explicit link in new records.
- No claim is minted for forge, venue placement or an avatar viewing. Omit claimId
  on those records. Never write present undefined/null as a substitute for absence.
- Snapshot report roots in exactly the current spoken item order, after projection.
  A report with no spoken items has an empty list; other speech omits the key.
- Roots are private causal associations, excluded from SpokenNetworkPayload and
  every actor Observation. They must not change intel, evidence, traits or decisions.
- Capture the association on the actual transient speech before another hop can
  change the message. The chronicle owns another array copy. Never later reconstruct
  a historical item association from the final mutable carried payload.
- Retain existing receipt timestamps and payload copies. Do not add receivedAt
  merely because a destination evidence/intel row uses the observation time.
- Legacy artifact explanations may use their already accepted fallback when the
  exact claim link is absent; explicit mismatches never fall back to matching text.
  Legacy report roots remain unavailable, never guessed from identical items.
- Keep the existing threadOf API speech-only. Full operation threads belong to 5B.
- Extend the two exact artifact record assertions with the exact minted claim id;
  retain toEqual and every prior key. No test deletion, threshold or mechanism change.
- All writes stay in Hearsay. No external/shared-memory writes, push or index access
  for workers. One production writer; root owns scoped local commits.
- Emergent assertions are hypotheses. A failing vehicle must be diagnosed and
  disclosed; never weaken physics. Untraceable suite failure means BLOCKED.
- Final gates: npm test; npm run lint; npm run typecheck; npm run app:build;
  npm run soak; npm run mc. Preserve native output and exact exits. The current
  production floor is 1780 tests/114 files at dc114da, not a future-base guarantee.
