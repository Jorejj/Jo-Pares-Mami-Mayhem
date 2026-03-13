// Player.js – Represents Jo, the player character.
// Handles catapult drag-and-shoot mechanic, arsenal management, HP, and Kita economy.

class Player {
  constructor(game) {
    this.game = game;

    // ===== POSITION & DISPLAY =====
    this.x = CONSTANTS.PLAYER_X;
    this.y = game.canvas.height - 260;
    this.width = CONSTANTS.PLAYER_WIDTH;
    this.height = CONSTANTS.PLAYER_HEIGHT;

    // ===== HEALTH =====
    this.maxHp = CONSTANTS.PLAYER_MAX_HP;
    this.hp = CONSTANTS.PLAYER_MAX_HP;

    // ===== ECONOMY =====
    this.kita = CONSTANTS.PLAYER_START_KITA;

    // ===== ARSENAL SYSTEM =====
    this.selectedWeapon = 'mami';
    this.arsenal = this._initArsenal();

    // ===== CATAPULT DRAG STATE =====
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };

    // ===== PROJECTILES =====
    this.projectiles = [];

    // ===== SPECIAL ABILITIES =====
    this.specials = this._initSpecials();

    this._bindInput();
  }

  /**
   * Initialize arsenal with all three weapon types.
   * Tracks: unlocked status, damage, level, cooldown, last fire time
   * @returns {Object}
   */
  _initArsenal() {
    const arsenal = {};

    for (const [weaponKey, stats] of Object.entries(CONSTANTS.WEAPON_STATS)) {
      arsenal[weaponKey] = {
        unlocked: stats.unlocked,
        damage: stats.baseDamage,
        level: 1,
        cooldown: stats.cooldown,
        timeSinceLastFire: 0,
        baseCost: stats.unlockCost,
      };
    }

    return arsenal;
  }

  /**
   * Initialize special abilities (Calamansi & Chili).
   * @returns {Object}
   */
  _initSpecials() {
    const specials = {};

    for (const [specialKey, stats] of Object.entries(CONSTANTS.SPECIALS)) {
      specials[specialKey] = {
        unlocked: false,
        cooldown: stats.cooldown,
        timeSinceLastFire: stats.cooldown, // Ready immediately
        baseCost: stats.unlockCost,
      };
    }

    return specials;
  }

  /**
   * Bind keyboard input for weapon selection (keys 1-3) and specials (keys 4-5).
   */
  _bindInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // Weapon selection
      if (key === '1') this.selectWeapon('mami');
      else if (key === '2' && this.arsenal['pares'].unlocked) this.selectWeapon('pares');
      else if (key === '3' && this.arsenal['rice'].unlocked) this.selectWeapon('rice');

      // Special abilities
      else if (key === '4' && this.canUseSpecial('calamansi')) this.activateSpecial('calamansi');
      else if (key === '5' && this.canUseSpecial('chili')) this.activateSpecial('chili');
    });
  }

  /**
   * Select a weapon if it's unlocked.
   * @param {string} weaponName
   * @returns {boolean}
   */
  selectWeapon(weaponName) {
    if (this.arsenal[weaponName] && this.arsenal[weaponName].unlocked) {
      this.selectedWeapon = weaponName;
      return true;
    }
    return false;
  }

  /**
   * Check if player can fire selected weapon.
   * @returns {boolean}
   */
  canFireWeapon() {
    const weapon = this.arsenal[this.selectedWeapon];
    return weapon && weapon.timeSinceLastFire >= weapon.cooldown;
  }

  /**
   * Fire selected weapon and reset cooldown.
   * @returns {boolean}
   */
  fireWeapon() {
    if (!this.canFireWeapon()) return false;
    this.arsenal[this.selectedWeapon].timeSinceLastFire = 0;
    return true;
  }

  /**
   * Check if special ability can be used.
   * @param {string} specialName
   * @returns {boolean}
   */
  canUseSpecial(specialName) {
    const special = this.specials[specialName];
    return special && special.unlocked && special.timeSinceLastFire >= special.cooldown;
  }

  /**
   * Activate special ability (applies status to all enemies).
   * @param {string} specialName
   */
  activateSpecial(specialName) {
    if (!this.canUseSpecial(specialName)) return;

    const special = this.specials[specialName];
    special.timeSinceLastFire = 0;

    // Apply effect to all active enemies
    const enemies = this.game.waveManager.enemies || [];
    const effect = CONSTANTS.SPECIALS[specialName].effect;

    enemies.forEach(enemy => {
      if (effect === 'slow') {
        enemy.applySlowStatus(
          CONSTANTS.SPECIALS.calamansi.slowDuration,
          CONSTANTS.SPECIALS.calamansi.slowFactor
        );
      } else if (effect === 'burn') {
        enemy.applyBurnStatus(
          CONSTANTS.SPECIALS.chili.burnDuration,
          CONSTANTS.SPECIALS.chili.burnDamagePerTick
        );
      }
    });
  }

  /**
   * Get cooldown percentage for a weapon (0-100).
   * @param {string} weaponName
   * @returns {number}
   */
  getWeaponCooldownPercent(weaponName) {
    const weapon = this.arsenal[weaponName];
    if (weapon.cooldown === 0) return 100;
    return Math.min(100, (weapon.timeSinceLastFire / weapon.cooldown) * 100);
  }

  /**
   * Unlock a weapon if affordable, deducting Kita.
   * @param {string} weaponName
   * @returns {boolean}
   */
  unlockWeapon(weaponName) {
    const weapon = this.arsenal[weaponName];
    if (!weapon || weapon.unlocked) return false;

    const cost = weapon.baseCost;
    if (this.kita < cost) return false;

    this.kita -= cost;
    weapon.unlocked = true;
    this.game.saveManager.save();
    return true;
  }

  /**
   * Upgrade a weapon level, increasing damage and cost.
   * Cost = Base * (1.5 ^ level).
   * @param {string} weaponName
   * @returns {boolean}
   */
  upgradeWeapon(weaponName) {
    const weapon = this.arsenal[weaponName];
    if (!weapon || !weapon.unlocked || weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL) {
      return false;
    }

    const costMultiplier = Math.pow(CONSTANTS.WEAPON_UPGRADE_COST_MULTIPLIER, weapon.level);
    const upgradeCost = Math.ceil(50 * costMultiplier);

    if (this.kita < upgradeCost) return false;

    this.kita -= upgradeCost;
    weapon.level++;
    weapon.damage += 5;

    this.game.saveManager.save();
    return true;
  }

  /**
   * Add Kita (currency/score).
   * @param {number} amount
   */
  addKita(amount) {
    this.kita += amount;
  }

  /**
   * Take damage, reducing health.
   * @param {number} amount
   */
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  /**
   * Check if player is dead.
   * @returns {boolean}
   */
  isDead() {
    return this.hp <= 0;
  }

  /**
   * Get collision rect for enemy attacks.
   * @returns {Object}
   */
  getCollisionRect() {
    return {
      x: this.x - 10,
      y: this.y + this.height,
      width: 30,
      height: 20
    };
  }

  /**
   * Update player state each frame.
   * - Handle drag input
   * - Fire on release
   * - Update projectiles and cooldowns
   * @param {number} delta - Time delta in ms
   */
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

    // Update weapon cooldowns
    for (const weaponKey in this.arsenal) {
      const weapon = this.arsenal[weaponKey];
      if (weapon.timeSinceLastFire < weapon.cooldown) {
        weapon.timeSinceLastFire += delta;
      }
    }

    // Update special cooldowns
    for (const specialKey in this.specials) {
      const special = this.specials[specialKey];
      if (special.timeSinceLastFire < special.cooldown) {
        special.timeSinceLastFire += delta;
      }
    }

    // Update projectiles
    this.projectiles = this.projectiles.filter(p => {
      p.update(delta);
      return p.isActive;
    });

    // Collision: projectiles vs enemies
    const enemies = this.game.waveManager.enemies || [];
    this.projectiles.forEach((proj, projIdx) => {
      enemies.forEach((enemy, enemyIdx) => {
        if (enemy.isAlive && Physics.checkCollision(proj, enemy)) {
          const weaponData = this.arsenal[proj.type];
          let damage = weaponData.damage;

          enemy.takeDamage(damage);
          proj.onHit(enemy); // Special behavior (Rice splash, Pares apex, etc.)
          proj.isActive = false;

          if (!enemy.isAlive) {
            this.addKita(CONSTANTS.ENEMY_KITA_REWARD);
            this.game.waveManager.killCount++;
          }
        }
      });
    });
  }

  /**
   * Fire projectile based on drag vector.
   * @private
   */
  _fire() {
    const { vx, vy } = this.game.inputHandler.getDragVector();
    if (vx === 0 && vy === 0) return; // No drag

    if (!this.fireWeapon()) return; // On cooldown

    const weaponData = this.arsenal[this.selectedWeapon];
    const startX = this.x + this.width + 10;
    const startY = this.y + this.height / 2;

    const proj = new Projectile(
      this.game,
      startX,
      startY,
      vx,
      vy,
      this.selectedWeapon,
      weaponData.damage,
      weaponData.level
    );

    this.projectiles.push(proj);
  }

  /**
   * Draw Jo (player) on canvas.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Draw player body
    ctx.fillStyle = CONSTANTS.COLORS.PLAYER;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw player head (circle)
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y - 10, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#9999FF';
    ctx.fill();

    // Draw ladle (simple line)
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width, this.y + this.height / 2);
    ctx.lineTo(this.x + this.width + 20, this.y + this.height / 2 - 15);
    ctx.stroke();

    // Draw projectiles
    this.projectiles.forEach(p => p.draw(ctx));

    // Draw trajectory line when dragging
    if (this.isDragging && this.game.inputHandler.isDragging) {
      const { vx, vy } = this.game.inputHandler.getDragVector();
      const startX = this.x + this.width + 10;
      const startY = this.y + this.height / 2;
      const points = Physics.getTrajectoryPoints(startX, startY, vx, vy);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let p of points) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
