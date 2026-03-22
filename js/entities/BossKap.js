// BossKap.js – Inspector Kap Nino (Act 1 Boss)
// Custom boss class with 3-phase state machine and ranged attacks

class BossKap extends Enemy {
  constructor(game) {
    super(game, 'boss_kap');
    
    // Spawn from right side like normal enemies
    this.x = this.game.canvas.width + 50;
    this.y = Math.random() * (this.game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) + CONSTANTS.GAME_BOTTOM_HALF;
    
    // Target position: center of allowable enemy area
    this.targetX = this.game.canvas.width / 2 - this.width / 2;
    this.targetY = this.game.canvas.height / 2;
    this.hasReachedCenter = false;
    
    // Boss-specific state machine
    this.bossPhase = 'MOVING'; // MOVING, ATTACKING, VULNERABLE
    this.isInvincible = true;
    this.attackCounter = 0;
    this.maxAttacks = 3;
    this.attackCooldown = 1500; // 1.5 seconds between shots
    this.timeSinceLastAttack = 0;
    this.vulnerableTimer = 0;
    this.vulnerableDuration = 6000; // 6 seconds of vulnerability
    
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
    
    console.log('[BossKap] Boss spawned at', this.x, this.y, 'targeting center at', this.targetX, this.targetY);
  }

  update(delta) {
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

    if (distance > 20) { // Close enough threshold
      // Move toward center
      const moveSpeed = this.speed || 1.0;
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      
      this.x += normalizedX * moveSpeed;
      this.y += normalizedY * moveSpeed;
    } else {
      // Reached center - transition to ATTACKING
      this.hasReachedCenter = true;
      this.bossPhase = 'ATTACKING';
      this.attackCounter = 0;
      this.timeSinceLastAttack = this.attackCooldown; // Ready to attack immediately
      
      console.log('[BossKap] Reached center, transitioning to ATTACKING phase');
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

      console.log(`[BossKap] Fired vial ${this.attackCounter}/${this.maxAttacks}`);

      // After 3rd shot, become vulnerable
      if (this.attackCounter >= this.maxAttacks) {
        this.bossPhase = 'VULNERABLE';
        this.vulnerableTimer = 0;
        this.isInvincible = false;
        this.panting = true;
        this.currentFrame = 0;
        
        console.log('[BossKap] Transitioned to VULNERABLE phase');
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
      
      console.log('[BossKap] Transitioned back to ATTACKING phase');
    }
  }

  _fireVial() {
    // Get enemy projectile pool from WaveManager
    const enemyProjectilePool = this.game.waveManager?.enemyProjectilePool;
    if (!enemyProjectilePool) {
      console.warn('[BossKap] No enemy projectile pool available!');
      return;
    }

    const player = this.game.player;
    
    // Spawn projectile a few pixels to the left of the boss, at random Y in enemy gameplay area
    // Use game bottom half to avoid spawning in UI area
    const CONSTANTS = this.game.CONSTANTS || window.CONSTANTS;
    const gameBottomHalf = CONSTANTS?.GAME_BOTTOM_HALF || 360;
    const canvasHeight = CONSTANTS?.CANVAS_HEIGHT || 720;
    
    const startX = this.x - 10 - Math.random() * 15; // 10-25 pixels to the left
    const startY = gameBottomHalf + Math.random() * (canvasHeight - gameBottomHalf - 50); // Random Y in gameplay area
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;

    // Fire vial from pool
    const proj = enemyProjectilePool.fire(startX, startY, targetX, targetY, 15, 'vial');
    console.log(`[BossKap] Projectile fired at (${startX.toFixed(1)}, ${startY.toFixed(1)}) toward player:`, proj ? 'SUCCESS' : 'FAILED');

    // Play attack sound (use throw sound if boss attack not available)
    const attackSound = this.game.assetLoader?.audio?.sfx_fmattack;
    if (attackSound) {
      attackSound.currentTime = 0;
      attackSound.volume = 0.5;
      const p = attackSound.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  _drawShieldEffect(ctx) {
    // Only draw shield if actually invincible
    if (!this.isInvincible || this.bossPhase === 'VULNERABLE') return;
    
    // Tight shield effect that hugs the boss sprite
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const shieldRadius = Math.max(this.width, this.height) / 2 + 8; // Just 8 pixels beyond boss
    
    ctx.save();
    
    // Pulsing shield effect
    const pulseIntensity = 0.3 + 0.2 * Math.sin(Date.now() / 300);
    
    // Shield outline only - no glow for now
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + pulseIntensity})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
  }

  takeDamage(damage) {
    if (this.state === 'dead') return;

    // Boss can ONLY be damaged during vulnerable phase
    if (this.bossPhase !== 'VULNERABLE') {
      return;
    }

    // Trigger brief hurt flash (last row frames 1-2)
    this.hurtFlashTimer = 250;
    
    // Apply damage
    this.hp -= damage;
    
    // Check death
    if (this.hp <= 0 && this.state !== 'dead') {
      this.hp = 0;
      this.state = 'dead';
      this.panting = false;
      this.isInvincible = false;
      this.bossPhase = 'VULNERABLE';
      this.frameTimer = 0;
      this.currentRow = 2;
      this.currentFrame = 2; // Start at death frame 3 and advance to 5
      this.deathHoldTimer = 0;
      this.deathAnimationDone = false;
      
      // Play death sound (use hurt sound if boss death not available)
      const deathSound = this.game.assetLoader?.audio?.sfx_hurt;
      if (deathSound) {
        deathSound.currentTime = 0;
        deathSound.volume = 0.8;
        const p = deathSound.play();
        if (p && p.catch) p.catch(() => {});
      }
    }
  }

 draw(ctx) {
    if (this.state === 'dead') {
      // Death animation - last row frames 3, 4, 5
      const deathFrame = Math.min(4, Math.max(2, Math.floor(this.currentFrame)));
      this._drawBossSprite(ctx, 2, [deathFrame]);
      return;
    }

    // Draw boss sprite based on current phase
    if (this.bossPhase === 'MOVING' || this.bossPhase === 'ATTACKING') {
      // Invincible - first row frames 0-4
      this._drawBossSprite(ctx, 0, [0, 1, 2, 3, 4]);
      
      if (this.isInvincible && typeof this._drawShieldEffect === 'function') {
        this._drawShieldEffect(ctx);
      }
    } else if (this.bossPhase === 'VULNERABLE') {
      // Vulnerable - middle row frames 4-5, or hurt flash frames when just hit
      if (this.hurtFlashTimer > 0) {
        this._drawBossSprite(ctx, 2, [0, 1]);
      } else {
        this._drawBossSprite(ctx, 1, [3, 4]);
      }
    }

    this._drawHealthBar(ctx);

    // --- UPGRADED BURN & SLOW VISUAL OVERLAYS ---
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

    // Draw panting indicator (when vulnerable)
    if (this.panting && this.state !== 'dead') {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // Bouncing "..." effect
      const bounce = Math.sin(Date.now() / 200) * 5;
      ctx.fillText('...', this.x + this.width / 2, this.y - 30 + bounce);
      
      ctx.restore();
    }

    // Draw boss phase indicator (debug)
    if (CONSTANTS.DEBUG_MODE) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Phase: ${this.bossPhase} | Invincible: ${this.isInvincible} | HP: ${this.hp}`,
        this.x + this.width / 2,
        this.y - 50
      );
      ctx.restore();
    }
  }
}