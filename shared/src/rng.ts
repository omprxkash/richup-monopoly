// A tiny seedable PRNG (mulberry32). Every random draw advances the seed and
// returns the new seed alongside the value, so the whole engine stays pure and
// deterministic — feed the same seed and you get the same game.

export function rngNext(seed: number): { value: number; seed: number } {
  let s = seed | 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: s };
}

export function rollDie(seed: number): { die: number; seed: number } {
  const { value, seed: next } = rngNext(seed);
  return { die: 1 + Math.floor(value * 6), seed: next };
}

export function shuffle<T>(arr: readonly T[], seed: number): { result: T[]; seed: number } {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    const r = rngNext(s);
    s = r.seed;
    const j = Math.floor(r.value * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return { result: a, seed: s };
}
