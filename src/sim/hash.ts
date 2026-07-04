import { fnv1a32 } from '../core/rng';
import type { WorldState } from './types';

/** JSON with recursively sorted object keys — insertion order never leaks into the hash. */
export function stableStringify(value: unknown): string {
  // undefined has no JSON form and would silently skew the hash — fail loudly instead.
  if (value === undefined) throw new Error('stableStringify: undefined is not serializable (model absence as null)');
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

export function hashWorld(world: WorldState): number {
  return fnv1a32(stableStringify(world));
}
