import { generateTown } from './gen';
import { validateTown } from './validate';
import type { GenConfig, GenContent, GeneratedTown, ValidateOptions, ValidationReport } from './types';

export interface ServeResult {
  town: GeneratedTown;
  attempts: number;
}

/**
 * Spec: "Fail → repair or reroll." v1 rerolls with seed-derived sub-seeds —
 * fully deterministic: the same seed always walks the same attempt sequence.
 */
export function generateValidTown(
  seed: string, config: GenConfig, content: GenContent, opts: ValidateOptions = {},
): ServeResult {
  let last: ValidationReport | null = null;
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const town = generateTown(`${seed}#${attempt}`, config, content);
    const report = validateTown(town, config, opts);
    if (report.ok) return { town, attempts: attempt + 1 };
    last = report;
  }
  const detail = last?.failures.map((f) => `${f.invariant}: ${f.detail}`).join('; ') ?? 'none recorded';
  throw new Error(`generateValidTown: seed '${seed}' exhausted ${config.maxAttempts} attempts (last failures — ${detail})`);
}
