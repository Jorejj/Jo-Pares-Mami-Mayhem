// ObjectPool.js – Generic object pooling utility for performance optimization.
// Reduces garbage collection pressure by recycling inactive objects.

class ObjectPool {
  /**
   * Create a new object pool
   * @param {Function} factory - Function that creates a new object
   * @param {Function} reset - Function that resets an object for reuse (obj, ...args) => void
   * @param {number} initialSize - Initial pool size (default: 20)
   */
  constructor(factory, reset, initialSize = 20) {
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    this.active = [];

    // Pre-populate the pool
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      obj._poolActive = false;
      this.pool.push(obj);
    }
  }

  /**
   * Get an object from the pool (or create a new one if empty)
   * @param {...any} args - Arguments to pass to the reset function
   * @returns {Object} A pooled object ready for use
   */
  acquire(...args) {
    let obj;

    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.factory();
    }

    obj._poolActive = true;
    this.reset(obj, ...args);
    this.active.push(obj);
    return obj;
  }

  /**
   * Return an object to the pool
   * @param {Object} obj - The object to release
   */
  release(obj) {
    if (!obj._poolActive) return;

    obj._poolActive = false;
    
    const index = this.active.indexOf(obj);
    if (index > -1) {
      this.active.splice(index, 1);
    }
    
    this.pool.push(obj);
  }

  /**
   * Release all active objects back to the pool
   */
  releaseAll() {
    while (this.active.length > 0) {
      const obj = this.active.pop();
      obj._poolActive = false;
      this.pool.push(obj);
    }
  }

  /**
   * Get all currently active objects
   * @returns {Array} Array of active objects
   */
  getActive() {
    return this.active;
  }

  /**
   * Get count of active objects
   * @returns {number}
   */
  getActiveCount() {
    return this.active.length;
  }

  /**
   * Get count of available (inactive) objects
   * @returns {number}
   */
  getAvailableCount() {
    return this.pool.length;
  }

  /**
   * Update all active objects and auto-release inactive ones
   * @param {number} delta - Time delta
   * @param {Function} isInactive - Function to check if object should be released (obj) => boolean
   */
  updateAndClean(delta, isInactive) {
    // Iterate backwards for safe removal
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      
      if (obj.update) {
        obj.update(delta);
      }

      if (isInactive(obj)) {
        this.release(obj);
      }
    }
  }

  /**
   * Draw all active objects
   * @param {CanvasRenderingContext2D} ctx
   */
  drawAll(ctx) {
    for (let i = 0; i < this.active.length; i++) {
      const obj = this.active[i];
      if (obj.draw) {
        obj.draw(ctx);
      }
    }
  }
}


// ============================================================
// PROJECTILE POOL - Specialized pool for food projectiles
// ============================================================

class ProjectilePool {
  constructor(game, initialSize = 30) {
    this.game = game;
    
    this.pool = new ObjectPool(
      // Factory: Create a blank projectile shell
      () => new PooledProjectile(game),
      // Reset: Reinitialize for reuse
      (proj, x, y, velX, velY, type, damage, level, isSplitChild) => {
        proj.init(x, y, velX, velY, type, damage, level, isSplitChild);
      },
      initialSize
    );
  }

  /**
   * Fire a projectile from the pool
   */
  fire(x, y, velX, velY, type, damage, level = 1, isSplitChild = false) {
    return this.pool.acquire(x, y, velX, velY, type, damage, level, isSplitChild);
  }

  /**
   * Update all projectiles and release inactive ones
   */
  update(delta) {
    this.pool.updateAndClean(delta, (proj) => !proj.isActive);
  }

  /**
   * Draw all active projectiles
   */
  draw(ctx) {
    this.pool.drawAll(ctx);
  }

  /**
   * Get all active projectiles for collision detection
   */
  getActive() {
    return this.pool.getActive();
  }

  /**
   * Release all projectiles (e.g., when level ends)
   */
  releaseAll() {
    this.pool.releaseAll();
  }
}


// ============================================================
// POOLED PROJECTILE - Reusable projectile class
// ============================================================

const POOLED_PROJECTILE_CONFIG = {
  mami:  { baseDamage: 25, radius: 5,  color: '#FFD700' },
  pares: { baseDamage: 40, radius: 7,  color: '#FF6B35' },
  cola:  { baseDamage: 20, radius: 5,  color: '#8B4513' },
  rice:  { baseDamage: 15, radius: 4,  color: '#90EE90', splashRadius: 80 },
};

class PooledProjectile {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    
    // These will be set on init()
    this.x = 0;
    this.y = 0;
    this.velX = 0;
    this.velY = 0;
    this.prevVelY = 0;
    this.type = 'mami';
    this.damage = 25;
    this.level = 1;
    this.radius = 5;
    this.color = '#FFD700';
    this.splashRadius = 0;
    this.hasHit = false;
    this.apexReached = false;
    this.isSplitChild = false; // New property to track if this is a split projectile
    this.hasSplit = false; // Flag to prevent multiple splits

    this.frameWidth = 64;
    this.frameHeight = 64;
  }

  /**
   * Initialize/reset projectile for reuse
   */
  init(x, y, velX, velY, type, damage, level = 1, isSplitChild = false) {
    const config = POOLED_PROJECTILE_CONFIG[type] || POOLED_PROJECTILE_CONFIG.mami;

    this.x = x;
    this.y = y;
    this.velX = velX;
    this.velY = velY;
    this.prevVelY = velY;
    this.type = type;
    this.damage = damage;
    this.level = level;
    this.radius = config.radius;
    this.color = config.color;
    this.splashRadius = config.splashRadius || 0;
    this.isActive = true;
    this.hasHit = false;
    this.apexReached = false;
    this.isSplitChild = isSplitChild;
    this.hasSplit = false; // Reset split flag
    
    // No longer split at launch - pares splits on impact instead
  }

  onHit(enemy) {
    if (this.type === 'rice') {
      this._applySplashDamage(enemy);
    } else if (this.type === 'pares' && !this.isSplitChild && !this.hasSplit) {
      // Pares splits on impact with enemy (only once per projectile)
      this.hasSplit = true; // Mark as having split to prevent multiple splits
      this._splitOnImpact(enemy);
    }
    this.hasHit = true;
  }

  _applySplashDamage(impactEnemy) {
    const enemies = (this.game.waveManager && this.game.waveManager.getActiveEnemies) 
      ? this.game.waveManager.getActiveEnemies() 
      : (this.game.waveManager?.enemies || []);

    enemies.forEach(enemy => {
      if (!enemy.isAlive) return;

      const dist = Physics.getDistance(
        this.x, this.y,
        enemy.x + enemy.width / 2, enemy.y + enemy.height / 2
      );

      if (dist <= this.splashRadius) {
        const splashDamage = Math.ceil(this.damage * 0.6);
        enemy.takeDamage(splashDamage);
      }
    });
  }

  _splitOnImpact(impactEnemy) {
    // Create child projectiles that ricochet to nearest enemies
    const projectilePool = this.game.player?.projectilePool;
    if (!projectilePool || projectilePool.pool.getActiveCount() >= 50) return;
    
    // Get all alive enemies except the one we just hit
    const allEnemies = (this.game.waveManager && this.game.waveManager.getActiveEnemies) 
      ? this.game.waveManager.getActiveEnemies() 
      : (this.game.waveManager?.enemies || []);
    
    const availableTargets = allEnemies.filter(enemy => 
      enemy.isAlive && enemy !== impactEnemy && enemy.state !== 'dead'
    );
    
    // Number of splits based on level (but limited by available targets)
    const maxSplits = Math.min(this.level, 6); // Level 1 = 1 child, Level 2 = 2 children, etc.
    const numSplits = Math.min(maxSplits, availableTargets.length);
    
    console.log(`[Pares] Level ${this.level} impact split: ${numSplits} children from ${availableTargets.length} available targets`);
    
    if (numSplits > 0) {
      // Find closest enemies to ricochet to
      const targets = this._findClosestEnemies(availableTargets, numSplits);
      
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const targetX = target.x + target.width / 2;
        const targetY = target.y + target.height / 2;
        
        // Calculate velocity toward target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 3 + Math.random(); // Random speed variation
        
        let velX = 0, velY = 0;
        if (dist > 0) {
          velX = (dx / dist) * speed;
          velY = (dy / dist) * speed;
        }
        
        // Create ricochet projectile
        const childProj = projectilePool.pool.acquire(
          this.x + (Math.random() - 0.5) * 20, // Slight spread from impact point
          this.y + (Math.random() - 0.5) * 20,
          velX,
          velY,
          'pares',
          Math.ceil(this.damage * 0.6), // Ricochet does 60% damage
          Math.max(1, this.level - 1), // Lower level
          true // isSplitChild = true (prevents further splitting)
        );
        
        console.log(`[Pares] Ricochet ${i+1} toward enemy ${target.type} at (${targetX.toFixed(1)}, ${targetY.toFixed(1)}) distance ${dist.toFixed(1)} with velocity (${velX.toFixed(2)}, ${velY.toFixed(2)})`);
      }
    }
    
    // Parent projectile is consumed on impact (handled by collision system)
  }

  _findClosestEnemies(enemies, count) {
    // Sort enemies by distance from impact point and take closest ones
    const enemiesWithDistance = enemies.map(enemy => ({
      enemy,
      distance: Math.sqrt(
        Math.pow(enemy.x + enemy.width/2 - this.x, 2) + 
        Math.pow(enemy.y + enemy.height/2 - this.y, 2)
      )
    }));
    
    enemiesWithDistance.sort((a, b) => a.distance - b.distance);
    
    return enemiesWithDistance.slice(0, count).map(item => item.enemy);
  }

  update(delta) {
    if (!this.isActive) return;

    this.prevVelY = this.velY;
    this.x += this.velX;
    this.y += this.velY;
    
    // Apply gravity to parent projectiles, but not to pares children (they should travel straight to target)
    if (!(this.type === 'pares' && this.isSplitChild)) {
      this.velY += CONSTANTS.GRAVITY;
    }

    // Rice aura damage (every 5 frames)
    if (this.type === 'rice' && this.splashRadius > 0 && this.game.gameFrame % 5 === 0) {
      const enemies = (this.game.waveManager && this.game.waveManager.getActiveEnemies) 
        ? this.game.waveManager.getActiveEnemies() 
        : (this.game.waveManager?.enemies || []);

      const burnDamageScaling = [2, 4, 8, 12, 16];
      const tickDamage = burnDamageScaling[this.level - 1] || 2;
      const currentRadius = this.splashRadius + (this.level * 10);
      
      console.log(`[Rice] Checking aura - Radius: ${currentRadius}, Enemies in range: ${enemies.length}, Tick damage: ${tickDamage}`);

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.isAlive || enemy.state === 'dead') continue;

        const dist = Physics.getDistance(this.x, this.y, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

        if (dist <= currentRadius) {
          // Force reapply burn for consecutive rice use
          const isBoss = typeof enemy.type === 'string' && enemy.type.startsWith('boss_');
          const shouldApplyBurn = isBoss || !enemy.burnActive || enemy.burnDuration < 1000;
          
          if (shouldApplyBurn) {
            // Bosses should always refresh burn so consecutive rice shots keep the effect active.
            const burnDuration = isBoss ? 3500 : 2500;
            enemy.applyBurnStatus(burnDuration, tickDamage);
            console.log(`[Rice] Applied burn to ${enemy.type} - Distance: ${dist.toFixed(1)}, BurnActive: ${enemy.burnActive}, Duration: ${enemy.burnDuration}`);
          } else {
            console.log(`[Rice] Skipped ${enemy.type} - Already burning for ${enemy.burnDuration}ms`);
          }
        }
      }
    }

    // Bounds check
    const canvas = this.game.canvas;
    if (this.x > canvas.width + 50 || this.x < -50 || this.y > canvas.height + 50) {
      this.isActive = false;
    }
  }

  draw(ctx) {
    if (!this.isActive) return;

    const sheet = this.game.assetLoader?.images?.projectilesSheet;

    if (sheet && sheet.complete && sheet.width > 0) {
      const cols = 5;
      const rows = 3;
      const frameW = sheet.width / cols;
      const frameH = sheet.height / rows;

      const typeToRowMap = { 'mami': 0, 'pares': 1, 'cola': 1, 'rice': 2 };
      let row = typeToRowMap[this.type] ?? 0;
      const col = Math.min(Math.max(0, this.level - 1), 4);

      const sx = col * frameW;
      const sy = row * frameH;

      const targetHeight = (this.radius * 4) + (this.level * 10);
      const scale = targetHeight / frameH;
      const drawW = frameW * scale;
      const drawH = targetHeight;

      ctx.save();
      ctx.drawImage(sheet, sx, sy, frameW, frameH, this.x - drawW / 2, this.y - drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + (this.level * 2), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Visual indicator for pares child projectiles (smaller, different color)
    if (this.type === 'pares' && this.isSplitChild) {
      ctx.strokeStyle = 'rgba(255, 100, 255, 0.8)'; // Magenta outline for children
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Rice splash radius indicator
    if (this.type === 'rice' && this.splashRadius > 0) {
      const currentRadius = this.splashRadius + (this.level * 10);

      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius);
      gradient.addColorStop(0, 'rgba(255, 100, 0, 0.3)');
      gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // No more split preview - pares splits on impact instead
  }
}


// ============================================================
// ENEMY POOL - Specialized pool for enemies
// ============================================================

class EnemyPool {
  constructor(game, initialSize = 30) {
    this.game = game;

    this.pool = new ObjectPool(
      // Factory
      () => new PooledEnemy(game),
      // Reset
      (enemy, type) => {
        enemy.init(type);
      },
      initialSize
    );
  }

  /**
   * Spawn an enemy from the pool
   */
  spawn(type) {
    return this.pool.acquire(type);
  }

  /**
   * Update all enemies and release dead ones
   */
  update(delta) {
    this.pool.updateAndClean(delta, (enemy) => !enemy.isAlive);
  }

  /**
   * Draw all active enemies
   */
  draw(ctx) {
    this.pool.drawAll(ctx);
  }

  /**
   * Get all active enemies for collision detection
   */
  getActive() {
    return this.pool.getActive();
  }

  /**
   * Get count of active enemies
   */
  getActiveCount() {
    return this.pool.getActiveCount();
  }

  /**
   * Release all enemies (e.g., when level ends)
   */
  releaseAll() {
    this.pool.releaseAll();
  }
}


// ============================================================
// POOLED ENEMY - Reusable enemy class
// ============================================================

const POOLED_ENEMY_TYPES = {
  gangster:   { hp: 40,  speed: 1.2, damage: 10, kitaReward: 20, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_gangster' },
  cockroach:  { hp: 15,  speed: 2.5, damage: 5,  kitaReward: 1000, baseWidth: 40, baseHeight: 60,  spriteKey: 'enemy_cockroach' },
  jbhotdog:   { hp: 30,  speed: 1.5, damage: 8,  kitaReward: 15, baseWidth: 55, baseHeight: 160, spriteKey: 'enemy_jbhotdog' },
  bikejor:    { hp: 25,  speed: 2.2, damage: 10, kitaReward: 15, baseWidth: 70, baseHeight: 190, spriteKey: 'enemy_bikejor' },
  kitboard:   { hp: 45,  speed: 1.3, damage: 12, kitaReward: 20, baseWidth: 50, baseHeight: 140, spriteKey: 'enemy_kitboard' },
  rex:        { hp: 50,  speed: 1.0, damage: 15, kitaReward: 25, baseWidth: 50, baseHeight: 165, spriteKey: 'enemy_rex' },
  rat:        { hp: 20,  speed: 2.0, damage: 5,  kitaReward: 10, baseWidth: 40, baseHeight: 50,  spriteKey: 'enemy_rat' },
  dog:        { hp: 35,  speed: 1.8, damage: 15, kitaReward: 15, baseWidth: 60, baseHeight: 80,  spriteKey: 'enemy_dog' },
  student:    { hp: 30,  speed: 1.5, damage: 8,  kitaReward: 15, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_student' },
  worker:     { hp: 50,  speed: 1.0, damage: 12, kitaReward: 20, baseWidth: 55, baseHeight: 110, spriteKey: 'enemy_worker' },
  elite:      { hp: 80,  speed: 0.8, damage: 20, kitaReward: 300, baseWidth: 60, baseHeight: 120, spriteKey: 'enemy_elite' },
  boss_kap:   { hp: 300, speed: 0.5, damage: 30, kitaReward: 100, baseWidth: 120, baseHeight: 220, spriteKey: 'boss_kap' },
  boss_diwata:{ hp: 400, speed: 0.6, damage: 25, kitaReward: 150, baseWidth: 120, baseHeight: 220, spriteKey: 'boss_vlogger' },
  boss_final: { hp: 600, speed: 0.4, damage: 40, kitaReward: 300, baseWidth: 130, baseHeight: 240, spriteKey: 'boss_mastermind' },
  newDaga1:   { hp: 150, speed: 0.4, damage: 40, kitaReward: 30, baseWidth: 60, baseHeight: 150, spriteKey: 'newDaga1' },
  ian:        { hp: 150, speed: 0.4, damage: 40, kitaReward: 100, baseWidth: 90, baseHeight: 180, spriteKey: 'ian' },
  // --- RESTORED MISSING ENEMIES ---
  blonde:     { hp: 70,  speed: 1.4, damage: 15, kitaReward: 25, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_blonde' },
  asbula:     { hp: 80,  speed: 1.1, damage: 20, kitaReward: 30, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_asbula' },
  willie:     { hp: 85,  speed: 1.2, damage: 25, kitaReward: 35, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_willie' },
  fmbad:      { hp: 65,  speed: 1.5, damage: 15, kitaReward: 25, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_fmbad' },
  angryfm:    { hp: 60,  speed: 1.6, damage: 18, kitaReward: 25, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_angryfm' },
  fmteacher:  { hp: 45,  speed: 1.3, damage: 12, kitaReward: 20, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_fmteacher' },
};
class PooledEnemy {
  constructor(game) {
    this.game = game;
    this.isAlive = false;

    // Default values - will be set on init()
    this.type = 'gangster';
    this.x = 0;
    this.y = 0;
    this.width = 60;
    this.height = 110;
    this.hp = 40;
    this.maxHp = 40;
    this.baseSpeed = 1.2;
    this.speed = 1.2;
    this.damage = 10;
    this.kitaReward = 20;
    this.spriteKey = 'enemy_gangster';

    this.drawX = 0;
    this.drawY = 0;
    this.lastAttackTime = 0;

    this.slowActive = false;
    this.slowDuration = 0;
    this.slowFactor = 1;

    this.burnActive = false;
    this.burnDuration = 0;
    this.burnDamagePerTick = 0;
    this.lastBurnTick = 0;

    this.state = 'walk';
    this.currentFrame = 0;
    this.animationTimer = 0;
    this.alpha = 1;
    this.deathTimer = 0;
    this.footstepTimer = 0;
    this.voiceTimer = 0;
  }

  init(type = 'gangster') {
    const config = POOLED_ENEMY_TYPES[type] || POOLED_ENEMY_TYPES.gangster;

    this.type = type;
    this.width = config.baseWidth || 60;
    this.height = config.baseHeight || 110;

    this.x = this.game.canvas.width + 50;
    this.y = Math.random() * (this.game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) + CONSTANTS.GAME_BOTTOM_HALF;

    this.drawX = this.x;
    this.drawY = this.y;

    const difficulty = this.game.levelManager?.currentDifficulty || CONSTANTS.DIFFICULTY.medium;
    this.maxHp = config.hp * difficulty.hpMult;
    this.hp = this.maxHp;

    this.baseSpeed = config.speed * difficulty.speedMult;
    this.speed = this.baseSpeed;
    this.damage = config.damage;
    this.kitaReward = config.kitaReward;
    this.spriteKey = config.spriteKey;

    this.lastAttackTime = 0;
    this.slowActive = false;
    this.slowDuration = 0;
    this.slowFactor = 1;
    this.burnActive = false;
    this.burnDuration = 0;
    this.burnDamagePerTick = 0;
    this.lastBurnTick = Date.now();

    this.state = 'walk';
    this.currentFrame = 0;
    this.animationTimer = 0;
    
    // --- RESTORED FLAGS & TIMERS ---
    this.alpha = 1;
    this.deathTimer = 0;
    this.footstepTimer = 0;
    this.voiceTimer = 0;
    this.rewardGiven = false;

    this.isAlive = true;
    this.alive = true;
    this.isRanged = ['fmbad', 'angryfm', 'fmteacher'].includes(this.type);
    this.isFemale = ['blonde', 'fmbad', 'angryfm', 'fmteacher', 'boss_diwata'].includes(this.type);
    this.isAnimal = ['cockroach', 'rat', 'newDaga1', 'dog'].includes(this.type);
  }

  _playAudioSafe(audioElement) {
    if (!audioElement) return;
    try {
      const playPromise = audioElement.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {});
      }
    } catch (e) {}
  }

  applySlowStatus(duration, factor) {
    this.slowActive = true;
    this.slowDuration = duration;
    this.slowFactor = factor;
    this.updateSpeed();
  }

  applyBurnStatus(duration, damagePerTick) {
    this.burnActive = true;
    this.burnDuration = duration;
    this.burnDamagePerTick = damagePerTick;
    this.lastBurnTick = Date.now();
  }

  updateSpeed() {
    let speedMultiplier = 1;
    if (this.slowActive && this.slowFactor) {
      speedMultiplier *= this.slowFactor;
    }
    this.speed = this.baseSpeed * speedMultiplier;
  }

  isNearPlayer() {
    if (this.state === 'dead' || this.state === 'fading') return false;
    return this.x <= CONSTANTS.PLAYER_X + CONSTANTS.PLAYER_WIDTH + CONSTANTS.PLAYER_ATTACK_RANGE;
  }

  canAttack() {
    return (Date.now() - this.lastAttackTime) >= CONSTANTS.ENEMY_ATTACK_COOLDOWN;
  }

  recordAttack() {
    this.lastAttackTime = Date.now();
  }

  getCollisionRect() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  takeDamage(damage) {
    if (this.state === 'dead' || this.state === 'fading') return;

    this.hp -= damage;

    if (this.hp <= 0) {
      // --- FIXED: SYNC HACK ---
      // We set HP to 1 and change state to fading so it stays on screen!
      this.hp = 1;
      this.state = 'fading';
      this.currentFrame = 0;
      this.rewardGiven = false;

      if (this.game.assetLoader) {
        let randomSound = null;

        if (this.isAnimal) {
          if (this.type === 'cockroach') randomSound = 'sfx_animal_cockroach';
          else if (this.type === 'dog') randomSound = 'sfx_animal_dog';
          else randomSound = 'sfx_animal_rat';
        } else if (this.isFemale) {
          const femaleSounds = ['sfx_deathsoundfm', 'sfx_deathsoundfm2', 'sfx_deathsoundfm3'];
          randomSound = femaleSounds[Math.floor(Math.random() * femaleSounds.length)];
        } else {
          const maleSounds = ['sfx_deathman1', 'sfx_deathsound', 'sfx_deathsound1', 'sfx_deathsoundmale', 'sfx_deathsoundmale2', 'sfx_mandeath2'];
          randomSound = maleSounds[Math.floor(Math.random() * maleSounds.length)];
        }

        const deathAudio = this.game.assetLoader.audio?.[randomSound];
        if (deathAudio) {
          deathAudio.currentTime = 0;
          deathAudio.volume = 0.8;
          this._playAudioSafe(deathAudio);
        }
      }

      // We save its draw coordinates, but throw its actual hitbox offscreen so it can't hurt Jo while dying
      this.drawX = this.x;
      this.drawY = this.y;
      this.x = -9999;
      this.y = -9999;
    } else {
      this.state = 'hurt';
      this.currentFrame = 0;
    }
  }

  update(delta) {
    if (!this.isAlive) return;

    if (this.state !== 'dead' && this.state !== 'fading') {
      this.drawX = this.x;
      this.drawY = this.y;
    }

    // Status effects
    if (this.slowActive) {
      this.slowDuration -= delta;
      if (this.slowDuration <= 0) {
        this.slowActive = false;
        this.slowFactor = 1;
        this.updateSpeed();
      }
    }

    if (this.burnActive && this.state !== 'dead' && this.state !== 'fading') {
      this.burnDuration -= delta;
      const now = Date.now();
      if (now - this.lastBurnTick >= 100) {
        this.takeDamage(this.burnDamagePerTick);
        this.lastBurnTick = now;
      }
      if (this.burnDuration <= 0) {
        this.burnActive = false;
      }
    }

    // Combat & movement
    if (this.state !== 'dead' && this.state !== 'fading' && this.state !== 'hurt') {
      const player = this.game.player;
      const targetX = player.x + player.width / 2;
      const targetY = player.y + player.height / 2;

      const dist = Physics.getDistance(this.x + this.width / 2, this.y + this.height / 2, targetX, targetY);
      const attackRange = this.isRanged ? 600 : (CONSTANTS.ENEMY_ATTACK_RANGE + player.width / 2);

      if (dist <= attackRange) {
        this.state = 'attack';
        
        if (this.isRanged) {
            if (this.canAttack() && this.currentFrame === 2) {
                this.recordAttack(); 
                if (this.game.waveManager && this.game.waveManager.enemyProjectilePool) {
                    const pX = player.x + player.width / 2;
                    const pY = player.y + player.height / 2;
                    this.game.waveManager.enemyProjectilePool.fire(this.x, this.y + this.height * 0.2, pX, pY, this.damage, 'vial');
                }
                const atkSound = Math.random() > 0.5 ? 'sfx_fmattack' : 'sfx_fmattack1';
                const audio = this.game.assetLoader?.audio?.[atkSound];
                if (audio) { audio.currentTime = 0; audio.volume = 0.7; this._playAudioSafe(audio); }
            }
        } else {
            if (this.canAttack() && this.currentFrame === 2) {
              player.takeDamage(this.damage || CONSTANTS.PLAYER_DAMAGE_ON_HIT);
              this.recordAttack();

              let attackSfxKey = 'sfx_attack_punch'; 
              if (['cockroach', 'dog', 'rat'].includes(this.type)) attackSfxKey = 'sfx_attack_bite';
              else if (this.type === 'gangster') attackSfxKey = 'sfx_attack_slash';
              else if (['willie', 'rex', 'newDaga1', 'kitboard', 'jbhotdog', 'bikejor'].includes(this.type)) attackSfxKey = 'sfx_attack_blunt';
              else if (this.type === 'boss_kap') attackSfxKey = 'sfx_attack_drill';
              else if (this.type === 'asbula') attackSfxKey = 'sfx_attack_shutup';
              else if (this.isFemale) attackSfxKey = Math.random() > 0.5 ? 'sfx_fmattack' : 'sfx_fmattack1';

              const audio = this.game.assetLoader?.audio?.[attackSfxKey];
              if (audio) { audio.currentTime = 0; audio.volume = 0.7; this._playAudioSafe(audio); }
            }
        }
      } else {
        this.state = 'walk';
        const vel = Physics.calcVelocity(this.x + this.width / 2, this.y + this.height / 2, targetX, targetY, this.speed);
        this.x += vel.velX;
        this.y += vel.velY;

        this.footstepTimer += delta;
        if (this.footstepTimer > 600) {
          this.footstepTimer = 0;
          const stepAudio = this.game.assetLoader?.audio?.sfx_footstep;
          if (stepAudio) { stepAudio.currentTime = 0; stepAudio.volume = 0.15; this._playAudioSafe(stepAudio); }
        }
      }
    }

    if (this.x < -this.width && this.drawX < -this.width) {
      this.isAlive = false;
    }

    // --- FIXED: RESTORED DEATH FADING AND KITA REWARD ---
    let frameSpeed = 100;
    if (this.state === 'dead' || this.state === 'fading') frameSpeed = 150; 
    else if (this.state === 'hurt') frameSpeed = 250; 
    else if (this.state === 'attack') frameSpeed = 120; 

    this.animationTimer += delta;

    if (this.state === 'fading' || this.state === 'dead') {
        if (this.animationTimer >= frameSpeed) {
            this.animationTimer = 0;
            if (this.currentFrame < 4) this.currentFrame++;
        }

        if (this.currentFrame >= 4) {
            this.deathTimer += delta;
            
            if (this.deathTimer >= 500) { 
                this.alpha -= 0.1; 
                
                if (this.alpha <= 0) {
                    this.hp = 0; 
                    this.state = 'dead';
                    this.isAlive = false; 
                    
                    if (!this.rewardGiven) {
                        this.rewardGiven = true;
                        if (this.game.player) this.game.player.addKita(this.kitaReward || 20);
                        
                        const moneyAudio = this.game.assetLoader?.audio?.sfx_money;
                        if (moneyAudio) { 
                            moneyAudio.currentTime = 0; 
                            moneyAudio.volume = 0.6; 
                            this._playAudioSafe(moneyAudio); 
                        }
                    }
                }
            }
        }
    } else if (this.animationTimer >= frameSpeed) {
      this.animationTimer = 0;
      if (this.state === 'hurt') {
         this.state = 'walk'; this.currentFrame = 0;
      } else {
         this.currentFrame = (this.currentFrame + 1) % 5; 
      }
    }
  }

draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.max(0, this.alpha !== undefined ? this.alpha : 1);

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    
    if (sprite && sprite.complete && sprite.width > 0 && sprite.height > 0) {
      const cols = 5; const rows = 3;
      const sw = sprite.width / cols; const sh = sprite.height / rows;

      let row = 0; let frameToDraw = this.currentFrame;

      if (this.state === 'dead' || this.state === 'fading') { row = 2; } 
      else if (this.state === 'hurt') { row = 2; frameToDraw = 0; } 
      else if (this.state === 'attack') { row = 1; } 
      else { row = 0; }

      const sx = frameToDraw * sw; const sy = row * sh;
      const scale = this.height / sh;
      const drawW = sw * scale; const drawH = this.height;
      
      ctx.save();
      ctx.translate(this.drawX + this.width / 2, this.drawY + this.height);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, sx, sy, sw, sh, -drawW / 2, -drawH, drawW, drawH);
      
      // --- UPGRADED FIRE SPRITE ANIMATION ---
      if (this.burnActive) {
        const fireSprite = this.game.assetLoader?.images?.effect_fire;
        
        if (fireSprite && fireSprite.complete && fireSprite.width > 0) {
          ctx.save();
          
          const fCols = 5;
          const fRows = 3;
          const fw = fireSprite.width / fCols;
          const fh = fireSprite.height / fRows;
          
          const totalFrames = 15;
          const currentFireFrame = Math.floor(this.game.gameFrame / 4) % totalFrames;
          const fCol = currentFireFrame % fCols;
          const fRow = Math.floor(currentFireFrame / fCols);
          
          const fireW = drawW * 1.8;
          const fireH = drawH * 0.9;
          
          ctx.globalAlpha = 0.9; 
          ctx.drawImage(
            fireSprite, 
            fCol * fw, fRow * fh, fw, fh, 
            -fireW / 2, -fireH + (drawH * 0.1), fireW, fireH
          );
          ctx.restore();
        } else {
          ctx.save(); ctx.globalCompositeOperation = 'source-atop';
          const flicker = Math.sin(this.game.gameFrame / 3) * 0.2 + 0.4;
          ctx.fillStyle = `rgba(255, 100, 0, ${flicker})`;
          ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
          ctx.restore();
        }
      } 
      // --- NEW: UPGRADED SLOW SPRITE ANIMATION ---
      else if (this.slowActive) {
        const slowSprite = this.game.assetLoader?.images?.effect_slow;
        
        if (slowSprite && slowSprite.complete && slowSprite.width > 0) {
          ctx.save();
          // We MUST use 'screen' here because slow.jpg has a solid black background
          ctx.globalAlpha = 0.85;

          const sCols = 4;
          const sRows = 2;
          const sw_slow = slowSprite.width / sCols;
          const sh_slow = slowSprite.height / sRows;
          
          const currentSlowFrame = Math.floor(this.game.gameFrame / 5) % 8;
          const sCol = currentSlowFrame % sCols;
          const sRow = Math.floor(currentSlowFrame / sCols);
          
          const effectW = drawW * 1.6;
          const effectH = drawH * 1.1;
          
          ctx.drawImage(
            slowSprite, 
            sCol * sw_slow, sRow * sh_slow, sw_slow, sh_slow, 
            -effectW / 2, -effectH, effectW, effectH
          );
          ctx.restore();
        } else {
          ctx.save(); 
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = 'rgba(0, 150, 255, 0.4)'; 
          ctx.fillRect(-drawW / 2, -drawH, drawW, drawH); 
          ctx.restore();
        }
      }
      
      ctx.restore();
    } else {
      ctx.fillStyle = '#FF0000'; ctx.fillRect(this.drawX, this.drawY, this.width, this.height);
    }

    ctx.globalAlpha = 1.0; 
    
    if (this.state !== 'dead' && this.state !== 'fading') {
      ctx.fillStyle = '#00FF00';
      const barWidth = this.width * (this.hp / this.maxHp);
      ctx.fillRect(this.drawX, this.drawY - 12, barWidth, 5);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.strokeRect(this.drawX, this.drawY - 12, this.width, 5);
    }
  }
}
// ============================================================
// ENEMY PROJECTILE POOL - For boss projectiles (vials, etc.)
// ============================================================

class EnemyProjectilePool {
  constructor(game, initialSize = 20) {
    this.game = game;
    
    this.pool = new ObjectPool(
      // Factory
      () => new PooledEnemyProjectile(game),
      // Reset
      (proj, x, y, targetX, targetY, damage, type) => {
        proj.init(x, y, targetX, targetY, damage, type);
      },
      initialSize
    );
  }

  /**
   * Fire an enemy projectile
   */
  fire(x, y, targetX, targetY, damage, type = 'vial') {
    return this.pool.acquire(x, y, targetX, targetY, damage, type);
  }

  /**
   * Update all enemy projectiles
   */
  update(delta) {
    this.pool.updateAndClean(delta, (proj) => !proj.isActive);
  }

  /**
   * Draw all active enemy projectiles
   */
  draw(ctx) {
    this.pool.drawAll(ctx);
  }

  /**
   * Get all active enemy projectiles
   */
  getActive() {
    return this.pool.getActive();
  }

  /**
   * Get count of active enemy projectiles
   */
  getActiveCount() {
    return this.pool.getActiveCount();
  }

  /**
   * Release all enemy projectiles
   */
  releaseAll() {
    this.pool.releaseAll();
  }
}


// ============================================================
// POOLED ENEMY PROJECTILE - Reusable enemy projectile class
// ============================================================

class PooledEnemyProjectile {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    
    // Default values
    this.x = 0;
    this.y = 0;
    this.velX = 0;
    this.velY = 0;
    this.damage = 10;
    this.type = 'vial';
    this.radius = 20;
    this.speed = 1.5; // Very slow base speed for easy deflection
    this.width = 40;
    this.height = 40;
  }

  init(x, y, targetX, targetY, damage, type = 'vial') {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.type = type;
    this.isActive = true;

    // Calculate velocity toward target
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      this.velX = (dx / dist) * this.speed;
      this.velY = (dy / dist) * this.speed;
    } else {
      this.velX = 0;
      this.velY = 0;
    }

    // Type-specific properties
    if (type === 'vial') {
      this.radius = 20;
      this.width = 40;
      this.height = 40;
      
      // Difficulty-based speed
      let baseSpeed = 1.2; // Very slow base
      if (this.game.currentDifficulty) {
        baseSpeed *= this.game.currentDifficulty.speedMult;
      }
      this.speed = baseSpeed;
      
      // Simple direct movement toward Jo (not catapult physics)
      // Just move straight toward target slowly
      if (dist > 0) {
        this.velX = (dx / dist) * this.speed;
        this.velY = (dy / dist) * this.speed;
      } else {
        this.velX = -this.speed; // Default left movement if no target
        this.velY = 0;
      }
      
      console.log('[EnemyProjectile] Vial direct movement: speed=', this.speed, 'velX=', this.velX, 'velY=', this.velY);
    }
  }

  update(delta) {
    if (!this.isActive) return;

    // Move projectile
    this.x += this.velX;
    this.y += this.velY;

    // Boss vials move in straight line (no gravity), other projectiles have gravity
    if (this.type !== 'vial') {
      this.velY += CONSTANTS.GRAVITY * 0.5;
    }
    // Boss vials maintain constant velocity for predictable movement

    // Bounds check
    const canvas = this.game.canvas;
    if (this.x < -50 || this.x > canvas.width + 50 || 
        this.y < -50 || this.y > canvas.height + 50) {
      this.isActive = false;
    }

    // Check collision with player
    const player = this.game.player;
    if (player && this.checkCollision(player)) {
      player.takeDamage(this.damage);
      this.isActive = false;
    }
  }

  checkCollision(target) {
    const dx = this.x - (target.x + target.width / 2);
    const dy = this.y - (target.y + target.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (this.radius + target.width / 4);
  }

  draw(ctx) {
    if (!this.isActive) return;

    const sprite = this.game.assetLoader?.images?.boss1_proj;

    if (sprite && sprite.complete && sprite.width > 0) {
      // Draw vial sprite
      ctx.save();
      ctx.drawImage(
        sprite,
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
      ctx.restore();
    } else {
      // Fallback: draw as purple circle
      ctx.fillStyle = '#9B59B6';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // No white stroke outline to avoid visual pollution
    }
  }

  // For mid-air collision detection
  getCollisionRect() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }
}

