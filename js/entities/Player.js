// Player.js – Represents Jo, the player character.
// Handles the catapult drag-and-shoot mechanic and HP tracking.

class Player {
  constructor(game) {
    this.game = game;

    // Position of the catapult/cart on the canvas
    this.x = 80;
    this.y = game.canvas.height - 260;

    // Health
    this.maxHp = 100;
    this.hp = 100;

    // Weapon selection
    this.selectedWeapon = 'mami';

    // Catapult drag state
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };

    // Active projectiles fired by the player
    this.projectiles = [];

    this._bindInput();
  }

  _bindInput() {
    const { mouse } = this.game.inputHandler;
    const canvas = this.game.canvas;

    // Weapon hotkeys: 1-4
    window.addEventListener('keydown', (e) => {
      const weapons = Object.keys(CONSTANTS.WEAPON_NAMES);
      const keyMap = {};
      weapons.forEach((w, i) => { keyMap[`Digit${i + 1}`] = w; });
      if (keyMap[e.code]) this.selectedWeapon = keyMap[e.code];
    });
  }

  update(delta) {
    const { mouse } = this.game.inputHandler;

    // Begin drag
    if (mouse.isDown && !this.isDragging) {
      this.isDragging = true;
      this.dragStart = { x: mouse.x, y: mouse.y };
    }

    if (this.isDragging) {
      this.dragCurrent = { x: mouse.x, y: mouse.y };
    }

    // Release: fire projectile
    if (!mouse.isDown && this.isDragging) {
      this.isDragging = false;
      this._fire();
    }

    // Update projectiles
    this.projectiles.forEach((p) => p.update(delta));
    this.projectiles = this.projectiles.filter((p) => p.isActive);

    // Check projectile collisions with enemies
    const enemies = this.game.waveManager.enemies;
    this.projectiles.forEach((proj) => {
      enemies.forEach((enemy) => {
        if (enemy.isAlive && Physics.checkCollision(proj, enemy)) {
          enemy.takeDamage(proj.damage);
          proj.isActive = false;
        }
      });
    });
  }

  _fire() {
    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const level = this.game.saveManager.state.weaponLevels[this.selectedWeapon];
    const proj = new Projectile(this.game, this.x + 40, this.y + 40, dx, dy, this.selectedWeapon, level);
    this.projectiles.push(proj);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      // Game over logic handled by Game.js
    }
  }

  draw(ctx) {
    const sprite = this.game.assetLoader.images['player'];
    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, this.x, this.y, 120, 160);
    } else {
      ctx.fillStyle = '#3498db';
      ctx.fillRect(this.x, this.y, 60, 80);
    }

    // Draw catapult aiming line when dragging
    if (this.isDragging) {
      ctx.beginPath();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.moveTo(this.dragCurrent.x, this.dragCurrent.y);
      ctx.lineTo(this.dragStart.x, this.dragStart.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw projectiles
    this.projectiles.forEach((p) => p.draw(ctx));
  }
}
