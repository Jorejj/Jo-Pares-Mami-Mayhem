// UIManager.js – Renders all HUD elements and overlay screens onto the canvas.
// Displays: level, HP bar, Kita (₱), timer (Oras), kill count, and weapon tray.

class UIManager {
  constructor(game) {
    this.game = game;
    this.font = '16px monospace';
    this.hudColor = '#ffffff';
    this.hudBg = 'rgba(0, 0, 0, 0.55)';
  }

  update(delta) {
    // Animate HUD elements (e.g., flashing low-HP indicator) here
  }

  draw(ctx) {
    this._drawHUD(ctx);
    this._drawWeaponTray(ctx);
  }

  _drawHUD(ctx) {
    const { player, levelManager, saveManager } = this.game;
    const lvl = levelManager.currentLevel;
    const kita = saveManager.state.kita;

    // HUD background panel
    ctx.fillStyle = this.hudBg;
    ctx.fillRect(10, 10, 280, 110);

    ctx.fillStyle = this.hudColor;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`LEVEL: ${lvl}`, 20, 32);

    // HP bar label
    ctx.fillText(`JO HP:`, 20, 54);
    this._drawBar(ctx, 90, 42, 180, 16, player.hp / player.maxHp, '#e74c3c', '#27ae60');

    // Kita
    ctx.fillText(`KITA (₱ESA): ₱${kita}`, 20, 78);

    // Oras (timer) placeholder
    ctx.fillText(`ORAS: --:--`, 20, 100);

    // Kills placeholder
    ctx.fillText(`KILLS: ${this.game.waveManager.killCount}`, 20, 120);
  }

  _drawBar(ctx, x, y, width, height, ratio, emptyColor, fillColor) {
    ctx.fillStyle = emptyColor;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), height);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(x, y, width, height);
  }

  _drawWeaponTray(ctx) {
    const weapons = ['mami', 'pares', 'cola', 'rice'];
    const trayY = this.game.canvas.height - 100;
    const slotSize = 80;
    const gap = 10;
    const totalWidth = weapons.length * (slotSize + gap) - gap;
    const startX = (this.game.canvas.width - totalWidth) / 2;
    const weaponLevels = this.game.saveManager.state.weaponLevels;

    weapons.forEach((weapon, i) => {
      const x = startX + i * (slotSize + gap);
      const isSelected = this.game.player.selectedWeapon === weapon;

      // Slot background
      ctx.fillStyle = isSelected ? 'rgba(255,215,0,0.3)' : 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, trayY, slotSize, slotSize);

      ctx.strokeStyle = isSelected ? '#ffd700' : '#888888';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(x, trayY, slotSize, slotSize);

      // Weapon label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(weapon.toUpperCase(), x + slotSize / 2, trayY + 20);

      ctx.font = '11px monospace';
      ctx.fillText(`LEVEL ${weaponLevels[weapon]}`, x + slotSize / 2, trayY + slotSize - 8);
      ctx.textAlign = 'left';
    });
  }
}
