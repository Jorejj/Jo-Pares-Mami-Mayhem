// ShopManager.js – Handles the in-game upgrade shop.
// Players spend Kita to unlock and upgrade Mami, Pares, and Rice projectiles.

class ShopManager {
  constructor(game) {
    this.game = game;
    this.isOpen = false;

    // Button layout for weapon upgrade display
    this.buttons = [
      { name: 'mami',  x: 100, y: 150, width: 600, height: 70 },
      { name: 'pares', x: 100, y: 250, width: 600, height: 70 },
      { name: 'rice',  x: 100, y: 350, width: 600, height: 70 }
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
    // This method is placeholder for additional shop logic if needed
  }

  /**
   * Draw shop UI on canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Player} player
   */
  draw(ctx) {
    if (!this.isOpen || !this.game.player) return;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    // Title
    ctx.fillStyle = CONSTANTS.COLORS.TEXT;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚒️ LADLE UPGRADE SHOP ⚒️', this.game.canvas.width / 2, 50);

    // Kita display
    ctx.font = '20px Arial';
    ctx.fillStyle = CONSTANTS.COLORS.TEXT_GOLD;
    ctx.fillText(`KITA: ${CONSTANTS.CURRENCY_SYMBOL}${this.game.player.kita}`, 
                  this.game.canvas.width / 2, 90);

    // Draw each weapon button
    for (const btn of this.buttons) {
      const weapon = this.game.player.arsenal[btn.name];
      const unlockCost = weapon.baseCost;
      const upgradeCost = this.getUpgradeCost(btn.name);
      const canAfford = weapon.unlocked 
        ? this.game.player.kita >= upgradeCost
        : this.game.player.kita >= unlockCost;
      const isUnlocked = weapon.unlocked;
      const isMaxLevel = weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL;

      // Button background
      ctx.fillStyle = isUnlocked ? '#333333' : '#555555';
      ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

      // Button border
      ctx.strokeStyle = (canAfford && !isMaxLevel) ? CONSTANTS.COLORS.TEXT_GREEN : '#888888';
      ctx.lineWidth = 3;
      ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

      // Weapon name
      ctx.fillStyle = CONSTANTS.COLORS.TEXT;
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      const weaponDisplayName = btn.name.charAt(0).toUpperCase() + btn.name.slice(1);
      ctx.fillText(weaponDisplayName, btn.x + 20, btn.y + 25);

      // Weapon status and damage
      ctx.font = '14px Arial';
      if (isUnlocked) {
        ctx.fillStyle = '#90EE90';
        ctx.fillText(`Level: ${weapon.level} | Damage: ${weapon.damage}`, btn.x + 20, btn.y + 50);

        if (isMaxLevel) {
          ctx.fillStyle = '#FFD700';
          ctx.fillText('MAX LEVEL', btn.x + 400, btn.y + 50);
        } else {
          ctx.fillStyle = canAfford ? CONSTANTS.COLORS.TEXT_GREEN : CONSTANTS.COLORS.TEXT_RED;
          ctx.fillText(`Upgrade: ${CONSTANTS.CURRENCY_SYMBOL}${upgradeCost}`, btn.x + 400, btn.y + 50);
        }
      } else {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Base Damage: ${weapon.damage}`, btn.x + 20, btn.y + 50);
        ctx.fillStyle = canAfford ? CONSTANTS.COLORS.TEXT_GREEN : CONSTANTS.COLORS.TEXT_RED;
        ctx.fillText(`Unlock: ${CONSTANTS.CURRENCY_SYMBOL}${unlockCost}`, btn.x + 400, btn.y + 50);
      }
    }

    // Instructions
    ctx.fillStyle = CONSTANTS.COLORS.TEXT;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[1] Mami | [2] Pares | [3] Rice  |  Press [ENTER] to Continue', 
                  this.game.canvas.width / 2, this.game.canvas.height - 30);
  }
}

