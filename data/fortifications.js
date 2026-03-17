// ---- FORTIFICATION DATA ----
// Fortification type definitions for hex-edge defenses

export const FORTIFICATIONS = {
  palisade: {
    name: 'Palisade', icon: '🪵',
    cost: { materials: 4 }, buildTurns: 1, buildWorkers: 1,
    health: 40, defenseBonus: 1,
    color: '#8B6914', lineWidth: 4,
    description: 'A quick wooden barrier. Blocks movement through this edge.'
  },
  wall: {
    name: 'Stone Wall', icon: '🧱',
    cost: { materials: 10 }, buildTurns: 3, buildWorkers: 1,
    health: 120, defenseBonus: 3,
    upgradeFrom: 'palisade', upgradeCost: { materials: 6 },
    color: '#c8c8c8', lineWidth: 6,
    description: 'A sturdy stone wall. Very strong against attackers.'
  },
  gate: {
    name: 'Gate', icon: '🚪',
    cost: { materials: 8 }, buildTurns: 2, buildWorkers: 1,
    health: 60, defenseBonus: 1,
    color: '#8B6914', lineWidth: 4, gapRatio: 0.3,
    description: 'Allows friendly units through. Blocks enemies.'
  }
};

export const WALL_INSET = 0.90; // radius factor: inset inside hex edge (owner-based rendering)
