import { describe, expect, it } from 'vitest';
import { TERMS } from '../../src/content/terms';
import { TRAITS } from '../../src/content/traits';
import { PREDICATES } from '../../src/content/predicates';
import { STANDARD_VIGNETTES } from '../../src/content/vignettes';

const CORE_TERMS = [
  'family', 'version', 'diff', 'attribution', 'corroboration', 'apparent-source',
  'credence', 'stance', 'freshness', 'juiciness', 'circle', 'overheard', 'access',
  'bridge', 'firebreak', 'secret', 'discretion', 'witnessed', 'via', 'informant',
  'dossier', 'evidence-board', 'codex', 'lock', 'fingerprint', 'counter-sketch',
  'hypothesis-card', 'assist-level', 'sketch', 'sketch-feature', 'watch',
  'interrogation', 'inquiry', 'authority', 'exposure', 'identified', 'doom-clock',
  'council', 'usurper', 'denounce', 'coronation', 'unmasking', 'objective-topple',
];

describe('no unregistered jargon — the registry covers everything that exists', () => {
  it('core mechanic terms are all registered', () => {
    for (const id of CORE_TERMS) expect(TERMS[id], `missing term '${id}'`).toBeDefined();
  });
  it('every trait has a term (trait-<id>)', () => {
    for (const id of Object.keys(TRAITS)) expect(TERMS[`trait-${id}`], id).toBeDefined();
  });
  it('every predicate has a term (predicate-<id>)', () => {
    for (const id of Object.keys(PREDICATES)) expect(TERMS[`predicate-${id}`], id).toBeDefined();
  });
  it('every vignette term resolves', () => {
    for (const v of STANDARD_VIGNETTES) expect(TERMS[v.term], v.id).toBeDefined();
  });
  it('entries are well-formed: id self-agrees, label non-empty, short <= 120 chars', () => {
    for (const [key, t] of Object.entries(TERMS)) {
      expect(t.id).toBe(key);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.short.length).toBeGreaterThan(0);
      expect(t.short.length).toBeLessThanOrEqual(120);
    }
  });
});
