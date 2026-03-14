// Player.js – Represents Jo, the player character.
// Handles catapult drag-and-shoot mechanic, arsenal management, HP, and Kita economy.

class Player {
  constructor(game) {
    this.game = game;

    // ===== POSITION & DISPLAY =====
    this.x = CONSTANTS.PLAYER_X;
    this.y = game.canvas.height - 300;
    this.width = 160;   // Increased display width to maintain aspect ratio with 600x440 source
    this.height = 117;  // 160 * (440/600) approx 117

    // Adjust Y to stay on ground
    this.y = game.canvas.height - this.height - 100;

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
    this.aimAngle = 0;

    // ===== ANIMATION STATE =====
    this.animationTimer = 0;
    this.currentFrame = 0;
    
    // Fixed Clip Size provided by user
    this.spriteClipW = 600;
    this.spriteClipH = 440;
    
    this.frameSpeed = 150;   // Slightly faster for smoother motion

    // ===== PROJECTILES =====
    this.projectiles = [];

    // ===== SPECIAL ABILITIES =====
    this.specials = this._initSpecials();

    this._bindInput();
  }

  /**
   * Initialize arsenal with all three weapon types.
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
   * Initialize special abilities.
   */
  _initSpecials() {
    const specials = {};
    for (const [specialKey, stats] of Object.entries(CONSTANTS.SPECIALS)) {
      specials[specialKey] = {
        unlocked: false,
        cooldown: stats.cooldown,
        timeSinceLastFire: stats.cooldown,
        baseCost: stats.unlockCost,
      };
    }
    return specials;
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === '1') this.selectWeapon('mami');
      else if (key === '2' && this.arsenal['pares'].unlocked) this.selectWeapon('pares');
      else if (key === '3' && this.arsenal['rice'].unlocked) this.selectWeapon('rice');
      else if (key === '4' && this.canUseSpecial('calamansi')) this.activateSpecial('calamansi');
      else if (key === '5' && this.canUseSpecial('chili')) this.activateSpecial('chili');
    });
  }

  selectWeapon(weaponName) {
    if (this.arsenal[weaponName] && this.arsenal[weaponName].unlocked) {
      this.selectedWeapon = weaponName;
      return true;
    }
    return false;
  }

  canFireWeapon() {
    const weapon = this.arsenal[this.selectedWeapon];
    return weapon && weapon.timeSinceLastFire >= weapon.cooldown;
  }

  fireWeapon() {
    if (!this.canFireWeapon()) return false;
    this.arsenal[this.selectedWeapon].timeSinceLastFire = 0;
    return true;
  }

  canUseSpecial(specialName) {
    const special = this.specials[specialName];
    return special && special.unlocked && special.timeSinceLastFire >= special.cooldown;
  }

  activateSpecial(specialName) {
    if (!this.canUseSpecial(specialName)) return;
    const special = this.specials[specialName];
    special.timeSinceLastFire = 0;
    const enemies = this.game.waveManager.enemies || [];
    const effect = CONSTANTS.SPECIALS[specialName].effect;
    enemies.forEach(enemy => {
      if (effect === 'slow') {
        enemy.applySlowStatus(CONSTANTS.SPECIALS.calamansi.slowDuration, CONSTANTS.SPECIALS.calamansi.slowFactor);
      } else if (effect === 'burn') {
        enemy.applyBurnStatus(CONSTANTS.SPECIALS.chili.burnDuration, CONSTANTS.SPECIALS.chili.burnDamagePerTick);
      }
    });
  }

  getWeaponCooldownPercent(weaponName) {
    const weapon = this.arsenal[weaponName];
    if (weapon.cooldown === 0) return 100;
    return Math.min(100, (weapon.timeSinceLastFire / weapon.cooldown) * 100);
  }

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

  upgradeWeapon(weaponName) {
    const weapon = this.arsenal[weaponName];
    if (!weapon || !weapon.unlocked || weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL) return false;
    const costMultiplier = Math.pow(CONSTANTS.WEAPON_UPGRADE_COST_MULTIPLIER, weapon.level);
    const upgradeCost = Math.ceil(50 * costMultiplier);
    if (this.kita < upgradeCost) return false;
    this.kita -= upgradeCost;
    weapon.level++;
    weapon.damage += 5;
    this.game.saveManager.save();
    return true;
  }

  addKita(amount) { this.kita += amount; }
  takeDamage(amount) { this.hp = Math.max(0, this.hp - amount); }
  isDead() { return this.hp <= 0; }

  getCollisionRect() {
    return {
      x: this.x + 40,
      y: this.y + 20,
      width: this.width - 80,
      height: this.height - 40
    };
  }

  update(delta) {
    const { mouse } = this.game.inputHandler;

    if (mouse.isDown && !this.isDragging) {
      this.isDragging = true;
      this.dragStart = { x: mouse.x, y: mouse.y };
      this.currentFrame = 0; // Reset animation when drag starts
    }

    if (this.isDragging) {
      this.dragCurrent = { x: mouse.x, y: mouse.y };
      const { vx, vy } = this.game.inputHandler.getDragVector();
      if (vx !== 0 || vy !== 0) {
        this.aimAngle = Math.atan2(vy, vx);
      }
    }

    if (!mouse.isDown && this.isDragging) {
      this.isDragging = false;
      this._fire();
      this.currentFrame = 0;
    }

    // --- UPDATED ANIMATION LOGIC ---
    this.animationTimer += delta;
    if (this.animationTimer >= this.frameSpeed) {
      this.animationTimer = 0;
      this.currentFrame++; // Continuously increment, we will constrain it in draw()
    }
    // -------------------------------

    for (const weaponKey in this.arsenal) {
      const weapon = this.arsenal[weaponKey];
      if (weapon.timeSinceLastFire < weapon.cooldown) weapon.timeSinceLastFire += delta;
    }
    for (const specialKey in this.specials) {
      const special = this.specials[specialKey];
      if (special.timeSinceLastFire < special.cooldown) special.timeSinceLastFire += delta;
    }

    this.projectiles = this.projectiles.filter(p => {
      p.update(delta);
      return p.isActive;
    });

    const enemies = this.game.waveManager.enemies || [];
    this.projectiles.forEach(proj => {
      enemies.forEach(enemy => {
        if (enemy.isAlive && Physics.checkCollision(proj, enemy)) {
          enemy.takeDamage(this.arsenal[proj.type].damage);
          proj.onHit(enemy);
          proj.isActive = false;
        }
      });
    });
  }

  _fire() {
    const { vx, vy } = this.game.inputHandler.getDragVector();
    if ((vx === 0 && vy === 0) || !this.fireWeapon()) return;
    const weaponData = this.arsenal[this.selectedWeapon];
    const startX = this.x + this.width * 0.7;
    const startY = this.y + this.height * 0.4;
    this.projectiles.push(new Projectile(this.game, startX, startY, vx, vy, this.selectedWeapon, weaponData.damage, weaponData.level));
  }

  /**
   * Draw Jo using specific 600x440 clipping.
   */
draw(ctx) {
    const sprite = this.isDragging 
      ? this.game.assetLoader?.images?.player_hold 
      : this.game.assetLoader?.images?.player_idle;

    if (sprite && sprite.complete) {
      let sx, sy, sw, sh, cropW, cropH;
      let targetHeight; 

      if (this.isDragging) {
        // 'Jo Catapult.png' (Transparent)
        const cols = 4;
        const rows = 2;
        
        sw = sprite.width / cols;
        sh = sprite.height / rows;
        
        const frameIndex = this.currentFrame % (cols * rows);
        sx = (frameIndex % cols) * sw;
        sy = Math.floor(frameIndex / cols) * sh;

        // --- ANTI-BLEED FIX ---
        // Shave 2 pixels off the bottom to hide the top of the next row
        cropW = sw;
        cropH = sh - 2; 

        targetHeight = 180; 

      } else {
        // 'jo.png' (Idle) 
        const headerOffsetY = 130; 
        const cols = 5; 
        const rows = 3;
        
        sw = sprite.width / cols;
        sh = (sprite.height - headerOffsetY) / rows;
        
        sx = 0;
        sy = headerOffsetY;

        cropW = sw;
        cropH = sh - 1;

        targetHeight = 140; 
      }

      ctx.save();
      
      // Calculate scale using the new cleanly cropped height
      const scale = targetHeight / cropH; 
      const drawW = cropW * scale; 
      const drawH = targetHeight;
      
      ctx.translate(this.x + this.width / 2, this.y + this.height);
      
      // Pass cropW and cropH into the drawImage function
      ctx.drawImage(sprite, sx, sy, cropW, cropH, -drawW / 2, -drawH, drawW, drawH);
      
      ctx.restore();
      
    } else {
      ctx.fillStyle = CONSTANTS.COLORS.PLAYER;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    this.projectiles.forEach(p => p.draw(ctx));

    // Trajectory prediction line
    if (this.isDragging && this.game.inputHandler.isDragging) {
      const { vx, vy } = this.game.inputHandler.getDragVector();
      const startX = this.x + this.width * 0.7;
      const startY = this.y + this.height * 0.4;
      const points = Physics.getTrajectoryPoints(startX, startY, vx, vy);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
