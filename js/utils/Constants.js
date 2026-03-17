// Constants.js – Global configuration values shared across all modules.
// Merged from Case Study (gameplay logic) + Jo-Pares-Mami-Mayhem (architecture)

const CONSTANTS = {
  // ===== CANVAS & DISPLAY =====
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  TARGET_FPS: 60,
  FRAME_TIME: 1000 / 60,

  // ===== GAME STATES (FSM) =====
  STATES: {
    MAIN_MENU: 'MAIN_MENU',
    DIFFICULTY_SELECT: 'DIFFICULTY_SELECT',
    PROLOGUE: 'PROLOGUE',
    ARSENAL_SELECT: 'ARSENAL_SELECT',
    PLAYING: 'PLAYING',
    VICTORY: 'VICTORY',
    SHOP: 'SHOP',
    GAMEOVER: 'GAMEOVER'
  },

  // ===== DIFFICULTY SETTINGS =====
  DIFFICULTY: {
    easy:   { hpMult: 0.75, speedMult: 0.8,  label: 'EASY' },
    medium: { hpMult: 1.00, speedMult: 1.0,  label: 'MEDIUM' },
    hard:   { hpMult: 1.50, speedMult: 1.25, label: 'HARD' },
  },

  // ===== LEVEL PROGRESSION =====
  TOTAL_LEVELS: 15,
  ACT_1_LEVELS: [1, 2, 3, 4, 5],
  ACT_2_LEVELS: [6, 7, 8, 9, 10],
  ACT_3_LEVELS: [11, 12, 13, 14, 15],

  // ===== PLAYER (JO) =====
  PLAYER_MAX_HP: 100,
  PLAYER_START_KITA: 0,
  PLAYER_X: 80,
  PLAYER_WIDTH: 60,
  PLAYER_HEIGHT: 80,
  PLAYER_ATTACK_RANGE: 80,
  PLAYER_DAMAGE_ON_HIT: 10, // Damage player takes when enemy touches
  GAME_BOTTOM_HALF: 360, // Y coordinate dividing top (menu) from bottom (gameplay)

  // ===== WEAPONS & ARSENAL =====
  WEAPON_NAMES: {
    mami:  'Mami',
    pares: 'Pares',
    rice:  'Rice',
  },
  
  WEAPON_STATS: {
    mami: {
      unlocked: true,
      baseDamage: 25,
      cooldown: 0,
      unlockCost: 0,
      projectileSpeed: 8
    },
    pares: {
      unlocked: false,
      baseDamage: 40,
      cooldown: 1000,
      unlockCost: 150,
      projectileSpeed: 6
    },
    rice: {
      unlocked: false,
      baseDamage: 15,
      cooldown: 500,
      unlockCost: 100,
      projectileSpeed: 10
    },
  },

  MAX_WEAPON_LEVEL: 5,
  WEAPON_UPGRADE_COST_MULTIPLIER: 1.5, // Cost increases by this factor per level

  // ===== SPECIAL ABILITIES (KEY 4 & 5) =====
  SPECIALS: {
    calamansi: {
      key: '4',
      name: 'Calamansi',
      cooldown: 3000,
      unlockCost: 150,
      effect: 'slow', // Slows all enemies
      slowDuration: 3000,
      slowFactor: 0.5
    },
    chili: {
      key: '5',
      name: 'Chili',
      cooldown: 5000,
      unlockCost: 200,
      effect: 'burn', // Burns all enemies
      burnDuration: 2000,
      burnDamagePerTick: 2
    }
  },

  // ===== PROJECTILE BEHAVIOR =====
  PROJECTILE_SPEED_MULTIPLIER: 0.1, // Drag distance to velocity scale
  TRAJECTORY_FRAMES: 40, // Preview frames for drag trajectory

  // ===== ENEMY CONSTANTS =====
  ENEMY_WIDTH: 25,
  ENEMY_HEIGHT: 35,
  ENEMY_BASE_SPEED: 2,
  ENEMY_BASE_HP: 30,
  ENEMY_SPAWN_INTERVAL: 1500, // ms between spawns per wave
  ENEMY_ATTACK_COOLDOWN: 500,
  ENEMY_ATTACK_RANGE: 80,
  ENEMY_KITA_REWARD: 20,

  // ===== WAVE & LEVEL PROGRESSION =====
  WAVE_1_REQUIRED_KILLS: 5,
  DEFAULT_SPAWN_INTERVAL_MS: 1500,

  // ===== SHOP & ECONOMY =====
  CURRENCY_SYMBOL: '₱',

  // ===== COLORS =====
  COLORS: {
    PLAYER: '#0000FF',
    ENEMY: '#FF0000',
    PROJECTILE_MAMI: '#FFFF00',
    PROJECTILE_PARES: '#FFA500',
    PROJECTILE_RICE: '#FFFFFF',
    BACKGROUND: '#87CEEB',
    UI_BG: 'rgba(0, 0, 0, 0.8)',
    TEXT: '#FFFFFF',
    TEXT_GOLD: '#FFD700',
    TEXT_GREEN: '#00FF00',
    TEXT_RED: '#FF6666'
  },

  // ===== PROLOGUE STORY =====
  PROLOGUE_LINES: [
    "Jo and his father ran the legendary paresan in Caloocan, famous for sabaw that could cure heartbreak.",
    "But a jealous inspector and a clout-chasing vlogger filmed a fake video claiming the secret was 'magic'.",
    "The viral outcry shut them down. Jo's father hung up his apron, truly heartbroken.",
    "But Jo grabbed his heavy-duty ladle and swore to cook his way back to the top!",
    "He trained day and night, mastering the art of the perfect broth and the crispiest garlic.",
    "Armed with his trusty cart and a stash of secret ingredients, he set out to clear his family name.",
    "From the streets of Monumento to the heart of Intramuros, no one will stand in his way!",
    "It's time to show the city that Jo's Pares is the real deal. Let the mayhem begin!"
  ],

  // ===== PHYSICS =====
  GRAVITY: 0.5,
};
