// Ambient shim for `process.env`, scoped to the soak harness's env-var override
// (SOAK_SEEDS). The brief calls for "no new dependencies" — this avoids adding
// @types/node (not installed; tsconfig's "types" is deliberately narrowed to
// ["vitest/globals"]) just to type one lookup.
declare const process: { env: Record<string, string | undefined> };
