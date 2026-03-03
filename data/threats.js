// ---- EXTERNAL THREAT TYPES DATA ----
// External threat definitions for the Samhold game
// Each threat type defines combat stats, behavior patterns, and movement characteristics

export const THREAT_TYPES = {
  raiders: {
    name: 'Raiders',
    icon: '🏴‍☠️',
    health: 80, // slightly less than warriors
    combat: 2, // weaker than warriors individually
    movement: 2, // same as warriors
    behavior: 'aggressive', // moves toward settlements
    description: 'Hostile raiders seeking to plunder your settlement.'
  },
  bandits: {
    name: 'Bandits',
    icon: '🗡️',
    health: 60,
    combat: 1,
    movement: 3, // faster but weaker
    behavior: 'opportunistic', // avoids strong defenses
    description: 'Swift bandits looking for easy targets.'
  },
  warband: {
    name: 'Warband',
    icon: '⚔️',
    health: 120,
    combat: 4, // stronger than individual warriors
    movement: 1, // slow but powerful
    behavior: 'relentless', // ignores defenses
    description: 'A powerful warband that fears no resistance.'
  }
};