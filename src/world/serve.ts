import { generateTown } from './gen';
import { validateTown } from './validate';
import type { GenConfig, GenContent, GeneratedTown, ValidateOptions, ValidationReport } from './types';
import type { Rules } from '../sim/rules';

export interface ServeResult {
  town: GeneratedTown;
  attempts: number;
}

/**
 * Spec: "Fail → repair or reroll." v1 rerolls with seed-derived sub-seeds —
 * fully deterministic: the same seed always walks the same attempt sequence.
 *
 * Rules is required here (unlike validateTown's optional opts): the serve boundary is the
 * production path, so knownTraitIds/knownPredicateIds are always derived from Rules, never
 * left to slip through unset. opts may still override either set explicitly.
 */
export function generateValidTown(
  seed: string, config: GenConfig, content: GenContent, rules: Rules, opts: ValidateOptions = {},
): ServeResult {
  const merged: ValidateOptions = {
    knownTraitIds: opts.knownTraitIds ?? Object.keys(rules.traits),
    knownPredicateIds: opts.knownPredicateIds ?? Object.keys(rules.predicates),
  };
  let last: ValidationReport | null = null;
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const town = generateTown(`${seed}#${attempt}`, config, content);
    const report = validateTown(town, config, merged);
    if (report.ok) return { town, attempts: attempt + 1 };
    last = report;
  }
  const detail = last?.failures.map((f) => `${f.invariant}: ${f.detail}`).join('; ') ?? 'none recorded';
  throw new Error(`generateValidTown: seed '${seed}' exhausted ${config.maxAttempts} attempts (last failures — ${detail})`);
}
