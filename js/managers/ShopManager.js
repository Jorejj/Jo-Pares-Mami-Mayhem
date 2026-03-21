// ShopManager.js – Handles the in-game upgrade shop.
// Players spend Kita to unlock and upgrade Mami, Pares, and Rice projectiles.

class ShopManager {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
  }

  open() { this.isOpen = true; }
  close() { this.isOpen = false; }
  toggle() { this.isOpen = !this.isOpen; }

  unlockWeapon(weaponName) { return this.game.player.unlockWeapon(weaponName); }
  unlockSpecial(specialName) { return this.game.player.unlockSpecial(specialName); }
  upgradeWeapon(weaponName) { return this.game.player.upgradeWeapon(weaponName); }

  handleSelection(num) {
    switch (num) {
      case 1:
      case 2:
      case 3: {
        const weaponKey = num === 1 ? 'mami' : (num === 2 ? 'pares' : 'rice');
        const weapon = this.game.player.arsenal[weaponKey];
        return !weapon.unlocked ? this.unlockWeapon(weaponKey) : this.upgradeWeapon(weaponKey);
      }
      case 4: return this.unlockSpecial('calamansi');
      case 5: return this.unlockSpecial('chili');
      case 6: return this.unlockSpecial('garlic'); // --- NEW: Added Garlic Shop Unlock ---
      default: return false;
    }
  }

  getUpgradeCost(weaponName) {
    const weapon = this.game.player.arsenal[weaponName];
    if (!weapon || weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL) return Infinity;

    const costMultiplier = Math.pow(CONSTANTS.WEAPON_UPGRADE_COST_MULTIPLIER, weapon.level);
    return Math.ceil(50 * costMultiplier);
  }

  update(delta) { if (!this.isOpen) return; }
  draw(ctx) {}
}