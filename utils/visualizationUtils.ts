
// Mapping to actual hex colors for SVG fills, providing better visuals than Tailwind classes in SVGs.
export const PUZZLE_COLORS = {
  W: '#f8fafc',    // slate-50 (White)
  Y: '#facc15',    // yellow-400
  B: '#2563eb',    // blue-600
  G: '#16a34a',    // green-600
  R: '#dc2626',    // red-600
  O: '#ea580c',    // orange-600
  // Megaminx specific additions
  PK: '#ec4899',    // pink-500
  LB: '#60a5fa',    // blue-400 (Light Blue)
  LG: '#84cc16',    // lime-500 (Light Green)
  PU: '#9333ea',    // purple-600
  CR: '#fefce8',    // yellow-50 (Cream)
  GY: '#64748b',    // slate-500 (Gray)
};

/**
 * Simple hash function to generate a predictable number from a string.
 * Used to seed the pseudo-random color shuffle.
 * @param str The scramble string.
 * @returns A number derived from the string.
 */
export const hashCode = (str: string): number => {
    if (!str || str.length === 0) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

/**
 * A mulberry32 pseudo-random number generator.
 * Creates a deterministic sequence of numbers from a single seed.
 * @param seed The seed number.
 * @returns A function that returns a new random number between 0 and 1 each time it's called.
 */
const mulberry32 = (seed: number) => {
    return () => {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * Creates a pseudo-random number generator seeded by a scramble string.
 * @param scramble The string to seed the PRNG.
 * @returns A function that returns a new random number between 0 and 1 each time it's called.
 */
export const createScramblePrng = (scramble: string): () => number => {
    const seed = hashCode(scramble);
    return mulberry32(seed);
};

/**
 * Shuffles an array deterministically using a provided PRNG.
 * Uses a Fisher-Yates shuffle with the seeded PRNG.
 * @param random A pseudo-random number generator function.
 * @param array The array of items to shuffle.
 * @returns A new array with the items shuffled.
 */
export const shuffleWithPrng = <T>(random: () => number, array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Shuffles an array of colors deterministically based on a scramble string.
 * A convenience wrapper around createScramblePrng and shuffleWithPrng.
 * @param scramble The string to seed the shuffle.
 * @param colorSet The array of colors to shuffle.
 * @returns A new array with the colors shuffled.
 */
export const getShuffledColors = (scramble: string, colorSet: string[]): string[] => {
    if (!scramble) return colorSet;
    const random = createScramblePrng(scramble);
    return shuffleWithPrng(random, colorSet);
};
