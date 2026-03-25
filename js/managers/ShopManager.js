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
      case 7: return this.game.player.upgradeCart();
      case 8: return this.game.player.upgradeSack();
      default: return false;
    }
  }

  getCartUpgradeCost() {
    const player = this.game.player;
    if (player.cartLevel >= CONSTANTS.CART_UPGRADES.maxLevel) return Infinity;
    const costMultiplier = Math.pow(CONSTANTS.CART_UPGRADES.costMultiplier, player.cartLevel - 1);
    return Math.ceil(CONSTANTS.CART_UPGRADES.baseUpgradeCost * costMultiplier);
  }

  getSackUpgradeCost() {
    const player = this.game.player;
    if (player.sackLevel >= CONSTANTS.SACK_UPGRADES.maxLevel) return Infinity;
    const costMultiplier = Math.pow(CONSTANTS.SACK_UPGRADES.costMultiplier, player.sackLevel - 1);
    return Math.ceil(CONSTANTS.SACK_UPGRADES.baseUpgradeCost * costMultiplier);
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