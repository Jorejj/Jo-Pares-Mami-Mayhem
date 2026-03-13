// Enemy.js – Represents an enemy unit.
// Handles movement, combat, status effects (slow/burn), and rendering.

const ENEMY_TYPES = {
  gangster:   { hp: 40,  speed: 1.2, damage: 10, kitaReward: 20, spriteKey: 'enemy_gangster' },
  cockroach:  { hp: 15,  speed: 2.5, damage: 5,  kitaReward: 10, spriteKey: 'enemy_cockroach' },
  rat:        { hp: 20,  speed: 2.0, damage: 5,  kitaReward: 10, spriteKey: 'enemy_rat' },
  dog:        { hp: 35,  speed: 1.8, damage: 15, kitaReward: 15, spriteKey: 'enemy_dog' },
  student:    { hp: 30,  speed: 1.5, damage: 8,  kitaReward: 15, spriteKey: 'enemy_student' },
  worker:     { hp: 50,  speed: 1.0, damage: 12, kitaReward: 20, spriteKey: 'enemy_worker' },
  elite:      { hp: 80,  speed: 0.8, damage: 20, kitaReward: 30, spriteKey: 'enemy_elite' },
  boss_kap:   { hp: 300, speed: 0.5, damage: 30, kitaReward: 100, spriteKey: 'boss_inspector' },
  boss_diwata:{ hp: 400, speed: 0.6, damage: 25, kitaReward: 150, spriteKey: 'boss_vlogger' },
  boss_final: { hp: 600, speed: 0.4, damage: 40, kitaReward: 300, spriteKey: 'boss_mastermind' },
};

class Enemy {
  constructor(game, type = 'gangster') {
    this.game = game;
    this.type = type;
    this.alive = true;
    this.isAlive = true;

    const config = ENEMY_TYPES[type] || ENEMY_TYPES.gangster;
    
    // ===== POSITION & SIZE =====
    this.x = game.canvas.width - 50;
    this.y = Math.random() * (game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - CONSTANTS.ENEMY_HEIGHT) + CONSTANTS.GAME_BOTTOM_HALF;
    this.width = CONSTANTS.ENEMY_WIDTH;
    this.height = CONSTANTS.ENEMY_HEIGHT;

    // ===== HEALTH =====
    const difficulty = this.game.levelManager?.currentDifficulty || CONSTANTS.DIFFICULTY.medium;
    this.maxHp = config.hp * difficulty.hpMult;
    this.hp = this.maxHp;

    // ===== MOVEMENT & COMBAT =====
    this.baseSpeed = config.speed * difficulty.speedMult;
    this.speed = this.baseSpeed;
    this.damage = config.damage;
    this.kitaReward = config.kitaReward;
    this.spriteKey = config.spriteKey;

    this.lastAttackTime = 0;
    this.spawnTime = Date.now();

    // ===== STATUS EFFECTS =====
    this.slowActive = false;
    this.slowDuration = 0;
    this.slowFactor = 1;

    this.burnActive = false;
    this.burnDuration = 0;
    this.burnDamagePerTick = 0;
    this.lastBurnTick = 0;
  }

  /**
   * Apply slow status effect to this enemy.
   * @param {number} duration - Duration in ms
   * @param {number} factor - Speed multiplier (0.5 = 50% speed)
   */
  applySlowStatus(duration, factor) {
    this.slowActive = true;
    this.slowDuration = duration;
    this.slowFactor = factor;
    this.updateSpeed();
  }

  /**
   * Apply burn status effect to this enemy.
   * Deals damage every tick.
   * @param {number} duration - Duration in ms
   * @param {number} damagePerTick - Damage amount per tick
   */
  applyBurnStatus(duration, damagePerTick) {
    this.burnActive = true;
    this.burnDuration = duration;
    this.burnDamagePerTick = damagePerTick;
    this.lastBurnTick = Date.now();
  }

  /**
   * Update speed based on status effects.
   * @private
   */
  updateSpeed() {
    let speedMultiplier = 1;
    if (this.slowActive && this.slowFactor) {
      speedMultiplier *= this.slowFactor;
    }
    this.speed = this.baseSpeed * speedMultiplier;
  }

  /**
   * Check if enemy is in attack range of player.
   * @returns {boolean}
   */
  isNearPlayer() {
    return this.x <= CONSTANTS.PLAYER_X + CONSTANTS.PLAYER_WIDTH + CONSTANTS.PLAYER_ATTACK_RANGE;
  }

  /**
   * Check if enemy can attack player.
   * @returns {boolean}
   */
  canAttack() {
    const now = Date.now();
    return (now - this.lastAttackTime) >= CONSTANTS.ENEMY_ATTACK_COOLDOWN;
  }

  /**
   * Record that this enemy just attacked.
   */
  recordAttack() {
    this.lastAttackTime = Date.now();
  }

  /**
   * Get collision rect for projectile detection.
   * @returns {Object}
   */
  getCollisionRect() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Apply damage to this enemy.
   * @param {number} damage
   */
  takeDamage(damage) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.isAlive = false;
    }
  }

  /**
   * Check if enemy has reached player position.
   * @returns {boolean}
   */
  hasReachedPlayer() {
    return this.x <= CONSTANTS.PLAYER_X + CONSTANTS.PLAYER_WIDTH;
  }

  /**
   * Get distance to player.
   * @returns {number}
   */
  getDistanceToPlayer() {
    const playerX = CONSTANTS.PLAYER_X + CONSTANTS.PLAYER_WIDTH / 2;
    const playerY = this.game.player.y + this.game.player.height / 2;
    const enemyCenterX = this.x + this.width / 2;
    const enemyCenterY = this.y + this.height / 2;

    return Physics.getDistance(enemyCenterX, enemyCenterY, playerX, playerY);
  }

  /**
   * Update enemy state each frame.
   * - Apply status effects
   * - Move towards player
   * - Deal damage if in range
   * @param {number} delta - Time delta in ms
   */
  update(delta) {
    if (!this.isAlive) return;

    // ===== STATUS EFFECTS =====

    // Update slow
    if (this.slowActive) {
      this.slowDuration -= delta;
      if (this.slowDuration <= 0) {
        this.slowActive = false;
        this.slowFactor = 1;
        this.updateSpeed();
      }
    }

    // Update burn
    if (this.burnActive) {
      this.burnDuration -= delta;

      // Tick damage
      const now = Date.now();
      if (now - this.lastBurnTick >= 100) { // Burn ticks every 100ms
        this.takeDamage(this.burnDamagePerTick);
        this.lastBurnTick = now;
      }

      if (this.burnDuration <= 0) {
        this.burnActive = false;
      }
    }

    // ===== MOVEMENT =====
    if (!this.isNearPlayer()) {
      this.x -= this.speed;
    }

    // ===== COMBAT =====
    if (this.isNearPlayer() && this.canAttack()) {
      this.game.player.takeDamage(CONSTANTS.PLAYER_DAMAGE_ON_HIT);
      this.recordAttack();
      if (this.game.player.isDead()) {
        this.game.currentState = CONSTANTS.STATES.GAMEOVER;
      }
    }

    // Stop at bounds
    if (this.x < -this.width) {
      this.alive = false;
      this.isAlive = false;
    }
  }

  /**
   * Draw enemy on canvas.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.isAlive) return;

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    
    // Draw enemy body (use sprite if available, else colored rect)
    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = CONSTANTS.COLORS.ENEMY;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // Draw burn effect (orange overlay)
    if (this.burnActive) {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // Draw slow effect (blue tint)
    if (this.slowActive) {
      ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // Draw HP bar above enemy
    ctx.fillStyle = '#00FF00';
    const barWidth = this.width * (this.hp / this.maxHp);
    ctx.fillRect(this.x, this.y - 8, barWidth, 5);

    // Draw HP bar outline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y - 8, this.width, 5);

    // Draw status icons if applicable
    let iconX = this.x + this.width / 2 - 8;
    if (this.slowActive) {
      ctx.fillStyle = '#0096FF';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('S', iconX + 4, this.y - 12);
      iconX += 8;
    }
    if (this.burnActive) {
      ctx.fillStyle = '#FF6400';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('B', iconX + 4, this.y - 12);
    }
  }
}

