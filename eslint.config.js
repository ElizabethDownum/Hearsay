import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'dist', 'coverage'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts', 'src/sim/**/*.ts', 'src/content/**/*.ts'],
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
);
