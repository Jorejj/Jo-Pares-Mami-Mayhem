// BossMalu.js – Final multi-phase boss
// Phase 1: Kap-style ranged cycle
// Phase 2: Ian-style summoner/dodger
// Phase 3: Aura DPS check

class BossMalu extends Enemy {
  constructor(game) {
    super(game, 'boss_final');
    this._bossMaluOwnerId = `boss_malu_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    this.init();
  }

init(config = {}) {
    // --- FEATURE 3: DYNAMIC DIFFICULTY SCALING (EASY = 1x, MEDIUM = 1.5x, HARD = 2x) ---
    const diffKey = this.game.currentDifficultyKey || 'easy';
    const statMult = diffKey === 'hard' ? 2.0 : (diffKey === 'medium' ? 1.5 : 1.0);
    const speedMult = diffKey === 'hard' ? 1.4 : (diffKey === 'medium' ? 1.2 : 1.0);

    this.type = 'boss_malu';
    this.spriteKey = config.spriteKey || 'boss_mastermind';
    this.projectileSpriteKey = config.projectileSpriteKey || 'boss3_proj';
    this.auraSpriteKey = config.auraSpriteKey || 'boss3_aura';
    
    this.width = config.width ?? 130;
    this.height = config.height ?? 240;
    
    // Scaled Damage & Kita Reward
    this.damage = (config.damage ?? 45) * statMult;
    this.kitaReward = (config.kitaReward ?? 1500) * statMult;

    // --- FIXED: Scaled HP properly saved into the dictionaries! ---
    this.baseHp = (config.baseHp ?? 1000) * statMult;
    
    this.phaseMax = {
      KAP: this.baseHp,
      IAN: Math.round(this.baseHp * 1.2),
      AURA: Math.round(this.baseHp * 1.5)
    };
    
    this.phaseHp = {
      KAP: this.phaseMax.KAP,
      IAN: this.phaseMax.IAN,
      AURA: this.phaseMax.AURA
    };

    this.maxHp = this.phaseMax.KAP + this.phaseMax.IAN + this.phaseMax.AURA;
    this.hp = this.maxHp;
    
    // Scaled Speed
    this.baseSpeed = (config.speed ?? 1.0) * speedMult;
    this.speed = this.baseSpeed;

    this.x = config.spawnX ?? (this.game.canvas.width + 80);
    this.y = config.spawnY ?? (
      Math.random() * (this.game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) + CONSTANTS.GAME_BOTTOM_HALF
    );
    this.drawX = this.x;
    this.drawY = this.y;

    this.centerX = config.centerX ?? (this.game.canvas.width / 2 - this.width / 2);
    this.centerY = config.centerY ?? (
      CONSTANTS.GAME_BOTTOM_HALF + ((this.game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) / 2)
    );
    this.ianX = config.ianX ?? (this.game.canvas.width - 260);
    this.yDirection = 1;

    this.phase = 'KAP';
    this.kapState = 'MOVING'; 
    this.attackCounter = 0;
    
    // Scaled attack and summon counts
    this.maxAttacks = diffKey === 'hard' ? 5 : (diffKey === 'medium' ? 4 : 3);
    this.attackCooldown = diffKey === 'hard' ? 1000 : (diffKey === 'medium' ? 1500 : 2000);
    this.timeSinceLastAttack = 0;
    this.vulnerableTimer = 0;
    this.vulnerableDuration = 5000;

    this.ianSummonTimer = 0;
    this.ianSummonInterval = 8000;
    this.ianSummonCount = diffKey === 'hard' ? 5 : (diffKey === 'medium' ? 4 : 2);
    this.ianCancelledTimer = 0;
    this.ianCancelledDuration = 4000;
    this.ianCancelledTransitionTimer = 0;
    this.ianWasCancelled = false;

    this.auraDamageTimer = 0;
    this.auraTickInterval = 2000;
    this.auraDamagePerTick = config.auraDamage ?? 3;
    this.auraAnimTimer = 0;
    this.auraFrame = 0;

    this.isTransitioning = false;
    this.transitionTo = null;
    this.transitionTimer = 0;
    this.transitionDuration = 0;
    this.transitionPoseFrame = 1;

    this.isInvincible = true;
    this.panting = false;
    this.hurtFlashTimer = 0;
    this.currentRow = 0;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameDelay = 130;

    this.deathFrame = 3;
    this.deathAnimTimer = 0;
    this.deathHoldTimer = 0;
    this.deathHoldDuration = 900;
    this.rewardGiven = false;
    this.walkSfxTimer = 0;
    this.introPlayed = false;
    this.auraTauntPlayed = false;

    this.state = 'walk';
    this.alpha = 1;
    this.isAlive = true;
    this.alive = true;
  }

  applySlowStatus(duration, factor) {
    if (this.phase === 'AURA') {
      const reducedDuration = duration * 0.4;
      const reducedFactor = 1 - ((1 - factor) * 0.35);
      super.applySlowStatus(reducedDuration, reducedFactor);
      return;
    }
    super.applySlowStatus(duration, factor);
  }

  applyBurnStatus(duration, damagePerTick) {
    if (this.phase === 'AURA') {
      super.applyBurnStatus(duration * 0.45, damagePerTick * 0.45);
      return;
    }
    super.applyBurnStatus(duration, damagePerTick);
  }

  hasActiveMinions() {
    const activeEnemies = this.game.waveManager?.getActiveEnemies?.() || this.game.waveManager?.activeEnemies || [];
    for (let i = 0; i < activeEnemies.length; i++) {
      const enemy = activeEnemies[i];
      if (!enemy || !enemy.isAlive || enemy === this) continue;
      if (enemy.__bossMaluOwnerId === this._bossMaluOwnerId) return true;
    }
    return false;
  }

  _playSfx(key, volume = 0.75) {
    const audio = this.game.assetLoader?.audio?.[key];
    if (!audio || typeof audio.play !== 'function') return;
    audio.currentTime = 0;
    audio.volume = (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1) * volume;
    this._playAudioSafe(audio);
  }

  _playRandomSfx(keys, volume = 0.75) {
    if (!Array.isArray(keys) || keys.length === 0) return;
    const key = keys[Math.floor(Math.random() * keys.length)];
    this._playSfx(key, volume);
  }

  _drawShieldEffect(ctx) {
    if (!this.isInvincible || this.state === 'dead') return;
    if (this.phase === 'KAP' && this.kapState === 'VULNERABLE') return;
    if (this.phase === 'AURA') return;

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const shieldRadius = Math.max(this.width, this.height) / 2 + 10;

    ctx.save();
    const pulseIntensity = 0.3 + 0.2 * Math.sin(Date.now() / 300);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + pulseIntensity})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _startTransition(nextPhase, duration, poseFrame) {
    this.isTransitioning = true;
    this.transitionTo = nextPhase;
    this.transitionDuration = duration;
    this.transitionTimer = duration;
    this.transitionPoseFrame = poseFrame;
    this.isInvincible = true;
    this.state = 'hurt';
    this.currentRow = 2;
    this.currentFrame = poseFrame;
    this.hurtFlashTimer = Math.max(this.hurtFlashTimer, 300);
    this._playSfx('sfx_malupiton_pain', 0.85);
  }

  _finishTransition() {
    this.isTransitioning = false;
    this.phase = this.transitionTo;
    this.transitionTo = null;
    this.transitionTimer = 0;

    if (this.phase === 'IAN') {
      this.kapState = 'ATTACKING';
      this.x = this.ianX;
      this.ianSummonTimer = 0;
      this._summonPhase2Minions();
      this.state = 'walk';
      this.currentRow = 0;
      this.currentFrame = 0;
      this.isInvincible = this.hasActiveMinions();
      return;
    }

    if (this.phase === 'AURA') {
      this.state = 'attack';
      this.currentRow = 2;
      this.currentFrame = 0;
      this.auraDamageTimer = 0;
      this.auraAnimTimer = 0;
      this.auraFrame = 0;
      this.isInvincible = false;
      if (!this.auraTauntPlayed) {
        this.auraTauntPlayed = true;
        this._playRandomSfx(['sfx_malupiton_win'], 0.8);
      }
    }
  }

  _applyPhaseDamage(amount, ignoreInvincible = false) {
    if (this.state === 'dead' || !this.isAlive) return;
    if (this.isTransitioning && !ignoreInvincible) return;
    if (this.isInvincible && !ignoreInvincible) return;

    if (this.phase === 'KAP') {
      this.phaseHp.KAP -= amount;
      if (this.phaseHp.KAP <= 0) {
        this.phaseHp.KAP = 0;
        this._startTransition('IAN', 2000, 1);
      }
    } else if (this.phase === 'IAN') {
      this.phaseHp.IAN -= amount;
      if (this.phaseHp.IAN <= 0) {
        this.phaseHp.IAN = 0;
        this._startTransition('AURA', 2500, 2);
      }
    } else if (this.phase === 'AURA') {
      this.phaseHp.AURA -= amount;
      if (this.phaseHp.AURA <= 0) {
        this.phaseHp.AURA = 0;
        this.state = 'dead';
        this.currentRow = 2;
        this.currentFrame = 3;
        this.deathFrame = 3;
        this.deathAnimTimer = 0;
        this.deathHoldTimer = 0;
        this.isInvincible = false;

        // --- STOP AURA SFX & RESTORE BGM ---
        const winSfx = this.game.assetLoader?.audio?.['sfx_malupiton_win'];
        if (winSfx) {
            winSfx.loop = false;
            winSfx.pause();
            winSfx.currentTime = 0;
        }
        const bgm = this.game.assetLoader?.audio?.['bgm_malupiton_background'];
        if (bgm && bgm === this.game.currentBgmTrack) {
            bgm.volume = this.game.uiManager.masterVolume * 0.3; // Restore to default BGM volume
        }

        if (!this.rewardGiven) {
          this.rewardGiven = true;
          if (this.game.player) this.game.player.addKita(this.kitaReward);
      
        }
      }
    }

    this.hp = this.phaseHp.KAP + this.phaseHp.IAN + this.phaseHp.AURA;
  }

  _updateStatusEffects(delta) {
    if (this.slowActive) {
      this.slowDuration -= delta;
      if (this.slowDuration <= 0) {
        this.slowActive = false;
        this.slowFactor = 1;
        this.updateSpeed();
      }
    }

    if (this.burnActive && this.state !== 'dead') {
      this.burnDuration -= delta;
      const now = Date.now();
      if (now - this.lastBurnTick >= 120) {
        this._applyPhaseDamage(this.burnDamagePerTick, false);
        this.lastBurnTick = now;
      }
      if (this.burnDuration <= 0) {
        this.burnActive = false;
      }
    }
  }

  _fireKapProjectile() {
    const projectilePool = this.game.waveManager?.enemyProjectilePool;
    if (!projectilePool) return;

    const player = this.game.player;
    const pX = player.x + player.width / 2;
    const pY = player.y + player.height / 2;
    const startX = this.x + this.width * 0.1;
    const startY = this.y + this.height * 0.28;
    // Use boss3 fist projectile consistently for clearer phase-1 identity.
    projectilePool.fire(startX, startY, pX, pY, this.damage, 'vial', this.projectileSpriteKey);
    this._playRandomSfx(
      ['sfx_malupiton_attack', 'sfx_malupiton_attack2', 'sfx_malupiton_attack_w_scream'],
      0.65
    );
  }

  _summonPhase2Minions() {
    const enemyPool = this.game.waveManager?.enemyPool;
    if (!enemyPool) return;

    const options = ['gangster', 'dog'];
    for (let i = 0; i < this.ianSummonCount; i++) {
      const type = options[Math.floor(Math.random() * options.length)];
      const minion = enemyPool.get(type);
      if (!minion) continue;
      minion.__bossMaluOwnerId = this._bossMaluOwnerId;
      minion.x = this.x - 24 - (i % 2) * 26;
      minion.y = Math.max(
        CONSTANTS.GAME_BOTTOM_HALF,
        Math.min(this.game.canvas.height - minion.height, this.y + ((i - 1.5) * 24))
      );
      minion.drawX = minion.x;
      minion.drawY = minion.y;
    }
    this._playSfx('sfx_malupiton_scream', 0.8);
    this.isInvincible = this.hasActiveMinions();
  }

  _enterIanCancelled() {
    this.ianWasCancelled = true;
    this.ianCancelledTimer = 0;
    this.ianCancelledTransitionTimer = 220;
    this.state = 'hurt';
    this.currentRow = 2;
    this.currentFrame = 1;
    this.isInvincible = false;
    this._playSfx('sfx_malupiton_scream', 0.85);
  }

  _updateKapPhase(delta) {
    this.state = 'walk';
    this.panting = false;
    this.frameTimer += delta;

    if (this.kapState === 'MOVING') {
      this.isInvincible = true;
      this.currentRow = 0;
      if (this.frameTimer >= this.frameDelay) {
        this.frameTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % 5;
      }

      const dx = this.centerX - this.x;
      const dy = this.centerY - this.y;
      const dist = Math.hypot(dx, dy);
      const moveSpeed = Math.max(1.2, this.speed);
      if (dist > 18) {
        this.x += (dx / dist) * moveSpeed;
        this.y += (dy / dist) * moveSpeed;
        this.walkSfxTimer += delta;
        if (this.walkSfxTimer >= 700) {
          this.walkSfxTimer = 0;
          this._playSfx('sfx_malupiton_walk', 0.25);
        }
      } else {
        this.kapState = 'ATTACKING';
        this.attackCounter = 0;
        this.timeSinceLastAttack = this.attackCooldown;
      }
      return;
    }

    if (this.kapState === 'ATTACKING') {
      this.isInvincible = true;
      this.state = 'attack';
      this.currentRow = 1;
      if (this.frameTimer >= this.frameDelay) {
        this.frameTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % 5;
      }
      this.timeSinceLastAttack += delta;

      if (this.attackCounter < this.maxAttacks && this.timeSinceLastAttack >= this.attackCooldown) {
        this.timeSinceLastAttack = 0;
        this.attackCounter++;
        this._fireKapProjectile();
      }

      if (this.attackCounter >= this.maxAttacks) {
        this.kapState = 'VULNERABLE';
        this.vulnerableTimer = 0;
        this.currentRow = 2;
        this.currentFrame = 1;
      }
      return;
    }

    this.isInvincible = false;
    this.panting = true;
    this.state = 'hurt';
    this.currentRow = 2;
    this.currentFrame = 1;
    this.vulnerableTimer += delta;
    if (this.vulnerableTimer >= this.vulnerableDuration) {
      this.kapState = 'ATTACKING';
      this.attackCounter = 0;
      this.timeSinceLastAttack = 0;
      this.currentFrame = 0;
      this.panting = false;
    }
  }

  _updateIanPhase(delta) {
    if (this.ianWasCancelled) {
      this.state = 'hurt';
      this.currentRow = this.ianCancelledTransitionTimer > 0 ? 1 : 2;
      this.currentFrame = this.ianCancelledTransitionTimer > 0 ? 4 : 1;
      this.isInvincible = false;
      this.ianCancelledTimer += delta;
      if (this.ianCancelledTransitionTimer > 0) this.ianCancelledTransitionTimer -= delta;

      if (this.ianCancelledTimer >= this.ianCancelledDuration) {
        this.ianWasCancelled = false;
        this.ianCancelledTimer = 0;
        this.ianSummonTimer = 0;
        this._summonPhase2Minions();
      }
      return;
    }

    this.state = 'walk';
    this.currentRow = 0;
    this.frameTimer += delta;
    if (this.frameTimer >= this.frameDelay) {
      this.frameTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 5;
    }
    this.x = this.ianX;
    this.walkSfxTimer += delta;
    if (this.walkSfxTimer >= 700) {
      this.walkSfxTimer = 0;
      this._playSfx('sfx_malupiton_walk', 0.25);
    }

    const minY = CONSTANTS.GAME_BOTTOM_HALF;
    const maxY = this.game.canvas.height - this.height;
    const dodgeSpeed = Math.max(2.8, this.speed * 3.2);
    this.y += this.yDirection * dodgeSpeed;
    if (this.y <= minY) {
      this.y = minY;
      this.yDirection = 1;
    } else if (this.y >= maxY) {
      this.y = maxY;
      this.yDirection = -1;
    }

    this.ianSummonTimer += delta;
    if (this.ianSummonTimer >= this.ianSummonInterval) {
      this.ianSummonTimer = 0;
      this._summonPhase2Minions();
    }

    this.isInvincible = this.hasActiveMinions();
  }

  _updateAuraPhase(delta) {
    this.state = 'attack';
    this.currentRow = 2;
    this.currentFrame = 0;
    this.isInvincible = false;

    // --- LOOP SFX_MALUPITON_WIN & LOWER BGM ---
    const bgmKey = 'bgm_malupiton_background';
    const bgm = this.game.assetLoader?.audio?.[bgmKey];
    const winSfx = this.game.assetLoader?.audio?.['sfx_malupiton_win'];
    
    if (bgm && bgm === this.game.currentBgmTrack) {
        bgm.volume = 0; // Completely mute background during Aura phase
    }

    if (winSfx) {
        winSfx.loop = true;
        if (winSfx.paused) {
            winSfx.currentTime = 0;
            winSfx.volume = this.game.uiManager.masterVolume * 0.9;
            winSfx.play().catch(()=>{});
        }
    }

    this.auraDamageTimer += delta;
    if (this.auraDamageTimer >= this.auraTickInterval) {
      this.auraDamageTimer = 0;
      if (this.game.player) this.game.player.takeDamage(this.auraDamagePerTick);
    }

    this.auraAnimTimer += delta;
    if (this.auraAnimTimer >= 100) {
      this.auraAnimTimer = 0;
      this.auraFrame = (this.auraFrame + 1) % 15;
    }
  }

  _updateTransition(delta) {
    this.state = 'hurt';
    this.currentRow = 2;
    this.currentFrame = this.transitionPoseFrame;
    this.isInvincible = true;
    this.transitionTimer -= delta;
    if (this.transitionTimer <= 0) this._finishTransition();
  }

  _updateDeath(delta) {
    this.currentRow = 2;
    this.currentFrame = this.deathFrame;
    this.deathAnimTimer += delta;
    if (this.deathAnimTimer >= 170) {
      this.deathAnimTimer = 0;
      if (this.deathFrame < 4) {
        this.deathFrame++;
      } else {
        this.deathHoldTimer += 170;
        if (this.deathHoldTimer >= this.deathHoldDuration) {
          this.isAlive = false;
          this.alive = false;
        }
      }
    }
  }

  update(delta) {
    if (!this.isAlive && this.state !== 'dead') return;

    if (!this.introPlayed) {
      this.introPlayed = true;
      this._playSfx('sfx_malupiton_intro', 0.75);
    }

    this.drawX = this.x;
    this.drawY = this.y;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    this._updateStatusEffects(delta);

    if (this.state === 'dead') {
      this._updateDeath(delta);
      return;
    }

    if (this.isTransitioning) {
      this._updateTransition(delta);
      return;
    }

    if (this.phase === 'KAP') {
      this._updateKapPhase(delta);
    } else if (this.phase === 'IAN') {
      this._updateIanPhase(delta);
    } else {
      this._updateAuraPhase(delta);
    }
  }

  takeDamage(damage, ignoreInvincible = false, hitY = null) {
    if (this.state === 'dead' || !this.isAlive) return;
    this.hurtFlashTimer = 180;

    if (this.phase === 'IAN' && !this.ianWasCancelled) {
      // Re-evaluate guard state at hit time so vulnerability is immediate when guards are cleared.
      this.isInvincible = this.hasActiveMinions();
    }

    if (this.phase === 'IAN' && !this.ianWasCancelled && !this.hasActiveMinions()) {
      this._enterIanCancelled();
    }

    let finalDamage = damage;

    // --- FEATURE 4: HEAD / BODY / LEG MULTIPLIER ---
    if (hitY !== null && !ignoreInvincible) {
        const enemyTop = this.y;
        const enemyH = this.height;
        if (hitY < enemyTop + (enemyH * 0.25)) {
            finalDamage = Math.ceil(damage * 2.0); // 200% Headshot
        } else if (hitY > enemyTop + (enemyH * 0.75)) {
            finalDamage = Math.ceil(damage * 0.6); // 60% Legshot
        }
    }

    this._applyPhaseDamage(finalDamage, ignoreInvincible);
  }

  _drawHealthBars(ctx) {
    const barWidth = Math.max(240, this.width + 120);
    const barHeight = 12;
    const gap = 5;
    const x = this.x + (this.width - barWidth) / 2;
    const startY = this.y - 34;

    const bars = [
      { label: 'KAP', color: '#24d14b', hp: this.phaseHp.KAP, max: this.phaseMax.KAP },
      { label: 'IAN', color: '#f2b632', hp: this.phaseHp.IAN, max: this.phaseMax.IAN },
      { label: 'AURA', color: '#e53935', hp: this.phaseHp.AURA, max: this.phaseMax.AURA }
    ];

    ctx.save();
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const y = startY + (i * (barHeight + gap));
      const ratio = b.max > 0 ? Math.max(0, b.hp / b.max) : 0;

      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.fillStyle = b.color;
      ctx.fillRect(x + 2, y + 2, (barWidth - 4) * ratio, barHeight - 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, barWidth, barHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.label, x + 6, y + 9);
    }

    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('PRESIDENT MALUPITON', x + barWidth / 2, startY - 8);
    ctx.restore();
  }

  _drawAuraOverlay(ctx) {
    if (this.phase !== 'AURA' || this.state === 'dead') return;

    const auraSprite = this.game.assetLoader?.images?.[this.auraSpriteKey];
    if (auraSprite && auraSprite.complete && auraSprite.width > 0 && auraSprite.height > 0) {
      const cols = 5;
      const rows = 3;
      const sw = auraSprite.width / cols;
      const sh = auraSprite.height / rows;
      const col = this.auraFrame % cols;
      const row = Math.floor(this.auraFrame / cols) % rows;
      const auraW = this.width * 1.9;
      const auraH = this.height * 1.5;
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.drawImage(
        auraSprite,
        col * sw, row * sh, sw, sh,
        this.x - (auraW - this.width) / 2,
        this.y - (auraH - this.height) / 2,
        auraW, auraH
      );
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 160);
    ctx.fillStyle = `rgba(255, 20, 20, ${pulse})`;
    ctx.fillRect(this.x - 8, this.y - 8, this.width + 16, this.height + 16);
    ctx.restore();
  }

  draw(ctx) {
    if (!this.isAlive && this.state !== 'dead') return;

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    if (sprite && sprite.complete && sprite.width > 0 && sprite.height > 0) {
      const cols = 5;
      const rows = 3;
      const sw = sprite.width / cols;
      const sh = sprite.height / rows;

      let row = this.currentRow;
      let frame = this.currentFrame;

      if (this.state === 'dead') {
        row = 2;
        frame = Math.max(3, Math.min(4, this.deathFrame));
      } else if (this.isTransitioning) {
        row = 2;
        frame = this.transitionPoseFrame;
      } else if (this.phase === 'KAP' && this.kapState === 'VULNERABLE') {
        row = 2;
        frame = 1;
      } else if (this.phase === 'AURA') {
        row = 2;
        frame = 0;
      } else if (this.phase === 'KAP' && this.kapState === 'ATTACKING') {
        row = 1;
        frame = frame % 5;
      } else {
        row = 0;
        frame = frame % 5;
      }

      const sx = frame * sw;
      const sy = row * sh;
      const scale = this.height / sh;
      const drawW = sw * scale;
      const drawH = this.height;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(this.drawX + this.width / 2, this.drawY + this.height);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, sx, sy, sw, sh, -drawW / 2, -drawH, drawW, drawH);

      if (this.hurtFlashTimer > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(this.drawX, this.drawY, this.width, this.height);
    }

    this._drawAuraOverlay(ctx);
    this._drawShieldEffect(ctx);
    if (this.state !== 'dead') this._drawHealthBars(ctx);

    if (this.phase === 'IAN' && this.ianWasCancelled && this.state !== 'dead') {
      ctx.save();
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 120);
      ctx.globalAlpha = pulse;
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#ff2020';
      ctx.fillText('CANCELLED!', this.x + this.width / 2, this.y - 56);
      ctx.restore();
    }

    if (this.burnActive && this.state !== 'dead') {
      const fireSprite = this.game.assetLoader?.images?.effect_fire;
      if (fireSprite && fireSprite.complete && fireSprite.width > 0) {
        ctx.save();
        const fCols = 5; const fRows = 3;
        const fw = fireSprite.width / fCols; const fh = fireSprite.height / fRows;
        const currentFireFrame = Math.floor(this.game.gameFrame / 4) % 15;
        const fCol = currentFireFrame % fCols; const fRow = Math.floor(currentFireFrame / fCols);
        const fireW = this.width * 1.5; const fireH = this.height * 0.8;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(fireSprite, fCol * fw, fRow * fh, fw, fh, this.x - (fireW - this.width) / 2, this.y + this.height - fireH, fireW, fireH);
        ctx.restore();
      } else {
        ctx.save();
        const flicker = Math.sin(this.game.gameFrame / 3) * 0.2 + 0.35;
        ctx.fillStyle = `rgba(255, 100, 0, ${flicker})`;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
      }
    } else if (this.slowActive && this.state !== 'dead') {
      const slowSprite = this.game.assetLoader?.images?.effect_slow;
      if (slowSprite && slowSprite.complete && slowSprite.width > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.85;
        const sCols = 4; const sRows = 2;
        const swSlow = slowSprite.width / sCols; const shSlow = slowSprite.height / sRows;
        const currentSlowFrame = Math.floor(this.game.gameFrame / 5) % 8;
        const sCol = currentSlowFrame % sCols; const sRow = Math.floor(currentSlowFrame / sCols);
        const effectW = this.width * 1.4; const effectH = this.height * 1.1;
        ctx.drawImage(slowSprite, sCol * swSlow, sRow * shSlow, swSlow, shSlow, this.x - (effectW - this.width) / 2, this.y + this.height - effectH, effectW, effectH);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 150, 255, 0.28)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
      }
    }

    if (this.kapState === 'VULNERABLE' && this.phase === 'KAP' && this.state !== 'dead') {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      const bounce = Math.sin(Date.now() / 180) * 4;
      ctx.fillText('...', this.x + this.width / 2, this.y - 40 + bounce);
      ctx.restore();
    }
  }
}
