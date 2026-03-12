// ShopManager.js – Handles the in-game upgrade shop.
// Players spend Kita to level up Mami, Pares, Cola, and Rice projectiles.

class ShopManager {
  constructor(game) {
    this.game = game;
    this.isOpen = false;

    // Upgrade costs per weapon level (index = current level - 1, i.e. cost to go from level N to N+1)
    this.upgradeCosts = {
      mami:  [50, 120, 250, 500],
      pares: [60, 140, 280, 560],
      cola:  [40, 100, 200, 400],
      rice:  [30,  80, 160, 320],
    };
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  upgrade(weaponKey) {
    const state = this.game.saveManager.state;
    const currentLevel = state.weaponLevels[weaponKey];
    const costs = this.upgradeCosts[weaponKey];

    // costs[i] is the price to upgrade FROM level i TO level i+1
    if (!costs || currentLevel >= costs.length) {
      return false; // already max level
    }

    const cost = costs[currentLevel - 1];
    if (state.kita < cost) {
      return false; // not enough Kita
    }

    state.kita -= cost;
    state.weaponLevels[weaponKey]++;
    this.game.saveManager.save();
    return true;
  }

  update(delta) {
    if (!this.isOpen) return;

    // Detect clicks on shop upgrade buttons (delegated via UIManager)
  }
}
