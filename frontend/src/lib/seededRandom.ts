/**
 * Generador pseudoaleatorio con semilla. Permite que los datos simulados sean
 * deterministas: el mismo día (y usuario) produce siempre los mismos resultados,
 * así el dashboard no cambia al recargar la página.
 */
export type RandomFn = () => number;

/** Hash de 32 bits (cyrb53 reducido) para convertir un texto en semilla numérica. */
export function hashSeed(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 ^ h1) >>> 0;
}

/** Mulberry32: pequeño, rápido y suficiente para simulaciones visuales. */
export function createSeededRandom(seed: string | number): RandomFn {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(random: RandomFn, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/** Fisher-Yates con el generador indicado; no modifica el arreglo original. */
export function shuffle<T>(items: readonly T[], random: RandomFn): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex] as T, copy[index] as T];
  }
  return copy;
}
