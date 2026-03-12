// LevelManager.js – Controls level progression across all three Acts.
// Each level defines a background, enemy wave configuration, and boss encounter.

class LevelManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = 1;
    this.maxLevel = 15;

    // Level definitions: act, background key, label
    this.levels = [
      { act: 1, bg: 'bg_caloocan', label: 'Caloocan Comeback' },   // Level 1
      { act: 1, bg: 'bg_caloocan', label: 'Caloocan Comeback' },   // Level 2
      { act: 1, bg: 'bg_caloocan', label: 'Caloocan Comeback' },   // Level 3
      { act: 1, bg: 'bg_caloocan', label: 'Caloocan Comeback' },   // Level 4
      { act: 1, bg: 'bg_caloocan', label: 'Boss: Inspector Kap Nino' }, // Level 5
      { act: 2, bg: 'bg_intramuros', label: 'Manila Takeover' },   // Level 6
      { act: 2, bg: 'bg_intramuros', label: 'Manila Takeover' },   // Level 7
      { act: 2, bg: 'bg_quiapo', label: 'Quiapo Run' },            // Level 8
      { act: 2, bg: 'bg_binondo', label: 'Binondo Brawl' },        // Level 9
      { act: 2, bg: 'bg_binondo', label: 'Boss: Vlogger Diwata' }, // Level 10
      { act: 3, bg: 'bg_makati', label: 'Makati Campaign' },       // Level 11
      { act: 3, bg: 'bg_makati', label: 'Makati Campaign' },       // Level 12
      { act: 3, bg: 'bg_makati', label: 'Makati Campaign' },       // Level 13
      { act: 3, bg: 'bg_makati', label: 'Makati Campaign' },       // Level 14
      { act: 3, bg: 'bg_makati', label: 'Boss: The Mastermind' },  // Level 15
    ];
  }

  init() {
    this.currentLevel = this.game.saveManager.state.currentLevel;
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
    // Level-specific update logic (cutscenes, transitions) goes here
  }

  draw(ctx) {
    const levelData = this.getLevelData();
    const bg = this.game.assetLoader.images[levelData.bg];
    if (bg && bg.complete) {
      ctx.drawImage(bg, 0, 0, this.game.canvas.width, this.game.canvas.height);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    }
  }
}
