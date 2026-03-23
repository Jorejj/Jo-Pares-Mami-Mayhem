// Player.js – Represents Jo, the player character.
// Handles catapult drag-and-shoot mechanic, arsenal management, HP, and Kita economy.
// Uses Object Pooling for projectiles to reduce GC pressure.

class Player {
  constructor(game) {
    this.game = game;

    this.x = CONSTANTS.PLAYER_X;
    this.width = 160; 
    this.height = 160; 
    this.y = game.canvas.height - this.height - 100;

    this.maxHp = CONSTANTS.PLAYER_MAX_HP;
    this.hp = CONSTANTS.PLAYER_MAX_HP;

    this.kita = CONSTANTS.PLAYER_START_KITA;

    this.selectedWeapon = 'mami';
    this.arsenal = this._initArsenal();

    this.isDragging = false;
    this.isFiring = false; 
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.aimAngle = 0;

    this.animationTimer = 0;
    this.currentFrame = 0;
    this.frameSpeed = 250;  
    this._lastKnownState = null; 

    // ===== PROJECTILES (OBJECT POOLING) =====
    this.projectilePool = new ProjectilePool(game, 50);
    this.projectiles = this.projectilePool.getActive();
    
    this.specials = this._initSpecials();
    this.traps = []; 

    this._bindInput();
  }

  _initArsenal() {
    const arsenal = {};
    const AMMO_CONFIG = {
      'mami':  { isInfinite: true,  baseUses: 0,  usesPerLevel: 0 },
      'pares': { isInfinite: false, baseUses: 5,  usesPerLevel: 2 },
      'rice':  { isInfinite: false, baseUses: 3,  usesPerLevel: 1 } 
    };

    for (const [weaponKey, stats] of Object.entries(CONSTANTS.WEAPON_STATS)) {
      const ammoInfo = AMMO_CONFIG[weaponKey] || { isInfinite: true };
      arsenal[weaponKey] = {
        unlocked: stats.unlocked, damage: stats.baseDamage, level: 1, cooldown: stats.cooldown,
        timeSinceLastFire: 0, baseCost: stats.unlockCost, isInfinite: ammoInfo.isInfinite,
        baseUses: ammoInfo.baseUses || 0, usesPerLevel: ammoInfo.usesPerLevel || 0, usesLeft: 0, maxUses: 0
      };
    }
    return arsenal;
  }

  resetAmmo() {
    for (const key in this.arsenal) {
      const weapon = this.arsenal[key];
      if (!weapon.isInfinite) {
        weapon.maxUses = weapon.baseUses + ((weapon.level - 1) * weapon.usesPerLevel);
        weapon.usesLeft = weapon.maxUses;
      }
    }
  }

  _initSpecials() {
    const specials = {};
    const SPECIALS_CONFIG = {
      'calamansi': { cooldown: 30000, unlockCost: 150, effect: 'slow' },
      'chili':     { cooldown: 45000, unlockCost: 250, effect: 'burn' },
      'garlic':    { cooldown: 60000, unlockCost: 400, effect: 'spikes' } 
    };

    for (const [specialKey, stats] of Object.entries(SPECIALS_CONFIG)) {
      specials[specialKey] = {
        unlocked: false,
        cooldown: stats.cooldown,
        timeSinceLastFire: stats.cooldown, 
        baseCost: stats.unlockCost,
        effect: stats.effect
      };
    }
    return specials;
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => {
      if (this.game.currentState !== CONSTANTS.STATES.PLAYING) return;
      const key = e.key.toLowerCase();
      if (key === '1') this.selectWeapon('mami');
      else if (key === '2' && this.arsenal['pares'].unlocked) this.selectWeapon('pares');
      else if (key === '3' && this.arsenal['rice'].unlocked) this.selectWeapon('rice');
      else if (key === '4' && this.canUseSpecial('calamansi')) this.activateSpecial('calamansi');
      else if (key === '5' && this.canUseSpecial('chili')) this.activateSpecial('chili');
      else if (key === '6' && this.canUseSpecial('garlic')) this.activateSpecial('garlic');
    });
  }

  selectWeapon(weaponName) {
    if (this.arsenal[weaponName] && this.arsenal[weaponName].unlocked) {
      this.selectedWeapon = weaponName; return true;
    }
    return false;
  }

  canFireWeapon() {
    const weapon = this.arsenal[this.selectedWeapon];
    if (!weapon || weapon.timeSinceLastFire < weapon.cooldown) return false;
    if (!weapon.isInfinite && weapon.usesLeft <= 0) return false;
    return true;
  }

  fireWeapon() {
    if (!this.canFireWeapon()) return false;
    const weapon = this.arsenal[this.selectedWeapon];
    weapon.timeSinceLastFire = 0;
    if (!weapon.isInfinite) weapon.usesLeft--;
    return true;
  }

  canUseSpecial(specialName) {
    const special = this.specials[specialName];
    return special && special.unlocked && special.timeSinceLastFire >= special.cooldown;
  }

 // --- UPDATED ActivateSpecial in js/entities/Player.js ---
  activateSpecial(specialName) {
    if (!this.canUseSpecial(specialName)) return;
    const special = this.specials[specialName];
    special.timeSinceLastFire = 0; 
    
    // --- NEW: CUSTOM SOUNDS FOR SPECIALS ---
    let sfxKey = 'sfx_fmattack'; // Default fallback

    if (specialName === 'calamansi') {
        sfxKey = 'sfx_sticky'; // Play the sticky sound for the slow!
    } else if (specialName === 'chili') {
        sfxKey = 'sfx_rice_sizzle'; // Play the sizzle for the burn!
    } else if (specialName === 'garlic') {
        sfxKey = 'sfx_throw'; // Example generic throw sound
    }

    const audio = this.game.assetLoader?.audio?.[sfxKey];
    if (audio) { 
        audio.currentTime = 0; 
        audio.volume = 0.8 * (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1); 
        const p = audio.play(); 
        if(p && p.catch) p.catch(()=>{}); 
    }

    // Apply the actual effects to the game
    if (special.effect === 'spikes') {
      for (let i = 0; i < 15; i++) {
        // ... (Trap spawning logic remains the same) ...
        const spawnX = 250 + Math.random() * (this.game.canvas.width - 300); 
        const spawnY = CONSTANTS.GAME_BOTTOM_HALF + Math.random() * (this.game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - 80);
        this.traps.push({ x: spawnX, y: spawnY, width: 80, height: 80, damage: 150, active: true, timer: 20000 });
      }
    } else {
      const enemies = this.game.waveManager.getActiveEnemies
        ? this.game.waveManager.getActiveEnemies()
        : (this.game.waveManager.enemies || []);
      const enemyProjectiles = this.game.waveManager?.enemyProjectilePool?.getActive?.() || [];
         
      enemies.forEach(enemy => {
        if (!enemy.isAlive) return;
        // Bosses get a slight resilience to specials
        const isBoss = typeof enemy.type === 'string' && enemy.type.startsWith('boss_');
        const directSpecialDamage = special.effect === 'slow'
          ? (isBoss ? 14 : 10)
          : (isBoss ? 20 : 14);

        if (typeof enemy.takeDamage === 'function') {
          enemy.takeDamage(directSpecialDamage, true);
        }
        
        if (special.effect === 'slow') {
            const slowDur = isBoss ? 3500 : 5000;
            const slowFact = isBoss ? 0.6 : 0.4;
            enemy.applySlowStatus(slowDur, slowFact); 
        } else if (special.effect === 'burn') {
            const burnDur = isBoss ? 4000 : 6000;
            const burnDmg = isBoss ? 10 : 15;
            enemy.applyBurnStatus(burnDur, burnDmg); 
        }
      });

      enemyProjectiles.forEach((proj) => {
        if (!proj || !proj.isActive) return;

        if (special.effect === 'slow' && typeof proj.applySlowStatus === 'function') {
          proj.applySlowStatus(2500, 0.55);
          if (typeof proj.takeDamage === 'function') proj.takeDamage(5);
        } else if (special.effect === 'burn' && typeof proj.applyBurnStatus === 'function') {
          proj.applyBurnStatus(2600, 8);
          if (typeof proj.takeDamage === 'function') proj.takeDamage(8);
        }
      });
    }
  }

  getWeaponCooldownPercent(weaponName) {
    const weapon = this.arsenal[weaponName];
    if (weapon.cooldown === 0) return 100;
    return Math.min(100, (weapon.timeSinceLastFire / weapon.cooldown) * 100);
  }

  getSpecialCooldownPercent(specialName) {
    const special = this.specials[specialName];
    if (!special || special.cooldown === 0) return 0;
    return Math.min(100, (special.timeSinceLastFire / special.cooldown) * 100);
  }

  _playUI(sfxKey) {
      const audio = this.game.assetLoader?.audio?.[sfxKey];
      if (audio) { 
          audio.currentTime = 0; 
          audio.volume = 0.6 * (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1); 
          const p = audio.play(); 
          if (p && p.catch) p.catch(()=>{}); 
      }
  }

  unlockWeapon(weaponName) {
    const weapon = this.arsenal[weaponName];
    if (!weapon) return false;
    if (weapon.unlocked) {
        this.game.uiManager.showCustomAlert("ITEM UNLOCKED", "YOU ALREADY HAVE THIS ULAM!");
        return false;
    }
    if (this.kita < weapon.baseCost) {
        this.game.uiManager.showCustomAlert("NOT ENOUGH KITA", `KAILANGAN MO PA NG ${CONSTANTS.CURRENCY_SYMBOL}${weapon.baseCost - this.kita} PARA DITO!`);
        this._playUI('sfx_locked'); 
        return false;
    }
    this.kita -= weapon.baseCost;
    weapon.unlocked = true;
    this.resetAmmo(); 
    this.game.saveCurrentState(); 
    this._playUI('sfx_cash_register'); 
    return true;
  }

  unlockSpecial(specialName) {
    const special = this.specials[specialName];
    if (!special) return false;
    if (special.unlocked) {
        this.game.uiManager.showCustomAlert("SPECIAL UNLOCKED", "ALREADY HAVE THIS SAWSAWAN!");
        return false;
    }
    if (this.kita < special.baseCost) {
        this.game.uiManager.showCustomAlert("NOT ENOUGH KITA", `KAILANGAN MO PA NG ${CONSTANTS.CURRENCY_SYMBOL}${special.baseCost - this.kita} PARA DITO!`);
        this._playUI('sfx_locked');
        return false;
    }
    this.kita -= special.baseCost;
    special.unlocked = true;
    this.game.saveCurrentState(); 
    this._playUI('sfx_cash_register'); 
    return true;
  }

  upgradeWeapon(weaponName) {
    const weapon = this.arsenal[weaponName];
    if (!weapon || !weapon.unlocked) return false;
    
    if (weapon.level >= CONSTANTS.MAX_WEAPON_LEVEL) {
        this.game.uiManager.showCustomAlert("MAX LEVEL", "SAGAD NA ANG UPGRADE NITO!");
        this._playUI('sfx_locked');
        return false;
    }

    const costMultiplier = Math.pow(CONSTANTS.WEAPON_UPGRADE_COST_MULTIPLIER, weapon.level);
    const upgradeCost = Math.ceil(50 * costMultiplier);
    
    if (this.kita < upgradeCost) {
        this.game.uiManager.showCustomAlert("NOT ENOUGH KITA", `KAILANGAN MO PA NG ${CONSTANTS.CURRENCY_SYMBOL}${upgradeCost - this.kita} PARA SA UPGRADE!`);
        this._playUI('sfx_locked');
        return false;
    }
    
    this.kita -= upgradeCost;
    weapon.level++;
    weapon.damage += 5;
    this.resetAmmo(); 
    this.game.saveCurrentState(); 
    this._playUI('sfx_cash_register'); 
    return true;
  }

  addKita(amount) { 
    if (this.game.bossDefeatTimer > 0) return;
    this.kita += amount; 
  }
  takeDamage(amount) { 
    if (this.game.bossDefeatTimer > 0) return;
    this.hp = Math.max(0, this.hp - amount); 
    
    const audio = this.game.assetLoader?.audio?.sfx_jo_damage;
    if (audio) { 
        audio.currentTime = 0; 
        audio.volume = 0.8 * (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1); 
        const p = audio.play(); 
        if (p && p.catch) p.catch(()=>{}); 
    }
  }
  isDead() { return this.hp <= 0; }

  syncWithSave(state) {
    if (!state) return;
    this.kita = state.kita || 0;
    
    if (state.weaponLevels) {
      for (const [weaponKey, level] of Object.entries(state.weaponLevels)) {
        if (this.arsenal[weaponKey]) {
          this.arsenal[weaponKey].level = level;
          const baseStats = CONSTANTS.WEAPON_STATS[weaponKey];
          if (baseStats) this.arsenal[weaponKey].damage = baseStats.baseDamage + (level - 1) * 5;
        }
      }
    }

    if (state.weaponUnlocks) {
      for (const [weaponKey, unlocked] of Object.entries(state.weaponUnlocks)) {
        if (this.arsenal[weaponKey]) this.arsenal[weaponKey].unlocked = unlocked;
      }
    } else {
        this.arsenal['mami'].unlocked = true;
        this.arsenal['pares'].unlocked = false;
        this.arsenal['rice'].unlocked = false;
    }

    this.resetAmmo();

    if (state.weaponAmmo) {
      for (const [weaponKey, ammoLeft] of Object.entries(state.weaponAmmo)) {
        if (this.arsenal[weaponKey] && !this.arsenal[weaponKey].isInfinite) {
          this.arsenal[weaponKey].usesLeft = ammoLeft;
        }
      }
    }

    if (state.specialsData) {
      for (const [specialKey, data] of Object.entries(state.specialsData)) {
        if (this.specials[specialKey]) {
          this.specials[specialKey].unlocked = data.unlocked;
          this.specials[specialKey].timeSinceLastFire = data.timeSinceLastFire;
        }
      }
    } else if (state.specialUnlocks) {
      for (const [specialKey, unlocked] of Object.entries(state.specialUnlocks)) {
        if (this.specials[specialKey]) this.specials[specialKey].unlocked = unlocked;
      }
    }
  }

  update(delta) {
    const stirAudio = this.game.assetLoader?.audio?.sfx_stir;
    if (stirAudio) {
      if (this.game.currentState === CONSTANTS.STATES.PLAYING && !this.isDragging && !this.isFiring && !this.isDead()) {
        if (stirAudio.paused) {
          stirAudio.loop = true; stirAudio.volume = 0.5 * (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1); 
          const p = stirAudio.play(); if (p && p.catch) p.catch(() => {});
        }
      } else { stirAudio.pause(); }
    }
    
    if (this.game && this.game.currentState !== this._lastKnownState) {
      this.currentFrame = 0; this._lastKnownState = this.game.currentState;
    }

    const { mouse } = this.game.inputHandler;

    // --- RELOAD STATE CHECK ---
    const weapon = this.arsenal[this.selectedWeapon];
    const isReloading = weapon && weapon.timeSinceLastFire < weapon.cooldown;

    if (mouse.isDown && !this.isDragging && !this.isFiring && !isReloading) {
      this.isDragging = true; this.dragStart = { x: mouse.x, y: mouse.y }; this.currentFrame = 0; 
    }

    if (this.isDragging) {
      if (isReloading) {
        // Cancel dragging if we somehow enter reload state (e.g. switch weapon)
        this.isDragging = false;
      } else {
        this.dragCurrent = { x: mouse.x, y: mouse.y };
        const { vx, vy } = this.game.inputHandler.getDragVector();
        if (vx !== 0 || vy !== 0) this.aimAngle = Math.atan2(vy, vx);
      }
    }

    if (!mouse.isDown && this.isDragging) {
      this.isDragging = false; this._fire();
      this.isFiring = true; this.currentFrame = 3; this.animationTimer = 0;
    }

    this.animationTimer += delta;

    if (this.isFiring) {
      if (this.animationTimer >= 100) {
        this.animationTimer = 0; this.currentFrame++;
        if (this.currentFrame > 4) { this.isFiring = false; this.currentFrame = 0; }
      }
    } else {
      if (this.animationTimer >= this.frameSpeed) {
        this.animationTimer = 0; this.currentFrame++; 
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

    this.projectilePool.update(delta);
    this.projectiles = this.projectilePool.getActive();
    
    const enemyProjectiles = this.game.waveManager?.enemyProjectilePool?.getActive() || [];
    const enemies = this.game.waveManager.getActiveEnemies ? this.game.waveManager.getActiveEnemies() : (this.game.waveManager.enemies || []);

    // --- MANAGE GARLIC TRAPS ---
    this.traps = this.traps.filter(t => t.active && t.timer > 0);
    this.traps.forEach(trap => {
      trap.timer -= delta;
      if (trap.timer <= 0) trap.active = false;
      
      enemies.forEach(enemy => {
        if (enemy.isAlive && trap.active && enemy.state !== 'dead') {
          if (trap.x < enemy.x + enemy.width && trap.x + trap.width > enemy.x &&
              trap.y < enemy.y + enemy.height && trap.y + trap.height > enemy.y) {
              
              enemy.takeDamage(trap.damage);
              trap.active = false; 
              
              const hitSfx = this.game.assetLoader?.audio?.sfx_hit;
              if (hitSfx) { hitSfx.currentTime = 0; const p = hitSfx.play(); if(p && p.catch) p.catch(()=>{}); }
          }
        }
      });
    });

    // ===== MID-AIR PROJECTILE & ENEMY COLLISION =====
    this.projectiles.forEach(playerProj => {
      if (!playerProj.isActive) return;
      
      // 1. Check Collision Against Enemy Projectiles
      enemyProjectiles.forEach(enemyProj => {
        if (!enemyProj.isActive) return;
        
        const dx = playerProj.x - enemyProj.x;
        const dy = playerProj.y - enemyProj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const collisionDist = (playerProj.radius || 20) + (enemyProj.radius || 20);
        
        if (dist < collisionDist) {
          playerProj.isActive = false;

          // Trigger pares split logic even when impact target is an enemy projectile.
          if (playerProj.type === 'pares' && typeof playerProj.onHit === 'function') {
            playerProj.onHit(enemyProj);
          }

          if (playerProj.type === 'rice' && typeof enemyProj.applyBurnStatus === 'function') {
            const burnDamageScaling = [2, 4, 8, 12, 16];
            const tickDamage = burnDamageScaling[(playerProj.level || 1) - 1] || 2;
            enemyProj.applyBurnStatus(2200, tickDamage);
            if (typeof enemyProj.takeDamage === 'function') enemyProj.takeDamage(Math.max(1, Math.ceil((playerProj.damage || 8) * 0.35)));
          }

          if (playerProj.type === 'pares' && typeof enemyProj.takeDamage === 'function') {
            enemyProj.takeDamage(Math.max(1, Math.ceil((playerProj.damage || 10) * 0.45)));
          }

          // Apply direct-hit damage for food projectiles that should break enemy projectiles immediately.
          if (playerProj.type === 'mami' || playerProj.type === 'cola' || playerProj.type === 'pares_split') {
            const weaponDamage = this.arsenal[playerProj.type]?.damage || playerProj.damage || 10;
            if (typeof enemyProj.takeDamage === 'function') {
              enemyProj.takeDamage(weaponDamage);
            } else {
              enemyProj.isActive = false;
            }
          }
          
          const hitSfx = this.game.assetLoader?.audio?.sfx_hit;
          if (hitSfx) {
            hitSfx.currentTime = 0;
            hitSfx.volume = 0.4 * (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1);
            const p = hitSfx.play();
            if (p && p.catch) p.catch(() => {});
          }
        }
      });

// 2. Check Collision Against Enemies
      enemies.forEach(enemy => {
        if (!enemy.isAlive || !playerProj.isActive) return;
        const collisionTarget = (typeof enemy.getCollisionRect === 'function') ? enemy.getCollisionRect() : enemy;
        if (Physics.checkCollision(playerProj, collisionTarget)) {
          const weaponDamage = this.arsenal[playerProj.type]?.damage || playerProj.damage;
          enemy.takeDamage(weaponDamage);

          const isBoss = typeof enemy.type === 'string' && enemy.type.startsWith('boss_');
          if (playerProj.type === 'rice' && typeof enemy.applyBurnStatus === 'function') {
            const burnDamageScaling = [2, 4, 8, 12, 16];
            const tickDamage = burnDamageScaling[(playerProj.level || 1) - 1] || 2;
            enemy.applyBurnStatus(isBoss ? 2200 : 3200, isBoss ? Math.max(1, tickDamage - 1) : tickDamage);
          }

          if (playerProj.onHit) playerProj.onHit(enemy); 
          playerProj.isActive = false;
          
          // --- FIXED: CUSTOM FOOD IMPACT SOUNDS ---
          let hitSfxKey = 'sfx_hit'; // Default fallback
          
          if (playerProj.type === 'mami') {
              hitSfxKey = 'sfx_mami_impact'; 
          } else if (playerProj.type === 'pares') {
              hitSfxKey = 'sfx_pares_split'; 
          } else if (playerProj.type === 'rice') {
              hitSfxKey = 'sfx_rice_sizzle';
          }

          const hitSfx = this.game.assetLoader?.audio?.[hitSfxKey];
          if (hitSfx) {
              hitSfx.currentTime = 0;
              hitSfx.volume = 0.6; 
              const p = hitSfx.play();
              if (p && p.catch) p.catch(() => {});
          }
        }
      });
    });
    
    // ===== ENEMY PROJECTILE vs PLAYER COLLISION =====
    enemyProjectiles.forEach(enemyProj => {
      if (!enemyProj.isActive) return;
      
      const dx = this.x + this.width / 2 - enemyProj.x;
      const dy = this.y + this.height / 2 - enemyProj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const collisionDist = (this.width / 3) + (enemyProj.radius || 8);
      
      if (dist < collisionDist) {
        const damage = enemyProj.damage || 10;
        this.takeDamage(damage);
        enemyProj.isActive = false;
        
        const hurtSfx = this.game.assetLoader?.audio?.sfx_jo_damage;
        if (hurtSfx) {
          hurtSfx.currentTime = 0;
          hurtSfx.volume = 0.6;
          const p = hurtSfx.play();
          if (p && p.catch) p.catch(() => {});
        }
      }
    });
  }

 _fire() {
    const { vx, vy } = this.game.inputHandler.getDragVector();
    if ((vx === 0 && vy === 0) || !this.fireWeapon()) return;
    const weaponData = this.arsenal[this.selectedWeapon];
    const startX = this.x + this.width * 0.7; const startY = this.y + this.height * 0.4;
    
    const audio = this.game.assetLoader?.audio?.sfx_slingshot;
    if (audio) { 
      audio.currentTime = 0; 
      audio.volume = 0.8 * (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1); 
      const p = audio.play(); 
      if (p && p.catch) p.catch(() => {}); 
    }

    this.projectilePool.fire(startX, startY, vx, vy, this.selectedWeapon, weaponData.damage, weaponData.level);
    this.projectiles = this.projectilePool.getActive();
  }
  
  draw(ctx) {
    const sprite = this.game.assetLoader?.images?.player; 
    const reload1 = this.game.assetLoader?.images?.jo_reload;
    const reload2 = this.game.assetLoader?.images?.jo_reload2;

    const weapon = this.arsenal[this.selectedWeapon];
    const isReloading = weapon && weapon.timeSinceLastFire < weapon.cooldown;

    if (sprite && sprite.complete) {
      const cols = 5; const rows = 3;
      const sw = sprite.width / cols; const sh = sprite.height / rows;
      let row = 0; let frame = 0;
      const state = this.game.currentState;

      // Determine Animation State
      if (state === CONSTANTS.STATES.VICTORY || state === CONSTANTS.STATES.SHOP) { 
        row = 0; frame = 3 + (this.currentFrame % 2); 
      } 
      else if (state === CONSTANTS.STATES.GAMEOVER) { 
        row = 2; frame = Math.min(4, this.currentFrame); 
      }
      else if (isReloading) {
        // Draw reload special sprites if available
        const reloadSprite = (Math.floor(Date.now() / 200) % 2 === 0) ? reload1 : reload2;
        if (reloadSprite && reloadSprite.complete) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height);
            const cartImg = this.game.assetLoader?.images?.jo_cart;
            if (cartImg && cartImg.complete) ctx.drawImage(cartImg, -this.width * 2.2, -300 -15, 550, 300);
            
            // Reload sprites might have different dimensions, but let's draw them in character space
            ctx.drawImage(reloadSprite, -this.width / 2, -this.height, this.width, this.height);
            
            const tableImg = this.game.assetLoader?.images?.table;
            const chairImg = this.game.assetLoader?.images?.chair;
            if (tableImg && tableImg.complete) ctx.drawImage(tableImg, 76, -90 + 60, 100, 90);
            if (chairImg && chairImg.complete) { ctx.drawImage(chairImg, 150, -50 + 55, 60, 50); ctx.drawImage(chairImg, 56, -50 + 60, 60, 50); }
            ctx.restore();

            // Draw "RELOADING" text above Jo
            ctx.save();
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 20px "Comic Sans MS", sans-serif';
            ctx.textAlign = 'center';
            const bounce = Math.sin(Date.now() / 150) * 5;
            ctx.strokeText("RELOADING...", this.x + this.width/2, this.y - 20 + bounce);
            ctx.fillText("RELOADING...", this.x + this.width/2, this.y - 20 + bounce);
            ctx.restore();

            const sackImg = this.game.assetLoader?.images?.sack;
            if (sackImg && sackImg.complete) ctx.drawImage(sackImg, 0, this.game.canvas.height - 140, 350, 140);
            return; // Exit draw early for reloading
        }
        // Fallback to normal if reload sprites missing
        row = 0; frame = 0;
      }
      else if (this.isFiring) { row = 1; frame = this.currentFrame; }
      else if (this.isDragging) {
        row = 1; 
        const dragDist = Physics.getDistance(this.dragStart.x, this.dragStart.y, this.dragCurrent.x, this.dragCurrent.y);
        frame = Math.min(2, Math.floor(dragDist / 40)); 
      } 
      else { row = 0; frame = this.currentFrame % 3; }

      const sx = frame * sw; const sy = row * sh;

      ctx.save(); ctx.translate(this.x + this.width / 2, this.y + this.height);

      const cartImg = this.game.assetLoader?.images?.jo_cart;
      if (cartImg && cartImg.complete) ctx.drawImage(cartImg, -this.width * 2.2, -300 -15, 550, 300);

      ctx.drawImage(sprite, sx, sy, sw, sh, -this.width / 2, -this.height, this.width, this.height);

      const tableImg = this.game.assetLoader?.images?.table;
      const chairImg = this.game.assetLoader?.images?.chair;
      if (tableImg && tableImg.complete) ctx.drawImage(tableImg, 76, -90 + 60, 100, 90);
      if (chairImg && chairImg.complete) { ctx.drawImage(chairImg, 150, -50 + 55, 60, 50); ctx.drawImage(chairImg, 56, -50 + 60, 60, 50); }
      ctx.restore();

      const sackImg = this.game.assetLoader?.images?.sack;
      if (sackImg && sackImg.complete) ctx.drawImage(sackImg, 0, this.game.canvas.height - 140, 350, 140);
    } else {
      ctx.fillStyle = CONSTANTS.COLORS.PLAYER; ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    const specSheet = this.game.assetLoader?.images?.specialsSheet;
    this.traps.forEach(trap => {
      if (specSheet && specSheet.complete) {
        const fw = specSheet.width / 5;
        const fh = specSheet.height / 3;
        const sx = 4 * fw; 
        const sy = 2 * fh; 
        
        ctx.save();
        if (trap.timer < 3000 && Math.floor(trap.timer / 150) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        const drawSize = 60; 
        const drawX = trap.x + (trap.width - drawSize) / 2;
        const drawY = trap.y + (trap.height - drawSize) / 2;
        
        ctx.drawImage(specSheet, sx, sy, fw, fh, drawX, drawY, drawSize, drawSize);
        ctx.restore();
      }
    });

    this.projectilePool.draw(ctx);

    if (this.isDragging && this.game.inputHandler.isDragging) {
      const { vx, vy } = this.game.inputHandler.getDragVector();
      const startX = this.x + this.width * 0.7; const startY = this.y + this.height * 0.4;
      const points = Physics.getTrajectoryPoints(startX, startY, vx, vy);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.setLineDash([]);
    }

    if (this.game.enemyProjectiles) {
        this.game.enemyProjectiles.forEach(ep => ep.draw(ctx));
    }
  }
}
