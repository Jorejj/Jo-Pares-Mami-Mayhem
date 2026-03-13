// Projectiles.js – Defines all food projectiles Jo can launch from his catapult.
// Projectile physics are handled by Physics.js; this class manages state, collision, and rendering.
// Special behaviors: Mami (standard), Pares (splits at apex), Rice (splash radius on impact)

const PROJECTILE_CONFIG = {
  mami:  { baseDamage: 25, radius: 5,  color: '#FFD700', spriteKey: 'proj_mami' },
  pares: { baseDamage: 40, radius: 7,  color: '#FF6B35', spriteKey: 'proj_pares' },
  rice:  { baseDamage: 15, radius: 4,  color: '#90EE90', spriteKey: 'proj_rice', splashRadius: 80 },
};

class Projectile {
  constructor(game, x, y, velX, velY, type, damage, level) {
    this.game = game;
    this.type = type;
    this.level = level;

    const config = PROJECTILE_CONFIG[type] || PROJECTILE_CONFIG.mami;
    this.spriteKey = config.spriteKey;
    this.radius = config.radius;
    this.color = config.color;
    this.damage = damage;
    this.splashRadius = config.splashRadius || 0;

    this.x = x;
    this.y = y;

    // Velocity (pixels per frame)
    this.velX = velX;
    this.velY = velY;
    this.prevVelY = this.velY;

    this.isActive = true;
    this.hasHit = false;
    this.apexReached = false;
  }

  /**
   * Called when projectile hits something.
   * Special behavior per projectile type.
   * @param {Enemy} enemy - Enemy the projectile hit
   */
  onHit(enemy) {
    if (this.type === 'rice') {
      // Rice: Apply splash damage to nearby enemies
      this._applySplashDamage(enemy);
    } else if (this.type === 'pares') {
      // Pares: Already hit the enemy normally, special split happens at apex
    }
    this.hasHit = true;
  }

  /**
   * Apply splash damage to all enemies in radius of impact.
   * Used by Rice projectile type.
   * @private
   */
  _applySplashDamage(impactEnemy) {
    const enemies = (this.game.waveManager && this.game.waveManager.enemies) || [];
    
    enemies.forEach(enemy => {
      if (!enemy.isAlive) return;

      const dist = Physics.getDistance(
        this.x, this.y,
        enemy.x + enemy.width / 2, enemy.y + enemy.height / 2
      );

      if (dist <= this.splashRadius) {
        // Reduced splash damage (60% of normal)
        const splashDamage = Math.ceil(this.damage * 0.6);
        enemy.takeDamage(splashDamage);
      }
    });
  }

  /**
   * Spawn child projectiles when Pares reaches apex.
   * Splits into 2-3 smaller projectiles moving downward.
   * @private
   */
  _splitAtApex() {
    if (this.apexReached || this.game.player.projectiles.length > 50) return;

    this.apexReached = true;

    // Create 2 child projectiles
    for (let i = -1; i <= 1; i += 2) {
      const childProj = new Projectile(
        this.game,
        this.x + i * 20,
        this.y,
        this.velX + i * 3, // Spread sideways
        this.velY + 2,      // Downward
        'mami',             // Child becomes basic mami
        this.damage * 0.5,  // Half damage
        this.level
      );
      this.game.player.projectiles.push(childProj);
    }

    this.isActive = false; // Original projectile dies
  }

  /**
   * Update projectile state each frame.
   * - Apply physics (gravity)
   * - Check bounds
   * - Special logic per type
   * @param {number} delta - Time delta in ms
   */
  update(delta) {
    if (!this.isActive) return;

    this.prevVelY = this.velY;
    this.x += this.velX;
    this.y += this.velY;

    // Apply gravity
    this.velY += CONSTANTS.GRAVITY;

    // ===== SPECIAL BEHAVIOR =====

    // Pares: Check if apex reached (velocity changed from negative to positive)
    if (this.type === 'pares' && Physics.isApexReached(this.prevVelY, this.velY)) {
      this._splitAtApex();
      return;
    }

    // ===== BOUNDS CHECK =====
    const canvas = this.game.canvas;
    if (this.x > canvas.width + 50 || this.x < -50 || this.y > canvas.height + 50) {
      this.isActive = false;
    }
  }

  /**
   * Draw projectile on canvas.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.isActive) return;

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    
    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      // Draw as colored circle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      // Draw outline
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw splash radius indicator for Rice projectiles
    if (this.type === 'rice' && this.splashRadius > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.splashRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ===== LEGACY ALIASES FOR COMPATIBILITY =====
// If Case Study code references Mami, Pares, Rice classes directly

class Mami extends Projectile {
  constructor(game, x, y, vx, vy, damage, level = 1) {
    super(game, x, y, vx, vy, 'mami', damage, level);
  }
}

class Pares extends Projectile {
  constructor(game, x, y, vx, vy, damage, level = 1) {
    super(game, x, y, vx, vy, 'pares', damage, level);
  }
}

class Rice extends Projectile {
  constructor(game, x, y, vx, vy, damage, level = 1) {
    super(game, x, y, vx, vy, 'rice', damage, level);
  }
}

