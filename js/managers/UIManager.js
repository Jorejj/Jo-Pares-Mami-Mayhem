// UIManager.js – Renders all UI elements based on current game state.
// Handles FSM state rendering: Main Menu, Difficulty Select, Prologue, Arsenal Select,Playing HUD, Victory, Shop, Game Over.

class UIManager {
  constructor(game) {
    this.game = game;
    this.prologueIndex = 0;
    this.prologueTimer = 0;
  }

  /**
   * Update UI state each frame.
   * - Advance prologue text on timer
   * @param {number} delta
   */
  update(delta) {
    if (this.game.currentState === CONSTANTS.STATES.PROLOGUE) {
      this.prologueTimer += delta;
      if (this.prologueTimer > 3000) { // Auto-advance every 3 seconds
        this.prologueIndex++;
        this.prologueTimer = 0;
      }
    }
  }

  /**
   * Main draw dispatcher based on current game state.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const state = this.game.currentState;

    switch (state) {
      case CONSTANTS.STATES.MAIN_MENU:
        this._drawMainMenu(ctx);
        break;
      case CONSTANTS.STATES.DIFFICULTY_SELECT:
        this._drawDifficultySelect(ctx);
        break;
      case CONSTANTS.STATES.PROLOGUE:
        this._drawPrologue(ctx);
        break;
      case CONSTANTS.STATES.ARSENAL_SELECT:
        this._drawArsenalSelect(ctx);
        break;
      case CONSTANTS.STATES.PLAYING:
        this._drawPlayingHUD(ctx);
        break;
      case CONSTANTS.STATES.VICTORY:
        this._drawVictory(ctx);
        break;
      case CONSTANTS.STATES.SHOP:
        this._drawShop(ctx);
        break;
      case CONSTANTS.STATES.GAMEOVER:
        this._drawGameOver(ctx);
        break;
    }
  }

  /**
   * Draw main menu screen.
   * @private
   */
  _drawMainMenu(ctx) {
    ctx.fillStyle = CONSTANTS.COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    ctx.fillStyle = CONSTANTS.COLORS.TEXT;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("JO'S PARES MAMI: MAYHEM", this.game.canvas.width / 2, 100);

    ctx.font = '28px Arial';
    ctx.fillText('[1] NEW GAME', this.game.canvas.width / 2, 200);
    ctx.fillText('[2] LOAD GAME', this.game.canvas.width / 2, 270);
    ctx.fillText('[3] QUIT', this.game.canvas.width / 2, 340);

    ctx.font = '16px Arial';
    ctx.fillStyle = '#999';
    ctx.fillText('Use keyboard numpad to select', this.game.canvas.width / 2, this.game.canvas.height - 40);
  }

  /**
   * Draw difficulty select screen.
   * @private
   */
  _drawDifficultySelect(ctx) {
    ctx.fillStyle = CONSTANTS.COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    ctx.fillStyle = CONSTANTS.COLORS.TEXT;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT DIFFICULTY', this.game.canvas.width / 2, 100);

    ctx.font = '28px Arial';
    ctx.fillText('[E] EASY', this.game.canvas.width / 2, 200);
    ctx.fillText('[M] MEDIUM', this.game.canvas.width / 2, 270);
    ctx.fillText('[H] HARD', this.game.canvas.width / 2, 340);

    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFD700';
    const diffText = this.game.currentDifficulty 
      ? `Current: ${this.game.currentDifficulty.label}`
      : 'Current: None';
    ctx.fillText(diffText, this.game.canvas.width / 2, this.game.canvas.height - 40);
  }

  /**
   * Draw prologue narrative screen.
   * @private
   */
  _drawPrologue(ctx) {
    ctx.fillStyle = CONSTANTS.COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;

    const lines = CONSTANTS.PROLOGUE_LINES;
    if (this.prologueIndex >= lines.length) {
      ctx.fillText('---END OF PROLOGUE---', this.game.canvas.width / 2, this.game.canvas.height / 2);
      return;
    }

    const text = lines[this.prologueIndex] || '';
    const maxWidth = this.game.canvas.width - 40;
    const words = text.split(' ');
    let line = '';
    let y = this.game.canvas.height / 2 - 60;

    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, this.game.canvas.width / 2, y);
        line = word + ' ';
        y += 40;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, this.game.canvas.width / 2, y);
    }

    ctx.font = '18px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('Press [SPACE] or Click to continue...', this.game.canvas.width / 2, this.game.canvas.height - 50);
  }

  /**
   * Draw arsenal selection screen.
   * @private
   */
  _drawArsenalSelect(ctx) {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${this.game.waveManager.currentWave}: SELECT ARSENAL`, 
                  this.game.canvas.width / 2, 60);

    ctx.font = '20px Arial';
    ctx.textAlign = 'left';

    const weaponList = [
      { key: 'mami', num: '1' },
      { key: 'pares', num: '2' },
      { key: 'rice', num: '3' }
    ];

    let y = 150;
    for (const w of weaponList) {
      const weapon = this.game.player.arsenal[w.key];
      const isSelected = this.game.player.selectedWeapon === w.key;
      const status = weapon.unlocked ? 'Unlocked' : 'Locked';
      const weaponName = w.key.charAt(0).toUpperCase() + w.key.slice(1);

      ctx.fillStyle = isSelected ? CONSTANTS.COLORS.TEXT_GREEN : 
                     (weapon.unlocked ? '#fff' : '#888');
      ctx.fillText(`[${w.num}] ${weaponName} (${status}) - Lvl: ${weapon.level} Dmg: ${weapon.damage}`, 50, y);
      y += 60;
    }

    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = CONSTANTS.COLORS.TEXT_GOLD;
    ctx.fillText('Press [ENTER] to START PLAYING', this.game.canvas.width / 2, this.game.canvas.height - 40);
  }

  /**
   * Draw in-game playing HUD.
   * @private
   */
  _drawPlayingHUD(ctx) {
    // Top-left stats
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`JO HP: ${this.game.player.hp}/${this.game.player.maxHp}`, 10, 25);
    ctx.fillText(`KITA: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, 10, 50);
    ctx.fillText(`WAVE: ${this.game.waveManager.currentWave}`, 10, 75);
    ctx.fillText(`KILLS: ${this.game.waveManager.killCount}/${CONSTANTS.WAVE_1_REQUIRED_KILLS}`, 10, 100);

    // Top-center location
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('CALOOCAN - MONUMENTO', this.game.canvas.width / 2, 30);

    // Bottom center weapon status bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, this.game.canvas.height - 50, this.game.canvas.width, 50);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    const weapon = this.game.player.arsenal[this.game.player.selectedWeapon];
    const cooldownPercent = this.game.player.getWeaponCooldownPercent(this.game.player.selectedWeapon);
    const weaponStatus = cooldownPercent >= 100 ? 'READY TO FIRE' : `COOLDOWN: ${Math.ceil((100 - cooldownPercent))}%`;
    const weaponName = this.game.player.selectedWeapon.toUpperCase();

    ctx.fillText(`[EQUIPPED: ${weaponName}] | [STATUS: ${weaponStatus}]`, 
                  this.game.canvas.width / 2, this.game.canvas.height - 20);

    // Draw weapon tray at bottom
    this._drawWeaponTray(ctx);
  }

  /**
   * Draw weapon tray showing available weapons.
   * @private
   */
  _drawWeaponTray(ctx) {
    const weapons = ['mami', 'pares', 'rice'];
    const trayY = this.game.canvas.height - 150;
    const slotSize = 80;
    const gap = 10;
    const totalWidth = weapons.length * (slotSize + gap) - gap;
    const startX = (this.game.canvas.width - totalWidth) / 2;

    weapons.forEach((weapon, i) => {
      const x = startX + i * (slotSize + gap);
      const isSelected = this.game.player.selectedWeapon === weapon;
      const weaponData = this.game.player.arsenal[weapon];

      // Slot background
      ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x, trayY, slotSize, slotSize);

      ctx.strokeStyle = isSelected ? CONSTANTS.COLORS.TEXT_GOLD : '#888888';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(x, trayY, slotSize, slotSize);

      // Weapon label
      ctx.fillStyle = weaponData.unlocked ? '#fff' : '#666';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(weapon.toUpperCase(), x + slotSize / 2, trayY + 20);

      ctx.font = '11px monospace';
      ctx.fillText(`LVL ${weaponData.level}`, x + slotSize / 2, trayY + 40);
      ctx.fillText(`${weaponData.damage}DMG`, x + slotSize / 2, trayY + slotSize - 8);
      ctx.textAlign = 'left';
    });
  }

  /**
   * Draw victory screen.
   * @private
   */
  _drawVictory(ctx) {
    ctx.fillStyle = CONSTANTS.COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WAVE CLEARED!', this.game.canvas.width / 2, 150);

    ctx.font = '28px Arial';
    ctx.fillText(`KITA EARNED: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, 
                  this.game.canvas.width / 2, 250);
    ctx.fillText('Press [ENTER] to visit the Shop', this.game.canvas.width / 2, 350);
  }

  /**
   * Draw shop screen.
   * @private
   */
  _drawShop(ctx) {
    this.game.shopManager.draw(ctx);
  }

  /**
   * Draw game over screen.
   * @private
   */
  _drawGameOver(ctx) {
    ctx.fillStyle = CONSTANTS.COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.game.canvas.width / 2, 150);

    ctx.font = '24px Arial';
    ctx.fillText(`Final Kita: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, 
                 this.game.canvas.width / 2, 250);
    ctx.fillText('Press [R] to Restart', this.game.canvas.width / 2, 350);
  }
}

