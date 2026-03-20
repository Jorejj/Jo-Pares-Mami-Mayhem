// Enemy.js – Represents an enemy unit.
// Handles movement, combat, status effects (slow/burn), and rendering.

const ENEMY_TYPES = {
  gangster:   { hp: 40,  speed: 1.2, damage: 10, kitaReward: 20, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_gangster' },
  cockroach:  { hp: 15,  speed: 2.5, damage: 5,  kitaReward: 10, baseWidth: 40, baseHeight: 60,  spriteKey: 'enemy_cockroach' },
  jbhotdog:   { hp: 30,  speed: 1.5, damage: 8,  kitaReward: 15, baseWidth: 55, baseHeight: 160, spriteKey: 'enemy_jbhotdog' },
  bikejor:    { hp: 25,  speed: 2.2, damage: 10, kitaReward: 15, baseWidth: 70, baseHeight: 190, spriteKey: 'enemy_bikejor' },
  kitboard:   { hp: 45,  speed: 1.3, damage: 12, kitaReward: 20, baseWidth: 50, baseHeight: 140, spriteKey: 'enemy_kitboard' },
  rex:        { hp: 50,  speed: 1.0, damage: 15, kitaReward: 25, baseWidth: 50, baseHeight: 165, spriteKey: 'enemy_rex' },
  rat:        { hp: 20,  speed: 2.0, damage: 5,  kitaReward: 10, baseWidth: 40, baseHeight: 50,  spriteKey: 'enemy_rat' },
  dog:        { hp: 35,  speed: 1.8, damage: 15, kitaReward: 15, baseWidth: 60, baseHeight: 80,  spriteKey: 'enemy_dog' },
  student:    { hp: 30,  speed: 1.5, damage: 8,  kitaReward: 15, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_student' },
  worker:     { hp: 50,  speed: 1.0, damage: 12, kitaReward: 20, baseWidth: 55, baseHeight: 110, spriteKey: 'enemy_worker' },
  elite:      { hp: 80,  speed: 0.8, damage: 20, kitaReward: 300, baseWidth: 60, baseHeight: 120, spriteKey: 'enemy_elite' },
  boss_kap:   { hp: 300, speed: 0.5, damage: 30, kitaReward: 100, baseWidth: 120, baseHeight: 220, spriteKey: 'boss_kap' }, 
  boss_diwata:{ hp: 400, speed: 0.6, damage: 25, kitaReward: 150, baseWidth: 120, baseHeight: 220, spriteKey: 'boss_vlogger' },
  boss_final: { hp: 600, speed: 0.4, damage: 40, kitaReward: 300, baseWidth: 130, baseHeight: 240, spriteKey: 'boss_mastermind' },
  newDaga1:   { hp: 150, speed: 0.4, damage: 40, kitaReward: 30, baseWidth: 60, baseHeight: 150, spriteKey: 'newDaga1' },
  ian:        { hp: 150, speed: 0.4, damage: 40, kitaReward: 100, baseWidth: 90, baseHeight: 180, spriteKey: 'ian' },
};

class Enemy {
  constructor(game, type = 'gangster') {
    this.game = game;
    this.type = type;
    this.alive = true;
    this.isAlive = true;

    const config = ENEMY_TYPES[type] || ENEMY_TYPES.gangster;
    
    this.width = config.baseWidth || 60;
    this.height = config.baseHeight || 110;
    
    this.x = game.canvas.width + 50; 
    this.y = Math.random() * (game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) + CONSTANTS.GAME_BOTTOM_HALF;
    
    this.drawX = this.x;
    this.drawY = this.y;

    const difficulty = this.game.levelManager?.currentDifficulty || CONSTANTS.DIFFICULTY.medium;
    this.maxHp = config.hp * difficulty.hpMult;
    this.hp = this.maxHp;

    this.baseSpeed = config.speed * difficulty.speedMult;
    this.speed = this.baseSpeed;
    this.damage = config.damage;
    this.kitaReward = config.kitaReward;
    this.spriteKey = config.spriteKey;

    this.lastAttackTime = 0;

    this.slowActive = false;
    this.slowDuration = 0;
    this.slowFactor = 1;

    this.burnActive = false;
    this.burnDuration = 0;
    this.burnDamagePerTick = 0;
    this.lastBurnTick = Date.now();

    this.state = 'walk'; 
    this.currentFrame = 0;
    this.animationTimer = 0;
    
    this.alpha = 1;      
    this.deathTimer = 0; 
    this.footstepTimer = 0;
    this.voiceTimer = 0;
  }

  // Helper method to bulletproof audio playback
  _playAudioSafe(audioElement) {
    if (!audioElement) return;
    try {
      const playPromise = audioElement.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => { /* Ignore missing audio errors silently */ });
      }
    } catch (e) {}
  }

  applySlowStatus(duration, factor) {
    this.slowActive = true;
    this.slowDuration = duration;
    this.slowFactor = factor;
    this.updateSpeed();
  }

  applyBurnStatus(duration, damagePerTick) {
    this.burnActive = true;
    this.burnDuration = duration;
    this.burnDamagePerTick = damagePerTick;
    this.lastBurnTick = Date.now();
  }

  updateSpeed() {
    let speedMultiplier = 1;
    if (this.slowActive && this.slowFactor) {
      speedMultiplier *= this.slowFactor;
    }
    this.speed = this.baseSpeed * speedMultiplier;
  }

  isNearPlayer() {
    if (this.state === 'dead') return false;
    return this.x <= CONSTANTS.PLAYER_X + CONSTANTS.PLAYER_WIDTH + CONSTANTS.PLAYER_ATTACK_RANGE;
  }

  canAttack() {
    return (Date.now() - this.lastAttackTime) >= CONSTANTS.ENEMY_ATTACK_COOLDOWN;
  }

  recordAttack() {
    this.lastAttackTime = Date.now();
  }

  getCollisionRect() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  takeDamage(damage) {
    if (this.state === 'dead') return; 

    this.hp -= damage;
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.currentFrame = 0;
      
      // --- AUDIO LOGIC ---
      if (this.game.assetLoader) {
        const moneyAudio = this.game.assetLoader.audio?.sfx_money;
        if (moneyAudio) {
          moneyAudio.currentTime = 0;
          moneyAudio.volume = 0.6;
          this._playAudioSafe(moneyAudio);
        }

        const isFemale = ['boss_diwata'].includes(this.type);
        const isAnimal = ['cockroach', 'rat', 'dog', 'newDaga1'].includes(this.type);
        
        let randomSound = null;

        if (isAnimal) {
          randomSound = 'sfx_animal_death'; 
        } else if (isFemale) {
          const femaleSounds = ['sfx_deathsoundfm', 'sfx_deathsoundfm2', 'sfx_deathsoundfm3'];
          randomSound = femaleSounds[Math.floor(Math.random() * femaleSounds.length)];
        } else {
          const maleSounds = ['sfx_deathman1', 'sfx_deathsound', 'sfx_deathsound1', 'sfx_deathsoundmale', 'sfx_deathsoundmale2', 'sfx_mandeath2'];
          randomSound = maleSounds[Math.floor(Math.random() * maleSounds.length)];
        }
        
        const deathAudio = this.game.assetLoader.audio?.[randomSound];
        if (deathAudio) {
          deathAudio.currentTime = 0;
          deathAudio.volume = 0.8;
          this._playAudioSafe(deathAudio);
        }
      }

      if (this.game.player) {
        this.game.player.addKita(this.kitaReward || 20);
      }
      
      this.drawX = this.x;
      this.drawY = this.y;
      this.x = -9999; 
      this.y = -9999;
    } else {
      this.state = 'hurt';
      this.currentFrame = 0;
    }
  }

  update(delta) {
    if (!this.isAlive) return;

    if (this.state !== 'dead') {
      this.drawX = this.x;
      this.drawY = this.y;
    }

    // ===== STATUS EFFECTS =====
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
      if (now - this.lastBurnTick >= 100) { 
        this.takeDamage(this.burnDamagePerTick);
        this.lastBurnTick = now;
      }
      if (this.burnDuration <= 0) {
        this.burnActive = false;
      }
    }

    // ===== COMBAT & MOVEMENT STATE MACHINE =====
    const isAnimal = ['cockroach', 'rat', 'dog', 'newDaga1'].includes(this.type);

    if (this.state !== 'dead' && this.state !== 'hurt') {
      const player = this.game.player;
      const targetX = player.x + player.width / 2;
      const targetY = player.y + player.height / 2;
      
      const dist = Physics.getDistance(this.x + this.width / 2, this.y + this.height / 2, targetX, targetY);
      const attackRange = CONSTANTS.ENEMY_ATTACK_RANGE + player.width / 2;

      if (dist <= attackRange) {
        this.state = 'attack';
        if (this.canAttack()) {
          player.takeDamage(this.damage || CONSTANTS.PLAYER_DAMAGE_ON_HIT);
          this.recordAttack();

          // Female Attack Audio
          const isFemale = ['boss_diwata'].includes(this.type);
          if (isFemale && this.game.assetLoader) {
            const atkSound = Math.random() > 0.5 ? 'sfx_fmattack' : 'sfx_fmattack1';
            const audio = this.game.assetLoader.audio[atkSound];
            if (audio) {
              audio.currentTime = 0;
              audio.volume = 0.7;
              this._playAudioSafe(audio);
            }
          }
        }
      } else {
        this.state = 'walk';
        const vel = Physics.calcVelocity(this.x + this.width / 2, this.y + this.height / 2, targetX, targetY, this.speed);
        this.x += vel.velX;
        this.y += vel.velY;

        // Footstep SFX
        this.footstepTimer += delta;
        if (this.footstepTimer > 600) { 
          this.footstepTimer = 0;
          const stepAudio = this.game.assetLoader?.audio?.sfx_footstep;
          if (stepAudio) {
            stepAudio.currentTime = 0;
            stepAudio.volume = 0.15; 
            this._playAudioSafe(stepAudio);
          }
        }
      }

      // Enemy Voice Lines
      this.voiceTimer += delta;
      if (this.voiceTimer > 6000) { 
        this.voiceTimer = 0;
        if (Math.random() > 0.8 && !isAnimal) {
          const voiceAudio = this.game.assetLoader?.audio?.sfx_enemy_voice;
          if (voiceAudio) {
            voiceAudio.currentTime = 0;
            voiceAudio.volume = 0.5;
            this._playAudioSafe(voiceAudio);
          }
        }
      }
    }

    if (this.x < -this.width && this.drawX < -this.width) {
      this.isAlive = false;
    }

    // ===== ANIMATION TIMER & FRAME CONFIG =====
    const maxFrames = 5; 
    let frameSpeed = 100;

    if (this.state === 'dead') { 
      frameSpeed = 150; 
    } else if (this.state === 'hurt') { 
      frameSpeed = 250; 
    } else if (this.state === 'attack') { 
      frameSpeed = 120; 
    }

    this.animationTimer += delta;
    if (this.animationTimer >= frameSpeed) {
      this.animationTimer = 0;
      
      if (this.state === 'dead') {
        if (this.currentFrame < maxFrames - 1) {
          this.currentFrame++;
        }
      } else if (this.state === 'hurt') {
         this.state = 'walk';
         this.currentFrame = 0;
      } else {
        this.currentFrame = (this.currentFrame + 1) % maxFrames;
      }
    }

    // --- FIXED: FADE OUT LINGERING CORPSES ---
    // Now updates continuously every frame!
    if (this.state === 'dead' && this.currentFrame >= maxFrames - 1) {
      this.deathTimer += delta;
      if (this.deathTimer >= 3000) { // Linger for 3 seconds
        this.alpha -= 0.05; // Fade out quickly
        if (this.alpha <= 0) {
            this.isAlive = false; 
        }
      }
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    ctx.imageSmoothingEnabled = false;

    ctx.globalAlpha = Math.max(0, this.alpha);

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    
    // Safety check added here to prevent division by zero crashes
    if (sprite && sprite.complete && sprite.width > 0 && sprite.height > 0) {
      const cols = 5;
      const rows = 3;
      
      const sw = sprite.width / cols;
      const sh = sprite.height / rows;

      let row = 0;
      let frameToDraw = this.currentFrame;

      if (this.state === 'dead') { 
        row = 2; 
      } else if (this.state === 'hurt') { 
        row = 2; 
        frameToDraw = 0; 
      } else if (this.state === 'attack') { 
        row = 1; 
      } else { 
        row = 0; 
      }

      const sx = frameToDraw * sw;
      const sy = row * sh;

      const scale = this.height / sh;
      const drawW = sw * scale;
      const drawH = this.height;
      
      ctx.save();
      ctx.translate(this.drawX + this.width / 2, this.drawY + this.height);
      ctx.scale(-1, 1);

      ctx.drawImage(sprite, sx, sy, sw, sh, -drawW / 2, -drawH, drawW, drawH);
      
      // Status Effect Tints
      if (this.burnActive) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const flicker = Math.sin(this.game.gameFrame / 3) * 0.2 + 0.4;
        ctx.fillStyle = `rgba(255, 100, 0, ${flicker})`;
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
        ctx.restore();

        if (this.game.gameFrame % 4 === 0) {
          ctx.save();
          for (let i = 0; i < 2; i++) {
            const px = (Math.random() - 0.5) * drawW;
            const py = -Math.random() * drawH;
            ctx.fillStyle = Math.random() > 0.5 ? '#ff4500' : '#ffcc00';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else if (this.slowActive) {
        ctx.fillStyle = 'rgba(0, 150, 255, 0.4)';
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();
    } else {
      ctx.fillStyle = CONSTANTS.COLORS.ENEMY;
      ctx.fillRect(this.drawX, this.drawY, this.width, this.height);
    }

    ctx.globalAlpha = 1.0;

    if (this.state !== 'dead') {
      ctx.fillStyle = '#00FF00';
      const barWidth = this.width * (this.hp / this.maxHp);
      ctx.fillRect(this.drawX, this.drawY - 12, barWidth, 5);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.drawX, this.drawY - 12, this.width, 5);
    }
  }
}