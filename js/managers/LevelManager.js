// LevelManager.js – Controls level progression across the game.
// Each level defines a background, wave configuration, and story.

class LevelManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = 1;
    this.maxLevel = CONSTANTS.TOTAL_LEVELS;
    this.currentDifficulty = null;

    // Level definitions: act, background key, label
    this.levels = [
      { act: 1, bg: 'bg_caloocan', label: 'Caloocan Comeback' },       // Level 1
      { act: 1, bg: 'bg_caloocan', label: 'Caloocan Comeback' },       // Level 2
      { act: 1, bg: 'bg_caloocan', label: 'Caloocan Comeback' },       // Level 3
      { act: 1, bg: 'bg_caloocan', label: 'Caloocan Comeback' },       // Level 4
      { act: 1, bg: 'bg_caloocan', label: 'Boss: Inspector Kap Nino' }, // Level 5
      { act: 2, bg: 'bg_intramuros', label: 'Manila Takeover' },       // Level 6
      { act: 2, bg: 'bg_intramuros', label: 'Manila Takeover' },       // Level 7
      { act: 2, bg: 'bg_quiapo', label: 'Quiapo Run' },                // Level 8
      { act: 2, bg: 'bg_binondo', label: 'Binondo Brawl' },            // Level 9
      { act: 2, bg: 'bg_binondo', label: 'Boss: Vlogger Diwata' },     // Level 10
      { act: 3, bg: 'bg_makati', label: 'Makati Campaign' },           // Level 11
      { act: 3, bg: 'bg_makati', label: 'Makati Campaign' },           // Level 12
      { act: 3, bg: 'bg_makati', label: 'Makati Campaign' },           // Level 13
      { act: 3, bg: 'bg_makati', label: 'Makati Campaign' },           // Level 14
      { act: 3, bg: 'bg_makati', label: 'Boss: The Mastermind' },      // Level 15
    ];
  }

  /**
   * Initialize level manager after game starts.
   */
  init() {
    this.currentLevel = this.game.saveManager.state.currentLevel || 1;
  }

  /**
   * Get current level data.
   * @returns {Object}
   */
  getLevelData() {
    return this.levels[this.currentLevel - 1] || this.levels[0];
  }

  /**
   * Advance to next level.
   */
  advance() {
    if (this.currentLevel < this.maxLevel) {
      this.currentLevel++;
      this.game.saveManager.state.currentLevel = this.currentLevel;
      this.game.saveManager.save();
    }
  }

  /**
   * Update level state each frame.
   * Level-specific logic (cutscenes, transitions) can go here.
   * @param {number} delta
   */
  update(delta) {
    // Sync difficulty from Game state
    if (this.game.currentDifficulty) {
      this.currentDifficulty = this.game.currentDifficulty;
    }
  }

  /**
   * Draw level background on canvas.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const levelData = this.getLevelData();
    const bg = this.game.assetLoader?.images?.[levelData.bg];

    if (bg && bg.complete) {
      ctx.drawImage(bg, 0, 0, this.game.canvas.width, this.game.canvas.height);
    } else {
      // Fallback: draw simple gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, this.game.canvas.height);
      gradient.addColorStop(0, CONSTANTS.COLORS.BACKGROUND);
      gradient.addColorStop(1, '#4a8fad');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

      // Draw gameplay area divider
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

