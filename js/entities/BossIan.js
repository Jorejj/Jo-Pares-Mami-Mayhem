// BossIan.js – Vlogger Diwata (Act 2 Boss)
// 3-phase boss: GOING_LIVE (dodge), RALLY_FOLLOWERS (summon), CANCELLED (vulnerable)

class BossIan extends Enemy {
  constructor(game) {
    super(game, 'boss_ian');
    this._bossInstanceId = `boss_ian_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    this.init();
  }

init(config = {}) {
    // 1. Grab difficulty settings
    const diffKey = this.game.currentDifficultyKey || 'easy';
    const statMult = diffKey === 'hard' ? 2.0 : (diffKey === 'medium' ? 1.5 : 1.0);
    const speedMult = diffKey === 'hard' ? 1.4 : (diffKey === 'medium' ? 1.2 : 1.0);
    
    const baseHp = config.hp ?? 600;
    const baseSpeed = config.speed ?? 0.9;

    // 2. Base Setup
    this.type = 'boss_ian';
    this.spriteKey = 'boss_ian';
    this.width = config.width ?? 120;
    this.height = config.height ?? 220;
    
    // --- FEATURE 3: DIFFICULTY SCALING ---
    this.damage = (config.damage ?? 30) * statMult;
    this.ianSummonCount = diffKey === 'hard' ? 5 : (diffKey === 'medium' ? 4 : 2);
    
    // --- SCALED REWARD! ---
    this.kitaReward = Math.round((config.kitaReward ?? 800) * statMult);
    // --- HP & Speed Scaling ---
    this.maxHp = Math.round(baseHp * statMult);    
    this.hp = this.maxHp;
    this.baseSpeed = baseSpeed * speedMult;
    this.speed = this.baseSpeed;
    
    // 3. Status Effects
    this.slowActive = false;
    this.slowDuration = 0;
    this.slowFactor = 1;
    this.burnActive = false;
    this.burnDuration = 0;
    this.burnDamagePerTick = 0;
    this.lastBurnTick = Date.now();

    // 4. Position & Spawning
    this.centerX = config.centerX ?? (this.game.canvas.width - 250);
    this.centerY = config.centerY ?? (
      CONSTANTS.GAME_BOTTOM_HALF + ((this.game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) / 2)
    );
    this.x = config.spawnX ?? (this.game.canvas.width + 50);
    this.y = config.spawnY ?? (
      Math.random() * (this.game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) + CONSTANTS.GAME_BOTTOM_HALF
    );
    this.drawX = this.x;
    this.drawY = this.y;
    this.yDirection = Math.random() > 0.5 ? 1 : -1;

    // 5. Boss Phase & Animation Timers
    this.phase = 'GOING_LIVE';
    this.isEntering = true;
    this.hasSpawnSummoned = false;
    this.state = 'walk';
    this.row = 0;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameDelay = 120;

    // 6. Attack & Vulnerability Timers
    this.streamCycleTimer = 0;
    this.streamInterval = 5000;
    this.streamTimer = 0;
    this.streamDuration = 1500;
    this.cancelledTimer = 0;
    this.cancelledDuration = 4000;
    this.stunnedTransitionTimer = 0;

    // 7. Visual Feedback
    this.hurtFlashTimer = 0;
    this.blockedPopupTimer = 0;
    this.blockedPopupText = 'Blocked!';
    this.cancelPulseTimer = 0;

    // 8. Vitality States
    this.damageMultiplier = 1;
    this.isInvincible = false;
    this.deathFrame = 3;
    this.deathAnimTimer = 0;
    this.deathHoldTimer = 0;
    this.rewardGiven = false;
    this.introPlayed = false;
    this.walkSfxTimer = 0;

    this.isAlive = true;
    this.alive = true;
    this.alpha = 1;
  }

  _playSfx(key, volume = 0.75) {
    const audio = this.game.assetLoader?.audio?.[key];
    if (!audio || typeof audio.play !== 'function') return;
    audio.currentTime = 0;
    
    // --- BOOSTED BOSS SFX VOLUME (* 1.5) ---
    audio.volume = Math.min(1.0, (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1) * volume * 1.5);
    
    this._playAudioSafe(audio);
  }

  _drawShieldEffect(ctx) {
    if (!this.isInvincible || this.phase === 'CANCELLED' || this.state === 'dead') return;

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const shieldRadius = Math.max(this.width, this.height) / 2 + 8;

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
        this.hp -= this.burnDamagePerTick;
        this.lastBurnTick = now;
        this.hurtFlashTimer = Math.max(this.hurtFlashTimer, 90);
        this._checkDeath();
      }
      if (this.burnDuration <= 0) {
        this.burnActive = false;
      }
    }
  }

  _checkDeath() {
    if (this.hp > 0 || this.state === 'dead') return;

    this.hp = 0;
    this.state = 'dead';
    this.phase = 'DEAD';
    this.row = 2;
    this.deathFrame = 3;
    this.currentFrame = 3;
    this.deathAnimTimer = 0;
    this.deathHoldTimer = 0;
    this.isInvincible = false;
    this.damageMultiplier = 1;

    if (!this.rewardGiven) {
      this.rewardGiven = true;
      if (this.game.player) this.game.player.addKita(this.kitaReward || 300);
    }

    this._playSfx('sfx_ian_defeat', 0.9);
  }

  hasActiveGuards() {
    const manager = this.game.waveManager;
    const snapshotEnemies = manager?.activeEnemies || [];
    const liveEnemies = manager?.getActiveEnemies?.() || snapshotEnemies;
    const activeEnemies = liveEnemies.length >= snapshotEnemies.length ? liveEnemies : snapshotEnemies;
    for (let i = 0; i < activeEnemies.length; i++) {
      const enemy = activeEnemies[i];
      if (!enemy || !enemy.isAlive || enemy === this) continue;
      if (enemy.__bossIanOwnerId === this._bossInstanceId) {
        return true;
      }
    }
    return false;
  }

  getCollisionRect() {
    if (this.row === 2 && this.state !== 'dead') {
      const reducedHeight = this.height * 0.5;
      return {
        x: this.x,
        y: this.y + (this.height - reducedHeight),
        width: this.width,
        height: reducedHeight
      };
    }

    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  _summonGuards() {
    const enemyPool = this.game.waveManager?.enemyPool;
    if (!enemyPool) return;

    for (let i = 0; i < this.ianSummonCount; i++) {
      const guard = enemyPool.get('gangster');
      if (!guard) continue;

      guard.__bossIanOwnerId = this._bossInstanceId;
      const offsetY = (i - 1.5) * 18;
      guard.x = this.x - 18 - (i % 2) * 22;
      guard.y = Math.max(
        CONSTANTS.GAME_BOTTOM_HALF,
        Math.min(this.game.canvas.height - guard.height, this.y + offsetY)
      );
      guard.drawX = guard.x;
      guard.drawY = guard.y;
    }

    this._playSfx('sfx_ian_attack', 0.8);
  }

  _advanceAnimation(delta) {
    this.frameTimer += delta;
    if (this.frameTimer < this.frameDelay) return;
    this.frameTimer = 0;

    if (this.phase === 'GOING_LIVE') {
      this.row = 0;
      this.currentFrame = (this.currentFrame + 1) % 5;
      return;
    }

    if (this.phase === 'RALLY_FOLLOWERS') {
      this.row = 1;
      this.currentFrame = (this.currentFrame + 1) % 4;
      return;
    }

    if (this.phase === 'CANCELLED') {
      if (this.stunnedTransitionTimer > 0) {
        this.row = 1;
        this.currentFrame = 4;
      } else {
        this.row = 2;
        this.currentFrame = (this.currentFrame + 1) % 2;
      }
      return;
    }

    if (this.state === 'dead') {
      this.deathFrame = Math.min(4, this.deathFrame + 1);
    }
  }

  _updateGoingLive(delta) {
    this.phase = 'GOING_LIVE';
    this.state = 'walk';
    this.row = 0;
    this.damageMultiplier = 1;
    this.isInvincible = this.hasActiveGuards();

    const minY = CONSTANTS.GAME_BOTTOM_HALF;
    const maxY = this.game.canvas.height - this.height;
    const dodgeSpeed = Math.max(1.5, this.speed) * 2.1;
    const centerPullSpeed = Math.max(0.8, this.speed * 1.2);

    if (this.isEntering) {
      const dx = this.centerX - this.x;
      const moveSpeed = Math.max(1.8, this.speed * 2.8);
      if (Math.abs(dx) <= moveSpeed + 1) {
        this.x = this.centerX;
        this.y = this.centerY;
        this.isEntering = false;
      } else {
        this.x += Math.sign(dx) * moveSpeed;
        this.y += this.yDirection * (dodgeSpeed * 0.7);
        this.y += Math.sign(this.centerY - this.y) * centerPullSpeed;
        this.walkSfxTimer += delta;
        if (this.walkSfxTimer >= 700) {
          this.walkSfxTimer = 0;
          this._playSfx('sfx_ian_walk', 0.25);
        }
      }
    } else {
      this.x = this.centerX;
      this.y += this.yDirection * dodgeSpeed;
      this.walkSfxTimer += delta;
      if (this.walkSfxTimer >= 700) {
        this.walkSfxTimer = 0;
        this._playSfx('sfx_ian_walk', 0.25);
      }
    }

    if (this.y <= minY) {
      this.y = minY;
      this.yDirection = 1;
    } else if (this.y >= maxY) {
      this.y = maxY;
      this.yDirection = -1;
    }

    if (this.isEntering) return;

    this.streamCycleTimer += delta;
    if (this.streamCycleTimer >= this.streamInterval) {
      this.streamCycleTimer = 0;
      this.streamTimer = 0;
      this.phase = 'RALLY_FOLLOWERS';
      this.currentFrame = 0;
      this._summonGuards();
    }
  }

  _updateRallyFollowers(delta) {
    this.state = 'attack';
    this.row = 1;
    this.damageMultiplier = 1;
    this.x = this.centerX;
    this.isInvincible = this.hasActiveGuards();

    this.streamTimer += delta;
    if (this.streamTimer >= this.streamDuration) {
      this.streamTimer = 0;
      this.phase = 'GOING_LIVE';
      this.currentFrame = 0;
    }
  }

  _updateCancelled(delta) {
    this.state = 'hurt';
    this.damageMultiplier = 1.5;
    this.x = this.centerX;
    this.row = this.stunnedTransitionTimer > 0 ? 1 : 2;
    this.isInvincible = false;
    this.cancelPulseTimer += delta;

    if (this.stunnedTransitionTimer > 0) {
      this.stunnedTransitionTimer -= delta;
    }

    this.cancelledTimer += delta;
    if (this.cancelledTimer >= this.cancelledDuration) {
      this.cancelledTimer = 0;
      this.phase = 'RALLY_FOLLOWERS';
      this.state = 'attack';
      this.damageMultiplier = 1;
      this.currentFrame = 0;
      this.row = 1;
      this.streamTimer = 0;
      this.streamCycleTimer = 0;
      this._summonGuards();
    }
  }

  _updateDeath(delta) {
    this.row = 2;
    this.currentFrame = this.deathFrame;
    this.deathAnimTimer += delta;
    if (this.deathAnimTimer >= 180) {
      this.deathAnimTimer = 0;
      if (this.deathFrame < 4) {
        this.deathFrame++;
      } else {
        this.deathHoldTimer += 180;
        if (this.deathHoldTimer >= 700) {
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
      this._playSfx('sfx_ian_win', 0.7);
    }

    this.drawX = this.x;
    this.drawY = this.y;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.blockedPopupTimer > 0) this.blockedPopupTimer -= delta;
    this._updateStatusEffects(delta);

    if (this.state === 'dead') {
      this._updateDeath(delta);
      return;
    }

    if (!this.hasSpawnSummoned) {
      this.hasSpawnSummoned = true;
      this._summonGuards();
    }

    switch (this.phase) {
      case 'RALLY_FOLLOWERS':
        this._updateRallyFollowers(delta);
        break;
      case 'CANCELLED':
        this._updateCancelled(delta);
        break;
      default:
        this._updateGoingLive(delta);
        break;
    }

    this._advanceAnimation(delta);
  }

takeDamage(damage, ignoreInvincible = false, hitY = null) {
    if (this.state === 'dead' || !this.isAlive) return;

    const guardsActive = this.hasActiveGuards();
    if (guardsActive && this.phase !== 'CANCELLED' && !ignoreInvincible) {
      this.isInvincible = true;
      this.blockedPopupTimer = 800;
      this.blockedPopupText = 'Blocked!';
      return;
    }

    if (this.phase !== 'CANCELLED' && !guardsActive && !ignoreInvincible) {
      this.phase = 'CANCELLED';
      this.state = 'hurt';
      this.isInvincible = false;
      this.damageMultiplier = 1.5;
      this.cancelledTimer = 0;
      this.stunnedTransitionTimer = 220;
      this.currentFrame = 4;
      this.row = 1;
      this._playSfx('sfx_ian_pain', 0.85);
    }

    // Apply phase damage multiplier first
    let baseDmg = damage * (this.phase === 'CANCELLED' ? 1.5 : 1);
    let finalDamage = baseDmg;

    // --- FEATURE 4: HEAD / BODY / LEG MULTIPLIER ---
    if (hitY !== null && !ignoreInvincible) {
        const enemyTop = this.y;
        const enemyH = this.height;
        if (hitY < enemyTop + (enemyH * 0.25)) {
            finalDamage = Math.ceil(baseDmg * 2.0); // 200% Headshot
        } else if (hitY > enemyTop + (enemyH * 0.75)) {
            finalDamage = Math.ceil(baseDmg * 0.6); // 60% Legshot
        }
    }

    this.hp -= finalDamage;
    this.hurtFlashTimer = 170;
    this._checkDeath();
  }

  draw(ctx) {
    if (!this.isAlive && this.state !== 'dead') return;

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    if (sprite && sprite.complete && sprite.width > 0 && sprite.height > 0) {
      const cols = 5;
      const rows = 3;
      const sw = sprite.width / cols;
      const sh = sprite.height / rows;

      let drawRow = this.row;
      let drawFrame = this.currentFrame;

      if (this.state === 'dead') {
        drawRow = 2;
        drawFrame = Math.max(3, Math.min(4, this.deathFrame));
      } else if (this.phase === 'RALLY_FOLLOWERS') {
        drawRow = 1;
        drawFrame = drawFrame % 4;
      } else if (this.phase === 'CANCELLED' && this.stunnedTransitionTimer > 0) {
        drawRow = 1;
        drawFrame = 4;
      } else if (this.phase === 'CANCELLED') {
        drawRow = 2;
        drawFrame = drawFrame % 2;
      } else {
        drawRow = 0;
        drawFrame = drawFrame % 5;
      }

      if (this.hurtFlashTimer > 0 && this.state !== 'dead') {
        drawRow = 2;
        drawFrame = 2;
      }

      const sx = drawFrame * sw;
      const sy = drawRow * sh;
      const scale = this.height / sh;
      const drawW = sw * scale;
      const drawH = this.height;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(this.drawX + this.width / 2, this.drawY + this.height);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, sx, sy, sw, sh, -drawW / 2, -drawH, drawW, drawH);

      if (this.hurtFlashTimer > 0 && this.state !== 'dead') {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#cc2266';
      ctx.fillRect(this.drawX, this.drawY, this.width, this.height);
    }

    if (this.state !== 'dead') {
      this._drawHealthBar(ctx);
      this._drawShieldEffect(ctx);

      if (this.burnActive) {
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
      } else if (this.slowActive) {
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

      if (this.blockedPopupTimer > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#ffe082';
        const yBob = Math.sin(Date.now() / 120) * 3;
        ctx.fillText('🛡️', this.drawX + this.width / 2, this.drawY - 54 + yBob);
        ctx.fillText(this.blockedPopupText, this.drawX + this.width / 2, this.drawY - 34 + yBob);
        ctx.restore();
      }

      if (this.phase === 'CANCELLED') {
        ctx.save();
        const pulse = 0.55 + 0.45 * Math.sin(this.cancelPulseTimer / 120);
        ctx.globalAlpha = pulse;
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#ff2020';
        ctx.fillText('CANCELLED!', this.drawX + this.width / 2, this.drawY - 66);
        ctx.restore();
      }
    }
  }

  _drawHealthBar(ctx) {
    if (this.state === 'dead') return;

    const barWidth = Math.max(180, this.width + 80);
    const barHeight = 14;
    const x = this.x + (this.width - barWidth) / 2;
    const y = this.y - 22;
    const hpRatio = Math.max(0, this.hp / this.maxHp);

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = hpRatio > 0.35 ? '#24d14b' : '#ff5a5a';
    ctx.fillRect(x + 2, y + 2, (barWidth - 4) * hpRatio, barHeight - 4);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VLOGGER IAN', x + barWidth / 2, y - 6);

    ctx.restore();
  }
}
