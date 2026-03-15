// Player.js – Represents Jo, the player character.
// Handles catapult drag-and-shoot mechanic, arsenal management, HP, and Kita economy.

class Player {
  constructor(game) {
    this.game = game;

    // ===== POSITION & DISPLAY =====
    this.x = CONSTANTS.PLAYER_X;
    this.width = 160; 
    this.height = 160; 

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
    this.isFiring = false; // NEW: Tracks the release animation!
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.aimAngle = 0;

    // ===== ANIMATION STATE =====
    this.animationTimer = 0;
    this.currentFrame = 0;
    this.frameSpeed = 250;  // CHANGED: Increased from 150 to 250 to slow down the idle stirring
    this._lastKnownState = null; 

    // ===== PROJECTILES =====
    this.projectiles = [];
    this.specials = this._initSpecials();

    this._bindInput();
  }

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
    // RESET animation frame when transitioning between Game States
    if (this.game && this.game.currentState !== this._lastKnownState) {
      this.currentFrame = 0;
      this._lastKnownState = this.game.currentState;
    }

    const { mouse } = this.game.inputHandler;

    if (mouse.isDown && !this.isDragging && !this.isFiring) {
      this.isDragging = true;
      this.dragStart = { x: mouse.x, y: mouse.y };
      this.currentFrame = 0; 
    }

    if (this.isDragging) {
      this.dragCurrent = { x: mouse.x, y: mouse.y };
      const { vx, vy } = this.game.inputHandler.getDragVector();
      if (vx !== 0 || vy !== 0) {
        this.aimAngle = Math.atan2(vy, vx);
      }
    }

    // ON MOUSE RELEASE
    if (!mouse.isDown && this.isDragging) {
      this.isDragging = false;
      this._fire();
      
      // TRIGGER THE FOLLOW-THROUGH ANIMATION
      this.isFiring = true;
      this.currentFrame = 3; // Jump directly to frame 3 (the swing)
      this.animationTimer = 0;
    }

    // --- UPDATED ANIMATION LOGIC ---
    this.animationTimer += delta;

    if (this.isFiring) {
      // Play the firing animation super fast (100ms per frame)
      if (this.animationTimer >= 100) {
        this.animationTimer = 0;
        this.currentFrame++;
        if (this.currentFrame > 4) {
          // Finish firing, return to idle
          this.isFiring = false;
          this.currentFrame = 0;
        }
      }
    } else {
      // Normal animation speed for idle, win, and lose
      if (this.animationTimer >= this.frameSpeed) {
        this.animationTimer = 0;
        this.currentFrame++; 
      }
    }

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

  draw(ctx) {
    const sprite = this.game.assetLoader?.images?.player; 

    if (sprite && sprite.complete) {
      const cols = 5;
      const rows = 3;
      
      const sw = sprite.width / cols;
      const sh = sprite.height / rows;

      let row = 0;
      let frame = 0;

      const state = this.game.currentState;

      // 1. WINNING / SHOP MENU STATE
      if (state === CONSTANTS.STATES.VICTORY || state === CONSTANTS.STATES.SHOP) {
        row = 0; 
        frame = 3 + (this.currentFrame % 2); 
      } 
      // 2. GAME OVER STATE
      else if (state === CONSTANTS.STATES.GAMEOVER) {
        row = 2; 
        frame = Math.min(4, this.currentFrame); 
      }
      // 3. FIRING STATE (He just let go of the mouse)
      else if (this.isFiring) {
        row = 1;
        frame = this.currentFrame; // Plays frames 3 and 4 smoothly
      }
      // 4. DRAGGING STATE (Aiming)
      else if (this.isDragging) {
        row = 1; 
        const dragDist = Physics.getDistance(this.dragStart.x, this.dragStart.y, this.dragCurrent.x, this.dragCurrent.y);
        // FIX: Cap the frame at 2! He will only pull back, not swing, while dragging
        frame = Math.min(2, Math.floor(dragDist / 40)); 
      } 
      // 5. IDLE STATE
      else {
        row = 0; 
        frame = this.currentFrame % 3; // Only loops frames 0, 1, 2
      }

      const sx = frame * sw;
      const sy = row * sh;
      
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height);
      
      ctx.drawImage(sprite, sx, sy, sw, sh, -this.width / 2, -this.height, this.width, this.height);
      
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