// Enemy.js – Represents an enemy unit.
// Handles movement, combat, status effects (slow/burn), and rendering.

const ENEMY_TYPES = {
  cockroach:  { hp: 15,  speed: 2.5, damage: 5,  kitaReward: 10, baseWidth: 40, baseHeight: 60,  spriteKey: 'enemy_cockroach', attackCooldown: 500 }, 
  newDaga1:   { hp: 25,  speed: 2.0, damage: 10, kitaReward: 15, baseWidth: 60, baseHeight: 100, spriteKey: 'enemy_newDaga1', attackCooldown: 500 },
  gangster:   { hp: 40,  speed: 1.2, damage: 10, kitaReward: 20, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_gangster', attackCooldown: 500 },
  dog:        { hp: 35,  speed: 1.8, damage: 15, kitaReward: 15, baseWidth: 60, baseHeight: 80,  spriteKey: 'enemy_dog', attackCooldown: 500 },
  fmteacher:  { hp: 45,  speed: 1.3, damage: 12, kitaReward: 20, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_fmteacher', attackCooldown: 2000 },
  bikejor:    { hp: 35,  speed: 2.2, damage: 15, kitaReward: 15, baseWidth: 70, baseHeight: 190, spriteKey: 'enemy_bikejor', attackCooldown: 500 },
  jbhotdog:   { hp: 50,  speed: 1.5, damage: 12, kitaReward: 20, baseWidth: 55, baseHeight: 160, spriteKey: 'enemy_jbhotdog', attackCooldown: 500 },
  kitboard:   { hp: 60,  speed: 1.3, damage: 15, kitaReward: 25, baseWidth: 50, baseHeight: 140, spriteKey: 'enemy_kitboard', attackCooldown: 500 },
  rex:        { hp: 70,  speed: 1.0, damage: 20, kitaReward: 30, baseWidth: 50, baseHeight: 165, spriteKey: 'enemy_rex', attackCooldown: 500 },
  ian:        { hp: 500, speed: 0.6, damage: 40, kitaReward: 200, baseWidth: 120, baseHeight: 220, spriteKey: 'ian', attackCooldown: 2000 },
  blonde:     { hp: 70,  speed: 1.4, damage: 15, kitaReward: 25, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_blonde', attackCooldown: 500 },
  asbula:     { hp: 80,  speed: 1.1, damage: 20, kitaReward: 30, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_asbula', attackCooldown: 500 },
  willie:     { hp: 85,  speed: 1.2, damage: 25, kitaReward: 35, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_willie', attackCooldown: 500 },
  fmbad:      { hp: 65,  speed: 1.5, damage: 15, kitaReward: 25, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_fmbad', attackCooldown: 2500 },
  angryfm:    { hp: 60,  speed: 1.6, damage: 18, kitaReward: 25, baseWidth: 50, baseHeight: 160, spriteKey: 'enemy_angryfm', attackCooldown: 1500 },
  boss_kap:   { hp: 300, speed: 0.5, damage: 30, kitaReward: 100, baseWidth: 120, baseHeight: 220, spriteKey: 'boss_kap', attackCooldown: 1500 },
  boss_ian:   { hp: 900, speed: 0.9, damage: 40, kitaReward: 300, baseWidth: 120, baseHeight: 220, spriteKey: 'boss_ian', attackCooldown: 2000 },
  boss_final: { hp: 800, speed: 0.4, damage: 50, kitaReward: 500, baseWidth: 130, baseHeight: 240, spriteKey: 'boss_mastermind', attackCooldown: 2000 }, 
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
    this.attackCooldown = config.attackCooldown || 1000;

    this.lastAttackTime = Date.now();
    this.slowActive = false; this.slowDuration = 0; this.slowFactor = 1;
    this.burnActive = false; this.burnDuration = 0; this.burnDamagePerTick = 0; this.lastBurnTick = Date.now();

    this.state = 'walk'; 
    this.currentFrame = 0;
    this.animationTimer = 0;
    this.alpha = 1;      
    this.deathTimer = 0; 
    this.footstepTimer = 0;
    this.voiceTimer = 0;

    this.isRanged = ['fmbad', 'angryfm', 'fmteacher'].includes(this.type);
    this.isFemale = ['blonde', 'fmbad', 'angryfm', 'fmteacher'].includes(this.type);
    this.isAnimal = ['cockroach', 'rat', 'newDaga1', 'dog'].includes(this.type);
    
    this.attackRange = this.isRanged ? 600 : 150; 
  }

  _playAudioSafe(audioElement) {
    if (!audioElement) return;
    try { const p = audioElement.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }

  applySlowStatus(duration, factor) { this.slowActive = true; this.slowDuration = duration; this.slowFactor = factor; this.updateSpeed(); }
  applyBurnStatus(duration, damagePerTick) { this.burnActive = true; this.burnDuration = duration; this.burnDamagePerTick = damagePerTick; this.lastBurnTick = Date.now(); }
  
  updateSpeed() {
    let speedMultiplier = 1;
    if (this.slowActive && this.slowFactor) speedMultiplier *= this.slowFactor;
    this.speed = this.baseSpeed * speedMultiplier;
  }

  canAttack() { 
    return (Date.now() - this.lastAttackTime) >= this.attackCooldown; 
  }
  
  recordAttack() { this.lastAttackTime = Date.now(); }
  getCollisionRect() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }

  takeDamage(damage) {
    if (this.state === 'dead' || this.state === 'fading') return; 

    this.hp -= damage;
    if (this.hp <= 0) {
      
      // --- FIXED: KILL COUNTER SYNC HACK ---
      // We set HP to 1 so the game ignores this kill until the fadeout animation completely finishes!
      this.hp = 1; 
      this.state = 'fading'; 
      
      this.currentFrame = 0;
      this.rewardGiven = false; 
      
      if (this.game.assetLoader) {
        let randomSound = null;

        if (this.isAnimal) {
          if (this.type === 'cockroach') randomSound = 'sfx_animal_cockroach';
          else if (this.type === 'dog') randomSound = 'sfx_animal_dog';
          else randomSound = 'sfx_animal_rat';
        } else if (this.isFemale) {
          const femaleSounds = ['sfx_deathsoundfm', 'sfx_deathsoundfm2', 'sfx_deathsoundfm3'];
          randomSound = femaleSounds[Math.floor(Math.random() * femaleSounds.length)];
        } else {
          const maleSounds = ['sfx_deathman1', 'sfx_deathsound', 'sfx_deathsound1', 'sfx_deathsoundmale', 'sfx_deathsoundmale2', 'sfx_mandeath2'];
          randomSound = maleSounds[Math.floor(Math.random() * maleSounds.length)];
        }
        
        const deathAudio = this.game.assetLoader.audio?.[randomSound];
        if (deathAudio) { 
          deathAudio.currentTime = 0; 
          deathAudio.volume = (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1); 
          this._playAudioSafe(deathAudio); 
        }
      }

      this.drawX = this.x; this.drawY = this.y;
      this.x = -9999; this.y = -9999;
    } else {
      this.state = 'hurt'; this.currentFrame = 0;
    }
  }

  update(delta) {
    if (!this.isAlive) return;

    if (this.state !== 'dead' && this.state !== 'fading') { this.drawX = this.x; this.drawY = this.y; }

    if (this.slowActive) {
      this.slowDuration -= delta;
      if (this.slowDuration <= 0) { this.slowActive = false; this.slowFactor = 1; this.updateSpeed(); }
    }

    if (this.burnActive && this.state !== 'dead' && this.state !== 'fading') {
      this.burnDuration -= delta;
      const now = Date.now();
      if (now - this.lastBurnTick >= 100) { 
        this.takeDamage(this.burnDamagePerTick); 
        this.lastBurnTick = now; 
        
        if (!this.burnSoundCounter) this.burnSoundCounter = 0;
        this.burnSoundCounter++;
        if (this.burnSoundCounter >= 5) {
            const burnAudio = this.game.assetLoader?.audio?.sfx_burn_tick;
            if (burnAudio) { burnAudio.currentTime = 0; burnAudio.volume = 0.15; this._playAudioSafe(burnAudio); }
            this.burnSoundCounter = 0;
        }
      }
      if (this.burnDuration <= 0) this.burnActive = false;
    }

    if (this.state !== 'dead' && this.state !== 'fading' && this.state !== 'hurt') {
      const player = this.game.player;
      const targetX = player.x + player.width / 2;
      const targetY = player.y + player.height / 2;
      
      const dist = Physics.getDistance(this.x + this.width / 2, this.y + this.height / 2, targetX, targetY);

      if (dist <= this.attackRange) {
        this.state = 'attack';
      } else {
        this.state = 'walk';
        const vel = Physics.calcVelocity(this.x + this.width / 2, this.y + this.height / 2, targetX, targetY, this.speed);
        this.x += vel.velX; this.y += vel.velY;

        this.footstepTimer += delta;
        if (this.footstepTimer > 600) { 
          this.footstepTimer = 0;
          const stepAudio = this.game.assetLoader?.audio?.sfx_footstep;
          if (stepAudio) { stepAudio.currentTime = 0; stepAudio.volume = 0.15; this._playAudioSafe(stepAudio); }
        }
      }
    }

    if (this.x < -this.width && this.drawX < -this.width) this.isAlive = false;

    // --- ANIMATION TIMER LOGIC ---
    let frameSpeed = 100;
    if (this.state === 'dead' || this.state === 'fading') frameSpeed = 150; 
    else if (this.state === 'hurt') frameSpeed = 250; 
    else if (this.state === 'attack') frameSpeed = 120; 

    this.animationTimer += delta;

    if (this.state === 'fading' || this.state === 'dead') {
        if (this.animationTimer >= frameSpeed) {
            this.animationTimer = 0;
            if (this.currentFrame < 4) this.currentFrame++;
        }

        if (this.currentFrame >= 4) {
            this.deathTimer += delta;
            
            // Wait a quick half second for them to lay dead
            if (this.deathTimer >= 500) { 
                this.alpha -= 0.1; 
                
                if (this.alpha <= 0) {
                    // NOW WE OFFICIALLY SET HP TO 0 TO REGISTER THE KILL!
                    this.hp = 0; 
                    this.state = 'dead';
                    this.isAlive = false; 
                    
                    if (!this.rewardGiven) {
                        this.rewardGiven = true;
                        if (this.game.player) this.game.player.addKita(this.kitaReward || 20);
                        
                        const moneyAudio = this.game.assetLoader?.audio?.sfx_money;
                        if (moneyAudio) { moneyAudio.currentTime = 0; moneyAudio.volume = (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1) * 0.15; this._playAudioSafe(moneyAudio); }
                    }
                }
            }
        }
    } else if (this.animationTimer >= frameSpeed) {
      this.animationTimer = 0;
      
      if (this.state === 'hurt') {
         this.state = 'walk'; this.currentFrame = 0;
      } else if (this.state === 'attack') {
        
        if (this.isRanged) {
            if (this.canAttack()) {
                this.currentFrame++;
                if (this.currentFrame > 2) {
                    this.currentFrame = 0; 
                    this.recordAttack(); 
                    
                    if (!this.game.enemyProjectiles) this.game.enemyProjectiles = [];
                    const pX = this.game.player.x + this.game.player.width / 2;
                    const pY = this.game.player.y + this.game.player.height / 2;
                    
                    this.game.enemyProjectiles.push(new EnemyProjectile(this.game, this.x, this.y + this.height * 0.2, pX, pY, this.spriteKey, this.damage));
                    
                    const atkSound = Math.random() > 0.5 ? 'sfx_fmattack' : 'sfx_fmattack1';
                    const audio = this.game.assetLoader?.audio?.[atkSound];
                    if (audio) { audio.currentTime = 0; audio.volume = (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1) * 0.7; this._playAudioSafe(audio); }
                }
            } else {
                this.currentFrame = 0; 
            }
        } else {
            if (this.currentFrame === 2 && this.canAttack()) {
                 this.recordAttack();
                 this.game.player.takeDamage(this.damage || 10);
                 
                 let attackSfxKey = 'sfx_attack_punch'; 

                 if (['cockroach', 'dog'].includes(this.type)) {
                     attackSfxKey = 'sfx_attack_bite';
                 } else if (this.type === 'gangster') {
                     attackSfxKey = 'sfx_attack_slash';
                 } else if (['willie', 'rex', 'newDaga1', 'kitboard', 'jbhotdog', 'bikejor'].includes(this.type)) {
                     attackSfxKey = 'sfx_attack_blunt';
                 } else if (this.type === 'boss_kap') {
                     attackSfxKey = 'sfx_attack_drill';
                 } else if (this.type === 'asbula') {
                     attackSfxKey = 'sfx_attack_shutup';
                 } else if (this.isFemale) {
                     attackSfxKey = Math.random() > 0.5 ? 'sfx_fmattack' : 'sfx_fmattack1';
                 }

                 const audio = this.game.assetLoader?.audio?.[attackSfxKey];
                 if (audio) { 
                     audio.currentTime = 0; 
                     audio.volume = (this.game.uiManager?.masterVolume || 1) * (this.game.uiManager?.sfxVolume || 1) * 0.7; 
                     this._playAudioSafe(audio); 
                 }
            }
            this.currentFrame = (this.currentFrame + 1) % 5;
        }
      } else {
        this.currentFrame = (this.currentFrame + 1) % 5; 
      }
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.max(0, this.alpha);

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    
    if (sprite && sprite.complete && sprite.width > 0 && sprite.height > 0) {
      const cols = 5; const rows = 3;
      const sw = sprite.width / cols; const sh = sprite.height / rows;

      let row = 0; let frameToDraw = this.currentFrame;

      if (this.state === 'dead' || this.state === 'fading') { row = 2; } 
      else if (this.state === 'hurt') { row = 2; frameToDraw = 0; } 
      else if (this.state === 'attack') { row = 1; } 
      else { row = 0; }

      const sx = frameToDraw * sw; const sy = row * sh;
      const scale = this.height / sh;
      const drawW = sw * scale; const drawH = this.height;
      
      ctx.save();
      ctx.translate(this.drawX + this.width / 2, this.drawY + this.height);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, sx, sy, sw, sh, -drawW / 2, -drawH, drawW, drawH);
      
      if (this.burnActive) {
        ctx.save(); ctx.globalCompositeOperation = 'source-atop';
        const flicker = Math.sin(this.game.gameFrame / 3) * 0.2 + 0.4;
        ctx.fillStyle = `rgba(255, 100, 0, ${flicker})`;
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
        ctx.restore();
      } else if (this.slowActive) {
        ctx.fillStyle = 'rgba(0, 150, 255, 0.4)'; ctx.globalCompositeOperation = 'source-atop';
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH); ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    } else {
      ctx.fillStyle = CONSTANTS.COLORS.ENEMY; ctx.fillRect(this.drawX, this.drawY, this.width, this.height);
    }

    ctx.globalAlpha = 1.0;
    if (this.state !== 'dead' && this.state !== 'fading') {
      ctx.fillStyle = '#00FF00';
      const barWidth = this.width * (this.hp / this.maxHp);
      ctx.fillRect(this.drawX, this.drawY - 12, barWidth, 5);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.strokeRect(this.drawX, this.drawY - 12, this.width, 5);
    }
  }
}

// ========================================================
class EnemyProjectile {
  constructor(game, x, y, targetX, targetY, spriteKey, damage) {
    this.game = game;
    this.x = x; this.y = y;
    this.width = 60; this.height = 60; 
    this.spriteKey = spriteKey;
    this.damage = damage;
    this.isActive = true;
    this.maxHp = 10; 
    this.hp = this.maxHp;

    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = 4.5; 
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.animationTimer = 0;
    this.currentFrame = 0; 
  }
  
  getCollisionRect() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }

  takeDamage(amount) {
      this.hp -= amount;
      if (this.hp <= 0) this.isActive = false; 
  }

  update(delta) {
    this.x += this.vx; this.y += this.vy;
    this.animationTimer += delta;
    if (this.animationTimer > 100) {
      this.animationTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 2; 
    }
    if (this.x < -100 || this.x > this.game.canvas.width + 100 || this.y > this.game.canvas.height + 100) {
      this.isActive = false;
    }
  }

  draw(ctx) {
    if (!this.isActive) return;
    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    if (sprite && sprite.complete) {
      const cols = 5; const rows = 3;
      const sw = sprite.width / cols; const sh = sprite.height / rows;
      const frameToDraw = 3 + this.currentFrame; 
      const sx = frameToDraw * sw; const sy = 1 * sh; 
      
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.scale(-1, 1); 
      ctx.rotate(this.game.gameFrame * 0.15); 
      const drawSize = 80; 
      ctx.drawImage(sprite, sx, sy, sw, sh, -drawSize/2, -drawSize/2, drawSize, drawSize);
      ctx.restore();
    } else {
        ctx.fillStyle = 'red'; ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    ctx.fillStyle = '#00FF00';
    const barWidth = this.width * (this.hp / this.maxHp);
    ctx.fillRect(this.x, this.y - 10, barWidth, 4); 
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.strokeRect(this.x, this.y - 10, this.width, 4);
  }
}
