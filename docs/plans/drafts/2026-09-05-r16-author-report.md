# R16 author report — proposal only

The exact two-file proposal changes one evaluator clause and adds ten tests.
Production source remains dc114da. Independent plan review is still required.

Raw native evidence (under .superpowers/sdd/r16-validation):

## base-readable

```text

 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay

 ❯ .superpowers/sdd/r16-validation/entry.probe.ts (10 tests | 3 failed) 48ms
   × expected presence uses an actor’s own location without inventing a self observation > 'self is present at the supplied local…' 5ms
     → expected 'hold' to be 'observe' // Object.is equality
   ✓ expected presence uses an actor’s own location without inventing a self observation > 'another person still requires an obse…' 0ms
   ✓ expected presence uses an actor’s own location without inventing a self observation > 'an actually observed other person sat…' 0ms
   ✓ expected presence uses an actor’s own location without inventing a self observation > 'future guidance is not prematurely tr…' 0ms
   ✓ expected presence uses an actor’s own location without inventing a self observation > 'advisory at a different venue keeps i…' 0ms
   ✓ expected presence uses an actor’s own location without inventing a self observation > 'self presence cannot override an avoi…' 0ms
   ✓ expected presence uses an actor’s own location without inventing a self observation > 'self presence cannot override a not-b…' 0ms
   ✓ expected presence uses an actor’s own location without inventing a self observation > 'self presence cannot override a not-a…' 0ms
   × expected presence uses an actor’s own location without inventing a self observation > self guidance has the same eight-dimensional decision as no contradiction, and the input remains pure 3ms
     → expected { interpretation: { …(2) }, …(7) } to deeply equal { interpretation: { …(2) }, …(7) }
   × expected presence uses an actor’s own location without inventing a self observation > the standard authored watch actually works through the full tick loop without removing its guidance 39ms
     → expected [] to include 1

 Test Files  1 failed (1)
      Tests  3 failed | 7 passed (10)
   Start at  14:33:48
   Duration  918ms (transform 217ms, setup 0ms, collect 516ms, tests 48ms, environment 0ms, prepare 79ms)

```

## regression

```text

 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay

 ✓ tests/directives/evaluator.test.ts (14 tests) 7ms
 ✓ tests/directives/enemy-orders.test.ts (15 tests) 33ms
 ✓ .superpowers/sdd/r16-validation/entry.probe.ts (10 tests) 60ms

 Test Files  3 passed (3)
      Tests  39 passed (39)
   Start at  14:33:46
   Duration  848ms (transform 357ms, setup 0ms, collect 1.14s, tests 100ms, environment 0ms, prepare 236ms)

```

## preflight

```text
{
  "scope": "R16 one-clause evaluator proposal only; no implementation",
  "newSourceFiles": 1,
  "tests": 10,
  "tsconfig.json": 0,
  "tsconfig.app.json": 0,
  "lintErrors": 0
}
```

## default-watch-control

```text
{
  "scope": "same full-loop fixture and actual unchanged outcome-report policy; only self-presence advisory removed",
  "authoredAtWork": {
    "state": "deferred",
    "changedAt": 2580,
    "dueAt": null,
    "waiting": null
  },
  "withoutSelfGuidanceAtWork": {
    "state": "attempted",
    "changedAt": 2430,
    "dueAt": null,
    "waiting": null,
    "workedDays": [
      1
    ]
  }
}
```

The authoring vehicle loads the exact proposal in memory. It does not edit
src/tests or certify a game build. Original unsuccessful fixture/config-loader logs
remain alongside corrected runs. The default-policy control corrects the earlier
loose “standard full-report” description. No game policy was changed to pass it.
