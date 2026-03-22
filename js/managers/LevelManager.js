// LevelManager.js – Controls level progression across the game.
// Each level defines a background, wave configuration, and story.

class LevelManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = 1;
    this.maxLevel = CONSTANTS.TOTAL_LEVELS; // Make sure this is 15 in Constants!
    this.currentDifficulty = null;

    // --- NEW: THE GRAND 3-CITY CAMPAIGN ---
    this.levels = [
      // ACT 1: CALOOCAN (The Industrial Start)
      { act: 1, bg: 'bg_monumento',     label: 'Monumento (Area 1)',        bgm: 'bgm_traffic' },
      { act: 1, bg: 'bg_sangandaan',    label: 'Sangandaan Market',         bgm: 'bgm_vendors' },
      { act: 1, bg: 'bg_bagong_barrio', label: 'Bagong Barrio',             bgm: 'bgm_street'  },
      { act: 1, bg: 'bg_c3',            label: 'C-3 Road',                  bgm: 'bgm_traffic' },
      { act: 1, bg: 'bg_bagumbong',     label: 'Boss: Kap Nino',            bgm: 'bgm_kap_background'   },

      // ACT 2: MANILA (The Historical Core)
      { act: 2, bg: 'bg_intramuros',    label: 'Intramuros (Area 1)',       bgm: 'bgm_people'  },
      { act: 2, bg: 'bg_quiapo',        label: 'Quiapo Mayhem',             bgm: 'bgm_vendors' },
      { act: 2, bg: 'bg_chinatown',     label: 'Binondo Food Trip',         bgm: 'bgm_street'  },
      { act: 2, bg: 'bg_luneta',        label: 'Rizal Park (Luneta)',       bgm: 'bgm_people'  },
      { act: 2, bg: 'bg_baywalk',       label: 'Boss: Vlogger Ian',         bgm: 'bgm_ian_background'   },

      // ACT 3: MAKATI (The Corporate Jungle)
      { act: 3, bg: 'bg_ayalaAvenue',   label: 'Ayala Avenue (Area 1)',     bgm: 'bgm_makati'  },
      { act: 3, bg: 'bg_poblacion',     label: 'Poblacion Party',           bgm: 'bgm_people'  },
      { act: 3, bg: 'bg_legazpi',       label: 'Legazpi Village',           bgm: 'bgm_makati'  },
      { act: 3, bg: 'bg_guadalupe',     label: 'Guadalupe Bridge',          bgm: 'bgm_traffic' },
      { act: 3, bg: 'bg_malacanang',    label: 'Final Boss: The Mastermind',bgm: 'bgm_malupiton_background'   },
    ];
  }

  init() {
    this.currentLevel = this.game.saveManager.state.currentLevel || 1;
  }

  getLevelData() {
    return this.levels[this.currentLevel - 1] || this.levels[0];
  }

  advance() {
    if (this.currentLevel < this.maxLevel) {
      this.currentLevel++;
      this.game.saveManager.state.currentLevel = this.currentLevel;
      this.game.saveManager.save();
    }
  }

  update(delta) {
    if (this.game.currentDifficulty) {
      this.currentDifficulty = this.game.currentDifficulty;
    }
  }

  draw(ctx) {
    const levelData = this.getLevelData();
    const bg = this.game.assetLoader?.images?.[levelData.bg];

    if (bg && bg.complete) {
      ctx.drawImage(bg, 0, 0, this.game.canvas.width, this.game.canvas.height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, this.game.canvas.height);
      gradient.addColorStop(0, CONSTANTS.COLORS.BACKGROUND);
      gradient.addColorStop(1, '#4a8fad');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, CONSTANTS.GAME_BOTTOM_HALF, this.game.canvas.width, CONSTANTS.GAME_BOTTOM_HALF);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(0, CONSTANTS.GAME_BOTTOM_HALF);
      ctx.lineTo(this.game.canvas.width, CONSTANTS.GAME_BOTTOM_HALF);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
