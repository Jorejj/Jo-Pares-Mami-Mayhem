// ShopManager.js – Handles the in-game upgrade shop.
// Players spend Kita to unlock and upgrade Mami, Pares, and Rice projectiles.

class ShopManager {
  constructor(game) {
    this.game = game;
    this.isOpen = false;

    // Button layout for weapon upgrade display
    this.buttons = [
      { name: 'mami',  x: this.game.canvas.width / 2 - 350, y: 200, width: 700, height: 90 },
      { name: 'pares', x: this.game.canvas.width / 2 - 350, y: 320, width: 700, height: 90 },
      { name: 'rice',  x: this.game.canvas.width / 2 - 350, y: 440, width: 700, height: 90 }
    ];
  }

  /**
   * Open the shop.
   */
  open() {
    this.isOpen = true;
  }

  /**
   * Close the shop.
   */
  close() {
    this.isOpen = false;
  }

  /**
   * Toggle shop open/closed.
   */
  toggle() {
    this.isOpen = !this.isOpen;
  }

  /**
   * Unlock a weapon if affordable.
   * @param {string} weaponName
   * @returns {boolean} - True if unlock successful
   */
  unlockWeapon(weaponName) {
    return this.game.player.unlockWeapon(weaponName);
  }

  /**
   * Upgrade a weapon level if affordable.
   * @param {string} weaponName
   * @returns {boolean} - True if upgrade successful
   */
  upgradeWeapon(weaponName) {
    return this.game.player.upgradeWeapon(weaponName);
  }

  /**
   * Handle weapon button click (1, 2, or 3 key).
   * If locked: unlock weapon
   * If unlocked: upgrade weapon
   * @param {number} buttonNum - Button number (1, 2, or 3)
   * @returns {boolean}
   */
  handleWeaponSelection(buttonNum) {
    const weaponKey = buttonNum === 1 ? 'mami' : (buttonNum === 2 ? 'pares' : 'rice');
    const weapon = this.game.player.arsenal[weaponKey];

    if (!weapon.unlocked) {
      return this.unlockWeapon(weaponKey);
    } else {
      return this.upgradeWeapon(weaponKey);
    }
  }

  /**
   * Get upgrade cost for a weapon.
   * Cost = 50 * (1.5 ^ (level - 1))
   * @param {string} weaponName
   * @returns {number}
   */
  getUpgradeCost(weaponName) {
    const weapon = this.game.player.arsenal[weaponName];
    if (!weapon || weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL) return Infinity;

    const costMultiplier = Math.pow(CONSTANTS.WEAPON_UPGRADE_COST_MULTIPLIER, weapon.level);
    return Math.ceil(50 * costMultiplier);
  }

  /**
   * Update shop state.
   * Handles click detection for buttons if needed.
   * @param {number} delta
   */
  update(delta) {
    if (!this.isOpen) return;

    // Handle keyboard input (1, 2, 3) via Player.js input binding
  }

  /**
   * Draw shop UI on canvas in a comic book style.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.isOpen || !this.game.player) return;

    // Use UIManager's sunburst effect
    if (this.game.uiManager) {
      this.game.uiManager._drawSunburst(ctx, '#e67e22', '#d35400');
    } else {
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
    }

    // Title (Comic text)
    if (this.game.uiManager) {
      this.game.uiManager._drawComicText(ctx, '⚒️ LADLE UPGRADE SHOP ⚒️', this.game.canvas.width / 2, 70, 48, '#f1c40f');
    }

    // Kita Banner
    if (this.game.uiManager) {
      this.game.uiManager._drawComicBox(ctx, this.game.canvas.width / 2 - 150, 110, 300, 40, '#fff');
    }
    ctx.font = 'bold 20px "Comic Sans MS", "Impact", sans-serif';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`KITA: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, this.game.canvas.width / 2, 130);

    // Draw each weapon button
    this.buttons.forEach((btn, index) => {
      const weapon = this.game.player.arsenal[btn.name];
      const unlockCost = weapon.baseCost;
      const upgradeCost = this.getUpgradeCost(btn.name);
      const canAfford = weapon.unlocked 
        ? this.game.player.kita >= upgradeCost
        : this.game.player.kita >= unlockCost;
      const isUnlocked = weapon.unlocked;
      const isMaxLevel = weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL;

      // Button background logic
      let bgColor = '#ecf0f1'; // default unlocked
      if (!isUnlocked) bgColor = '#bdc3c7'; // locked
      if (canAfford && !isMaxLevel) bgColor = '#2ecc71'; // affordable

      if (this.game.uiManager) {
        this.game.uiManager._drawComicBox(ctx, btn.x, btn.y, btn.width, btn.height, bgColor);
      }

      // Weapon name and key
      ctx.fillStyle = '#000';
      ctx.font = '900 28px "Comic Sans MS", "Impact", sans-serif';
      ctx.textAlign = 'left';
      const weaponDisplayName = `[${index + 1}] ` + btn.name.toUpperCase();
      ctx.fillText(weaponDisplayName, btn.x + 20, btn.y + 30);

      // Weapon status and damage
      ctx.font = 'bold 20px "Comic Sans MS", "Impact", sans-serif';
      if (isUnlocked) {
        ctx.fillStyle = '#27ae60';
        ctx.fillText(`LVL: ${weapon.level} | DMG: ${weapon.damage}`, btn.x + 20, btn.y + 65);

        ctx.textAlign = 'right';
        if (isMaxLevel) {
          ctx.fillStyle = '#f39c12';
          ctx.fillText('MAX LEVEL!', btn.x + btn.width - 20, btn.y + 45);
        } else {
          ctx.fillStyle = canAfford ? '#27ae60' : '#c0392b';
          ctx.fillText(`UPGRADE: ${CONSTANTS.CURRENCY_SYMBOL}${upgradeCost}`, btn.x + btn.width - 20, btn.y + 45);
        }
      } else {
        ctx.fillStyle = '#f39c12';
        ctx.fillText(`BASE DMG: ${weapon.damage}`, btn.x + 20, btn.y + 65);
        ctx.textAlign = 'right';
        ctx.fillStyle = canAfford ? '#27ae60' : '#c0392b';
        ctx.fillText(`UNLOCK: ${CONSTANTS.CURRENCY_SYMBOL}${unlockCost}`, btn.x + btn.width - 20, btn.y + 45);
      }
    });

    // Instructions
    if (this.game.uiManager) {
      this.game.uiManager._drawComicBox(ctx, this.game.canvas.width / 2 - 250, this.game.canvas.height - 70, 500, 45, '#fff');
    }
    ctx.fillStyle = '#000';
    ctx.font = 'bold 18px "Comic Sans MS", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS [1], [2], OR [3] TO BUY | PRESS [ENTER] TO CONTINUE', 
                  this.game.canvas.width / 2, this.game.canvas.height - 48);
                  
    ctx.textBaseline = 'alphabetic'; // Reset
  }
}
