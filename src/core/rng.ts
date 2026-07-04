/** FNV-1a 32-bit — stable string hash for seeding streams and keyed tie-breaks. */
export function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** splitmix32 — small, fast, deterministic PRNG. One instance per (seed, stream). */
export class Rng {
  private state: number;

  constructor(seed: string, stream: string) {
    this.state = fnv1a32(`${seed} ${stream}`) || 0x9e3779b9;
  }

  nextU32(): number {
    this.state = (this.state + 0x9e3779b9) >>> 0;
    let z = this.state;
    z ^= z >>> 16;
    z = Math.imul(z, 0x21f0aaad);
    z ^= z >>> 15;
    z = Math.imul(z, 0x735a2d97);
    z ^= z >>> 15;
    return z >>> 0;
  }

  /** Uniform in [0, 1). */
  float(): number {
    return this.nextU32() / 0x1_0000_0000;
  }

  /** Uniform integer in [minIncl, maxExcl). */
  int(minIncl: number, maxExcl: number): number {
    return minIncl + Math.floor(this.float() * (maxExcl - minIncl));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    return items[this.int(0, items.length)] as T;
  }

  /** Fisher–Yates on a copy; input untouched. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }
}
