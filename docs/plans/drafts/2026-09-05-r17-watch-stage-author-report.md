# R17 author report — proposal only

Production remains dc114da. Separate review is open.

## base — native exit 1

```text

 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay

 ❯ .superpowers/sdd/r17-validation/entry.probe.ts (4 tests | 3 failed) 67ms
   × a watch completion belongs to an attempted watch > does not count a pending order as performed attention 10ms
     → expected [ 1 ] to deeply equal []
   × a watch completion belongs to an attempted watch > does not count a deferred order as performed attention 1ms
     → expected [ 1 ] to deeply equal []
   ✓ a watch completion belongs to an attempted watch > still records an attempted watch when the guard physically occupies the post 1ms
   × a watch completion belongs to an attempted watch > the complete first watch window produces one real work report after execution starts 53ms
     → expected [ { id: 'm1', …(14) }, …(1) ] to have a length of 1 but got 2

 Test Files  1 failed (1)
      Tests  3 failed | 1 passed (4)
   Start at  14:55:07
   Duration  1.06s (transform 252ms, setup 0ms, collect 609ms, tests 67ms, environment 0ms, prepare 81ms)

```

## regression — native exit 0

```text

 RUN  v3.2.6 C:/Users/eliza/Desktop/ClaudeFiles/hearsay

 ✓ tests/directives/execution.test.ts (11 tests) 23ms
 ✓ tests/directives/enemy-orders.test.ts (15 tests) 37ms
 ✓ .superpowers/sdd/r17-validation/entry.probe.ts (4 tests) 41ms

 Test Files  3 passed (3)
      Tests  30 passed (30)
   Start at  14:55:09
   Duration  1.04s (transform 382ms, setup 0ms, collect 1.51s, tests 101ms, environment 0ms, prepare 365ms)

```

## preflight — native exit 0

```text
{
  "scope": "R17 watch-stage proposal on virtual R16 only; no implementation",
  "newSourceFiles": 1,
  "tests": 4,
  "tsconfig.json": 0,
  "tsconfig.app.json": 0,
  "lintErrors": 0
}
```

The original duplicate work trace is retained at task-5a2-validation/pre-r17-watch-history.json.
