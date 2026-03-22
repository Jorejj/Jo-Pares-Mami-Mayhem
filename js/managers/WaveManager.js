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

    // Dedicated boss pool to keep all entities pool-backed.
    this.bossIanPool = new ObjectPool(
      () => new BossIan(game),
      (boss, bossConfig) => boss.init(bossConfig),
      2
    );
    this.bossMaluPool = new ObjectPool(
      () => new BossMalu(game),
      (boss, bossConfig) => boss.init(bossConfig),
      1
    );
    
    // Track special enemies (bosses) separately
    this.bosses = [];
    
    // Legacy compatibility - reference to active enemies
    this.enemies = this.enemyPool.getActive();
    this.activeEnemies = this.getActiveEnemies();
  }

  /**
   * Initialize and start a new enemy wave.
   * @param {Array} waveEnemies - Array of enemy types to spawn
   */
  startWave(waveEnemies) {
    // Release all enemies back to pool instead of creating garbage
    this.enemyPool.releaseAll();
    this.bossIanPool.releaseAll();
    this.bossMaluPool.releaseAll();
    
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
    this.activeEnemies = this.getActiveEnemies();
    
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

    // Recycle defeated pooled bosses and keep boss list clean.
    for (let i = this.bosses.length - 1; i >= 0; i--) {
      const boss = this.bosses[i];
      if (!boss || boss.isAlive) continue;
      if (boss.type === 'boss_ian') {
        this.bossIanPool.release(boss);
      } else if (boss.type === 'boss_malu' || boss.type === 'boss_final') {
        this.bossMaluPool.release(boss);
      }
      this.bosses.splice(i, 1);
    }
    
    // Update enemy projectiles
    if (this.enemyProjectilePool) {
      this.enemyProjectilePool.update(delta);
    }
    
    // Track kills after update
    const countAfter = this.enemyPool.getActiveCount() + this.bosses.filter(b => b.isAlive).length;
    this.killCount += (countBefore - countAfter);
    
    // Update legacy reference
    this.enemies = this.enemyPool.getActive();
    this.activeEnemies = this.getActiveEnemies();
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
    if (type === 'boss_kap' || type === 'boss_ian' || type === 'boss_diwata' || type === 'boss_final') {
      this._spawnBoss(type);
    } else {
      // Acquire enemy from pool instead of creating new
      const enemy = this.enemyPool.spawn(type);
      console.log('[WaveManager] Spawned enemy:', type, 'Active count:', this.enemyPool.getActiveCount());
    }
    
    // Update legacy reference
    this.enemies = this.enemyPool.getActive();
    this.activeEnemies = this.getActiveEnemies();
  }

  /**
   * Spawn a boss enemy (pool-backed special class)
   * @private
   */
  _spawnBoss(type) {
    let boss;
    
    switch (type) {
      case 'boss_kap':
        boss = new BossKap(this.game);
        console.log('[WaveManager] Spawned Boss: Inspector Kap Nino');
        break;
      case 'boss_ian':
        // Pull from pool and initialize with boss-specific HP/speed.
        boss = this.bossIanPool.acquire({
          hp: 900,
          speed: 0.9,
          damage: 40,
          kitaReward: 300,
          centerX: this.game.canvas.width - 250,
          spawnX: this.game.canvas.width + 50
        });
        console.log('[WaveManager] Spawned Boss: Vlogger Ian');
        break;
      case 'boss_final':
        boss = this.bossMaluPool.acquire({
          spriteKey: 'boss_mastermind',
          projectileSpriteKey: 'boss3_proj',
          auraSpriteKey: 'boss3_aura',
          baseHp: 1000,
          speed: 1.0,
          damage: 45,
          kitaReward: 1000,
          centerX: this.game.canvas.width / 2 - 65,
          centerY: this.game.canvas.height / 2,
          ianX: this.game.canvas.width - 260,
          spawnX: this.game.canvas.width + 90
        });
        console.log('[WaveManager] Spawned Boss: Malupiton');
        break;
      default:
        console.warn(`[WaveManager] Unknown boss type: ${type}`);
        return;
    }
    
    if (boss) {
      this.bosses.push(boss);
      this.activeEnemies = this.getActiveEnemies();
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
    this.bossIanPool.releaseAll();
    this.bossMaluPool.releaseAll();
    this.bosses = [];
    if (this.enemyProjectilePool) {
      this.enemyProjectilePool.releaseAll();
    }
    this.isSpawning = false;
    this.spawnTimer = 0;
    this.spawnIndex = 0;
    this.waveEnemies = [];
    this.enemies = this.enemyPool.getActive();
    this.activeEnemies = this.getActiveEnemies();
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
