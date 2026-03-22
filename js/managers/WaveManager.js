// WaveManager.js – Spawns and tracks enemy waves for the current level.
// Uses Object Pooling for better performance and reduced GC pressure.

class WaveManager {
  constructor(game) {
    this.game = game;
    this.currentWave = 1;
    this.waveEnemies = [];
    this.spawnTimer = 0;
    this.spawnIndex = 0;
    this.killCount = 0;
    this.isSpawning = false;

    // Initialize enemy pool for object recycling
    this.enemyPool = new EnemyPool(game, 30);
    
    // Initialize enemy projectile pool for bosses
    this.enemyProjectilePool = new EnemyProjectilePool(game, 20);
    
    // Track special enemies (bosses) separately
    this.bosses = [];
    
    // Legacy compatibility - reference to active enemies
    this.enemies = this.enemyPool.getActive();
  }

  /**
   * Initialize and start a new enemy wave.
   * @param {Array} waveEnemies - Array of enemy types to spawn
   */
  startWave(waveEnemies) {
    // Release all enemies back to pool instead of creating garbage
    this.enemyPool.releaseAll();
    
    // Clear bosses array
    this.bosses = [];
    
    // Clear enemy projectiles from previous wave
    if (this.enemyProjectilePool) {
      this.enemyProjectilePool.releaseAll();
    }
    
    this.waveEnemies = waveEnemies;
    this.killCount = 0;
    this.spawnTimer = 0;
    this.spawnIndex = 0;
    this.isSpawning = true;
    
    // Update legacy reference
    this.enemies = this.enemyPool.getActive();
    
    console.log(`[WaveManager] Wave ${this.currentWave} started with ${waveEnemies.length} enemies.`);
  }

  /**
   * Update wave logic each frame.
   * @param {number} delta
   */
  update(delta) {
    const activeCount = this.enemyPool.getActiveCount() + this.bosses.length;
    
    if (!this.isSpawning && activeCount === 0) return;

    // Handle spawning
    if (this.isSpawning) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= CONSTANTS.ENEMY_SPAWN_INTERVAL) {
        this.spawnTimer = 0;
        this._spawnNextEnemy();
      }
    }

    // Track kills before update
    const countBefore = this.enemyPool.getActiveCount() + this.bosses.filter(b => b.isAlive).length;
    
    // Update all pooled enemies
    this.enemyPool.update(delta);
    
    // Update all bosses
    this.bosses.forEach(boss => {
      if (boss.isAlive) {
        boss.update(delta);
      }
    });
    
    // Update enemy projectiles
    if (this.enemyProjectilePool) {
      this.enemyProjectilePool.update(delta);
    }
    
    // Track kills after update
    const countAfter = this.enemyPool.getActiveCount() + this.bosses.filter(b => b.isAlive).length;
    this.killCount += (countBefore - countAfter);
    
    // Update legacy reference
    this.enemies = this.enemyPool.getActive();
  }

  /**
   * Check if the current wave is finished.
   * @returns {boolean}
   */
  isWaveComplete() {
    const pooledEnemiesAlive = this.enemyPool.getActiveCount();
    const bossesAlive = this.bosses.filter(b => b.isAlive).length;
    return !this.isSpawning && pooledEnemiesAlive === 0 && bossesAlive === 0;
  }

  /**
   * Spawn the next enemy in the queue using object pool.
   * @private
   */
  _spawnNextEnemy() {
    if (this.spawnIndex >= this.waveEnemies.length) {
      this.isSpawning = false;
      console.log('[WaveManager] All enemies spawned');
      return;
    }

    const type = this.waveEnemies[this.spawnIndex];
    this.spawnIndex++;

    // Special handling for boss types
    if (type === 'boss_kap' || type === 'boss_diwata' || type === 'boss_final') {
      this._spawnBoss(type);
    } else {
      // Acquire enemy from pool instead of creating new
      const enemy = this.enemyPool.spawn(type);
      console.log('[WaveManager] Spawned enemy:', type, 'Active count:', this.enemyPool.getActiveCount());
    }
    
    // Update legacy reference
    this.enemies = this.enemyPool.getActive();
  }

  /**
   * Spawn a boss enemy (not pooled - uses special class)
   * @private
   */
  _spawnBoss(type) {
    let boss;
    
    switch (type) {
      case 'boss_kap':
        boss = new BossKap(this.game);
        console.log('[WaveManager] Spawned Boss: Inspector Kap Nino');
        break;
      case 'boss_diwata':
        // Future: boss = new BossDiwata(this.game);
        console.warn('[WaveManager] Boss Diwata not yet implemented, using pooled enemy');
        boss = this.enemyPool.spawn(type);
        return;
      case 'boss_final':
        // Future: boss = new BossFinal(this.game);
        console.warn('[WaveManager] Final Boss not yet implemented, using pooled enemy');
        boss = this.enemyPool.spawn(type);
        return;
      default:
        console.warn(`[WaveManager] Unknown boss type: ${type}`);
        return;
    }
    
    if (boss) {
      this.bosses.push(boss);
    }
  }

  /**
   * Draw all active enemies.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Draw pooled enemies
    this.enemyPool.draw(ctx);
    
    // Draw bosses
    this.bosses.forEach(boss => {
      if (boss.isAlive) {
        boss.draw(ctx);
      }
    });
    
    // Draw enemy projectiles
    if (this.enemyProjectilePool) {
      this.enemyProjectilePool.draw(ctx);
    }
  }

  /**
   * Release all enemies back to the pool (used when level ends)
   */
  clearAllEnemies() {
    this.enemyPool.releaseAll();
    this.bosses = [];
    if (this.enemyProjectilePool) {
      this.enemyProjectilePool.releaseAll();
    }
    this.isSpawning = false;
    this.spawnTimer = 0;
    this.spawnIndex = 0;
    this.waveEnemies = [];
    this.enemies = this.enemyPool.getActive();
  }

  /**
   * Get all currently active enemies (both regular enemies and bosses)
   * Used by projectiles for ricochet targeting
   */
  getActiveEnemies() {
    const pooledEnemies = this.enemyPool.getActive();
    return [...pooledEnemies, ...this.bosses].filter(enemy => 
      enemy && enemy.isAlive && enemy.state !== 'dead'
    );
  }
}
