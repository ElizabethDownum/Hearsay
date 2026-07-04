import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'dist', 'coverage'] },
  ...tseslint.configs.recommended,
  {
    files: [
      'src/core/**/*.ts', 'src/sim/**/*.ts', 'src/content/**/*.ts',
      'src/world/**/*.ts', 'src/bots/**/*.ts', 'src/harness/**/*.ts',
    ],
    rules: {
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random', message: 'Determinism law: use core/rng streams.' },
        { object: 'Date', property: 'now', message: 'Determinism law: sim time comes from core/time ticks.' },
      ],
      'no-restricted-syntax': ['error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'Determinism law: no wall clock in the sim.' },
      ],
    },
  },
  {
    files: [
      'src/sim/**/*.ts', 'src/core/**/*.ts',
      'src/world/**/*.ts', 'src/bots/**/*.ts', 'src/harness/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/content/**'], message: 'Engine/content split: engine code must not import content — inject via Rules/GenContent.' }] }],
    },
  },
  {
    files: ['src/sim/enemy/**/*.ts'],
    rules: {
      // NOTE: flat config's per-file rule merge REPLACES a rule key wholesale when the
      // same key appears in multiple matching blocks — it does not deep-merge the
      // `patterns` array. This block's glob also matches the earlier engine/content-split
      // block (both cover src/sim/**), so the content-ban pattern group MUST be repeated
      // here alongside the no-omniscience group, or it is silently dropped for this subtree.
      'no-restricted-imports': ['error', { patterns: [
        {
          group: [
            '../types', '../world', '../step', '../agents', '../campaign',
            '**/sim/types', '**/sim/world', '**/sim/step', '**/sim/agents', '**/sim/campaign',
          ],
          message: 'No-omniscience law: the enemy consumes evidence + TownMap + Rules, never WorldState.',
        },
        {
          group: ['**/content/**'],
          message: 'Engine/content split: engine code must not import content — inject via Rules/GenContent.',
        },
      ] }],
    },
  },
);
