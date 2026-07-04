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
      'no-restricted-imports': ['error', { patterns: [{
        group: [
          '../types', '../world', '../step', '../agents', '../campaign',
          '**/sim/types', '**/sim/world', '**/sim/step', '**/sim/agents', '**/sim/campaign',
        ],
        message: 'No-omniscience law: the enemy consumes evidence + TownMap + Rules, never WorldState.',
      }] }],
    },
  },
);
