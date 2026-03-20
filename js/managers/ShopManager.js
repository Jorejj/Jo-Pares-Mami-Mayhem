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
   * Unlock a special if affordable.
   * @param {string} specialName
   * @returns {boolean}
   */
  unlockSpecial(specialName) {
    return this.game.player.unlockSpecial(specialName);
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
   * Handle shop selection via numeric keys (1-5).
   * 1-3: Weapons
   * 4-5: Specials
   * @param {number} num - Button number (1-5)
   * @returns {boolean}
   */
  handleSelection(num) {
    if (num >= 1 && num <= 3) {
      const weaponKey = num === 1 ? 'mami' : (num === 2 ? 'pares' : 'rice');
      const weapon = this.game.player.arsenal[weaponKey];

      if (!weapon.unlocked) {
        return this.unlockWeapon(weaponKey);
      } else {
        return this.upgradeWeapon(weaponKey);
      }
    } else if (num === 4 || num === 5) {
      const specialKey = num === 4 ? 'calamansi' : 'chili';
      return this.unlockSpecial(specialKey);
    }
    return false;
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
   * @param {number} delta
   */
  update(delta) {
    if (!this.isOpen) return;
  }

  /**
   * Draw shop UI – No longer needed as we use HTML UI.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {}
}
