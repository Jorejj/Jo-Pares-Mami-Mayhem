// BossKap.js – Inspector Kap Nino (Act 1 Boss)
// Custom boss class with 3-phase state machine and ranged attacks

class BossKap extends Enemy {
constructor(game) {
    super(game, 'boss_kap');

    // --- NEW: SCALING BASELINE (EASY = 1x, MEDIUM = 1.5x, HARD = 2x) ---
    const diffKey = this.game.currentDifficultyKey || 'easy';
    const statMult = diffKey === 'hard' ? 2.0 : (diffKey === 'medium' ? 1.5 : 1.0);
    const speedMult = diffKey === 'hard' ? 1.4 : (diffKey === 'medium' ? 1.2 : 1.0); // Speed scales slightly lower so it's playable

    this.maxHp = 250 * statMult;
    this.hp = this.maxHp;
    this.speed = 0.5 * speedMult;
    this.damage = 15 * statMult;
    
    // --- SCALED REWARD! ---
    this.kitaReward = 500 * statMult; 
    
    this.x = this.game.canvas.width + 50;
    this.y = Math.random() * (this.game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) + CONSTANTS.GAME_BOTTOM_HALF;
    this.targetX = this.game.canvas.width / 2 - this.width / 2;
    this.targetY = this.game.canvas.height / 2;
    this.hasReachedCenter = false;
    
    this.bossPhase = 'MOVING'; 
    this.isInvincible = true;
    this.attackCounter = 0;
    
    this.maxAttacks = diffKey === 'hard' ? 5 : (diffKey === 'medium' ? 4 : 3);
    this.attackCooldown = diffKey === 'hard' ? 1000 : (diffKey === 'medium' ? 1500 : 2000); 
    this.timeSinceLastAttack = 0;
    this.vulnerableTimer = 0;
    this.vulnerableDuration = 6000;
    // Visual feedback
    this.panting = false;
    
    // Sprite animation frame control
    this.currentRow = 0; // 0 = invincible, 1 = vulnerable, 2 = hurt/death
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameDelay = 150;
    this.hurtFlashTimer = 0;
    this.deathAnimationDone = false;
    this.deathHoldTimer = 0;
    this.deathHoldDuration = 900;
    this.walkSfxTimer = 0;
    this.introPlayed = false;
    this.kitaReward = 1000;
    this.rewardGiven = false;
  }

  _playSfx(key, volume = 0.75) {
    const audio = this.game.assetLoader?.audio?.[key];
    if (!audio || typeof audio.play !== 'function') return;
    audio.currentTime = 0;
    
    // --- BOOSTED BOSS SFX VOLUME (* 1.5) ---
    audio.volume = Math.min(1.0, (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1) * volume * 1.5);
    
    this._playAudioSafe(audio);
  }

  _playRandomSfx(keys, volume = 0.7) {
    if (!Array.isArray(keys) || keys.length === 0) return;
    const key = keys[Math.floor(Math.random() * keys.length)];
    this._playSfx(key, volume);
  }

  update(delta) {
    if (!this.introPlayed) {
      this.introPlayed = true;
      this._playSfx('sfx_kap_intro', 0.75);
    }

    if (this.state === 'dead') {
      // Play death animation frames 3-5 then remove boss
      if (this.currentFrame < 4) {
        this.frameTimer += delta;
        if (this.frameTimer >= this.frameDelay) {
          this.frameTimer = 0;
          this.currentFrame++;
        }
      } else {
        this.deathHoldTimer += delta;
        if (this.deathHoldTimer >= this.deathHoldDuration) {
          this.isAlive = false;
          this.deathAnimationDone = true;
        }
      }
      return;
    }

    // Apply inherited status effects to boss too (burn/slow)
    if (this.slowActive) {
      this.slowDuration -= delta;
      if (this.slowDuration <= 0) {
        this.slowActive = false;
        this.slowFactor = 1;
        this.updateSpeed();
      }
    }

    if (this.burnActive) {
      this.burnDuration -= delta;
      const now = Date.now();
      if (now - this.lastBurnTick >= 100) {
        // Burn must tick even while invincible phases are active.
        this.hp -= this.burnDamagePerTick;
        if (this.hp <= 0) {
          this.hp = 0;
          this.state = 'dead';
          this.panting = false;
          this.isInvincible = false;
          this.bossPhase = 'VULNERABLE';
          this.frameTimer = 0;
          this.currentRow = 2;
          this.currentFrame = 2;
          this.deathHoldTimer = 0;
          this.deathAnimationDone = false;
        }
        this.lastBurnTick = now;
      }
      if (this.burnDuration <= 0) {
        this.burnActive = false;
      }
    }

    // Update animation frames
    this.frameTimer += delta;
    if (this.frameTimer >= this.frameDelay) {
      this.frameTimer = 0;
      this.currentFrame++;
    }

    // Boss-specific state machine
    switch (this.bossPhase) {
      case 'MOVING':
        this._updateMovingPhase(delta);
        break;
      case 'ATTACKING':
        this._updateAttackingPhase(delta);
        break;
      case 'VULNERABLE':
        this._updateVulnerablePhase(delta);
        break;
    }

    // Keep invincibility strictly tied to boss phase
    this.isInvincible = this.bossPhase !== 'VULNERABLE';

    // Brief hurt flash animation while vulnerable
    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= delta;
    }

    // Visual slow effect feedback
    if (this.slowActive) {
      this.currentRow = 1;
    }
  }

  _updateMovingPhase(delta) {
    this.isInvincible = true;
    this.panting = false;
    
    // Animation: First row (invincible/moving frames)
    this.currentRow = 0;
    if (this.currentFrame >= 5) this.currentFrame = 0;

    // Move toward center position
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 20) { 
      // Move toward center
      const moveSpeed = this.speed || 1.0;
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      
      this.x += normalizedX * moveSpeed;
      this.y += normalizedY * moveSpeed;
      this.walkSfxTimer += delta;
      if (this.walkSfxTimer >= 650) {
        this.walkSfxTimer = 0;
        this._playSfx('sfx_kap_walk', 0.3);
      }
    } else {
      // Reached center - transition to ATTACKING
      this.hasReachedCenter = true;
      this.bossPhase = 'ATTACKING';
      this.attackCounter = 0;
      this.timeSinceLastAttack = this.attackCooldown;
    }
  }

  _updateAttackingPhase(delta) {
    this.isInvincible = true;
    this.panting = false;
    
    // Animation: First row (invincible/attacking frames)
    this.currentRow = 0;
    if (this.currentFrame >= 5) this.currentFrame = 0;

    // Update attack cooldown
    this.timeSinceLastAttack += delta;

    // Fire projectiles
    if (this.attackCounter < this.maxAttacks && this.timeSinceLastAttack >= this.attackCooldown) {
      this._fireVial();
      this.attackCounter++;
      this.timeSinceLastAttack = 0;

      // After 3rd shot, become vulnerable
      if (this.attackCounter >= this.maxAttacks) {
        this.bossPhase = 'VULNERABLE';
        this.vulnerableTimer = 0;
        this.isInvincible = false;
        this.panting = true;
        this.currentFrame = 0;
      }
    }
  }

  _updateVulnerablePhase(delta) {
    this.isInvincible = false;
    this.panting = true;

    // Animation: Middle row frames 4 and 5 (vulnerable/panting)
    this.currentRow = 1;
    if (this.currentFrame < 4) this.currentFrame = 4;
    if (this.currentFrame > 5) this.currentFrame = 4;

    // Stay still and vulnerable
    this.vulnerableTimer += delta;

    // After vulnerability window, return to ATTACKING
    if (this.vulnerableTimer >= this.vulnerableDuration) {
      this.bossPhase = 'ATTACKING';
      this.attackCounter = 0;
      this.timeSinceLastAttack = 0;
      this.isInvincible = true;
      this.panting = false;
      this.currentFrame = 0;
    }
  }

  _fireVial() {
    const enemyProjectilePool = this.game.waveManager?.enemyProjectilePool;
    if (!enemyProjectilePool) return;

    const player = this.game.player;
    const CONSTANTS = this.game.CONSTANTS || window.CONSTANTS;
    const gameBottomHalf = CONSTANTS?.GAME_BOTTOM_HALF || 360;
    const canvasHeight = CONSTANTS?.CANVAS_HEIGHT || 720;
    
    const startX = this.x - 10 - Math.random() * 15; 
    const startY = gameBottomHalf + Math.random() * (canvasHeight - gameBottomHalf - 50); 
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;

    enemyProjectilePool.fire(startX, startY, targetX, targetY, this.damage, 'vial');
    this._playRandomSfx(
      ['sfx_kap_attack', 'sfx_kap_attack1', 'sfx_kap_attack2', 'sfx_kap_write', 'sfx_kap_break_pen'],
      0.55
    );
  }

  _drawShieldEffect(ctx) {
    if (!this.isInvincible || this.bossPhase === 'VULNERABLE') return;
    
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

  takeDamage(damage, ignoreInvincible = false, hitY = null) {
    if (this.state === 'dead') return;

    if (this.bossPhase !== 'VULNERABLE' && !ignoreInvincible) {
      this._playSfx('sfx_kap_block', 0.6);
      return;
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

    this.hurtFlashTimer = 250;
    this.hp -= finalDamage;

    this.hurtFlashTimer = 250;
    this.hp -= damage;
    
    if (this.hp <= 0 && this.state !== 'dead') {
      this.hp = 0;
      this.state = 'dead';
      this.panting = false;
      this.isInvincible = false;
      this.bossPhase = 'VULNERABLE';
      this.frameTimer = 0;
      this.currentRow = 2;
      this.currentFrame = 2; 
      this.deathHoldTimer = 0;
      this.deathAnimationDone = false;
      
      if (!this.rewardGiven) {
        this.rewardGiven = true;
        if (this.game.player) this.game.player.addKita(this.kitaReward);
      }
      
      this._playSfx('sfx_kap_defeat', 0.8);
    } else {
      this._playSfx('sfx_kap_pain', 0.55);
    }
  }

  draw(ctx) {
    if (this.state === 'dead') {
      const deathFrame = Math.min(4, Math.max(2, Math.floor(this.currentFrame)));
      this._drawBossSprite(ctx, 2, [deathFrame]);
      return;
    }

    if (this.bossPhase === 'MOVING' || this.bossPhase === 'ATTACKING') {
      this._drawBossSprite(ctx, 0, [0, 1, 2, 3, 4]);
      if (this.isInvincible) {
        this._drawShieldEffect(ctx);
      }
    } else if (this.bossPhase === 'VULNERABLE') {
      if (this.hurtFlashTimer > 0) {
        this._drawBossSprite(ctx, 2, [0, 1]);
      } else {
        this._drawBossSprite(ctx, 1, [3, 4]);
      }
    }

    this._drawHealthBar(ctx);

    // --- VISUAL OVERLAYS ---
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
        const sw_slow = slowSprite.width / sCols; const sh_slow = slowSprite.height / sRows;
        const currentSlowFrame = Math.floor(this.game.gameFrame / 5) % 8;
        const sCol = currentSlowFrame % sCols; const sRow = Math.floor(currentSlowFrame / sCols);
        
        const effectW = this.width * 1.4; const effectH = this.height * 1.1;
        
        ctx.drawImage(slowSprite, sCol * sw_slow, sRow * sh_slow, sw_slow, sh_slow, this.x - (effectW - this.width)/2, this.y + this.height - effectH, effectW, effectH);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 150, 255, 0.28)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
      }
    }

    if (this.panting && this.state !== 'dead') {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const bounce = Math.sin(Date.now() / 200) * 5;
      ctx.fillText('...', this.x + this.width / 2, this.y - 30 + bounce);
      ctx.restore();
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
    ctx.fillText('KAP NINO', x + barWidth / 2, y - 6);

    ctx.restore();
  }

  _drawBossSprite(ctx, row, frameLoop) {
    const sprite = this.game.assetLoader?.images?.boss_kap;
    if (!sprite || !sprite.complete || sprite.width === 0) {
      ctx.fillStyle = this.isInvincible ? '#FFD700' : '#FF6B6B';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      return;
    }

    const totalCols = 5;
    const totalRows = 3;
    const frameWidth = Math.floor(sprite.width / totalCols);
    const frameHeight = Math.floor(sprite.height / totalRows);
    const extraRowPixels = sprite.height - (frameHeight * totalRows);
    const rowGap = totalRows > 1 ? Math.floor(extraRowPixels / (totalRows - 1)) : 0;
    const cropPad = 2;
    
    const frameIndex = frameLoop.length === 1 
      ? frameLoop[0] 
      : frameLoop[Math.floor(this.currentFrame) % frameLoop.length];
    
    const col = frameIndex % totalCols;
    const sx = (col * frameWidth) + cropPad;
    const sy = (row * (frameHeight + rowGap)) + cropPad;
    const sw = Math.max(1, frameWidth - (cropPad * 2));
    const sh = Math.max(1, frameHeight - (cropPad * 2));
    
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(-1, 1);
    ctx.drawImage(
      sprite,
      sx, sy, sw, sh,
      -(this.x + this.width), 
      this.y,                
      this.width,            
      this.height            
    );
    ctx.restore();
  }
}
