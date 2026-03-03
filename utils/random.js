// ---- RANDOM NUMBER GENERATOR ----
// Seeded random number generator for reproducible map generation

// Create a seeded random number generator
// Returns a function that produces deterministic random numbers based on the seed
export function createRNG(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}