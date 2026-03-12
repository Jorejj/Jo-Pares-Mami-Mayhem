// Projectiles.js – Defines all food projectiles Jo can launch from his catapult.
// Projectile physics are handled by Physics.js; this class manages state and rendering.

const PROJECTILE_CONFIG = {
  mami:  { baseDamage: 20, radius: 18, color: '#f39c12', spriteKey: 'proj_mami' },
  pares: { baseDamage: 25, radius: 20, color: '#8B4513', spriteKey: 'proj_pares' },
  cola:  { baseDamage: 15, radius: 14, color: '#2c3e50', spriteKey: 'proj_cola' },
  rice:  { baseDamage: 10, radius: 12, color: '#ecf0f1', spriteKey: 'proj_rice' },
};

class Projectile {
  constructor(game, x, y, velX, velY, type, level) {
    this.game = game;

    const config = PROJECTILE_CONFIG[type] || PROJECTILE_CONFIG.mami;
    this.type = type;
    this.spriteKey = config.spriteKey;
    this.radius = config.radius;
    this.color = config.color;

    // Scale damage with weapon level
    this.damage = config.baseDamage * level;

    this.x = x;
    this.y = y;

    // Velocity (pixels per frame, scaled by drag distance)
    const speed = CONSTANTS.PROJECTILE_SPEED_MULTIPLIER;
    this.velX = velX * speed;
    this.velY = velY * speed;

    this.isActive = true;
  }

  update(delta) {
    if (!this.isActive) return;

    const dt = delta / 16;
    this.x += this.velX * dt;
    this.y += this.velY * dt;

    // Apply gravity
    this.velY += Physics.GRAVITY * dt;

    // Deactivate when out of canvas bounds
    const canvas = this.game.canvas;
    if (
      this.x > canvas.width + 50 ||
      this.x < -50 ||
      this.y > canvas.height + 50
    ) {
      this.isActive = false;
    }
  }

  draw(ctx) {
    if (!this.isActive) return;

    const sprite = this.game.assetLoader.images[this.spriteKey];
    const size = this.radius * 2;

    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, this.x - this.radius, this.y - this.radius, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}
