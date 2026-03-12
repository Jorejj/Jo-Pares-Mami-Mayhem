// Constants.js – Global configuration values shared across all modules.
// Edit these to tune gameplay without digging into individual class files.

const CONSTANTS = {
  // Canvas
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Game flow
  TARGET_FPS: 60,
  TOTAL_LEVELS: 15,

  // Acts
  ACT_1_LEVELS: [1, 2, 3, 4, 5],
  ACT_2_LEVELS: [6, 7, 8, 9, 10],
  ACT_3_LEVELS: [11, 12, 13, 14, 15],

  // Player
  PLAYER_MAX_HP: 100,
  PLAYER_START_KITA: 0,

  // Difficulty multipliers (applied to enemy HP and speed)
  DIFFICULTY: {
    easy:   { hpMult: 0.75, speedMult: 0.8  },
    medium: { hpMult: 1.00, speedMult: 1.0  },
    hard:   { hpMult: 1.50, speedMult: 1.25 },
  },

  // Wave spawning
  DEFAULT_SPAWN_INTERVAL_MS: 2000,

  // Shop – maximum upgrade level for each weapon
  MAX_WEAPON_LEVEL: 5,

  // Weapon display names
  WEAPON_NAMES: {
    mami:  'MAMI',
    pares: 'PARES',
    cola:  'COLA',
    rice:  'RICE',
  },

  // Projectile launch speed multiplier (scales drag-distance to velocity)
  PROJECTILE_SPEED_MULTIPLIER: 0.4,

  // Currency symbol
  CURRENCY_SYMBOL: '₱',
};
