// Enemy.js – Represents an enemy unit.
// Handles movement, combat, status effects (slow/burn), and rendering.

// Enemy.js – Represents an enemy unit.
// Handles movement, combat, status effects (slow/burn), and rendering.

const ENEMY_TYPES = {
  gangster:   { hp: 40,  speed: 1.2, damage: 10, kitaReward: 20, spriteKey: 'enemy_gangster' },
  cockroach:  { hp: 15,  speed: 2.5, damage: 5,  kitaReward: 10, spriteKey: 'enemy_cockroach' },
  rat:        { hp: 20,  speed: 2.0, damage: 5,  kitaReward: 10, spriteKey: 'enemy_rat' },
  dog:        { hp: 35,  speed: 1.8, damage: 15, kitaReward: 15, spriteKey: 'enemy_dog' },
  student:    { hp: 30,  speed: 1.5, damage: 8,  kitaReward: 15, spriteKey: 'enemy_student' },
  worker:     { hp: 50,  speed: 1.0, damage: 12, kitaReward: 20, spriteKey: 'enemy_worker' },
  elite:      { hp: 80,  speed: 0.8, damage: 20, kitaReward: 30, spriteKey: 'enemy_elite' },
  boss_kap:   { hp: 300, speed: 0.5, damage: 30, kitaReward: 100, spriteKey: 'boss_inspector' },
  boss_diwata:{ hp: 400, speed: 0.6, damage: 25, kitaReward: 150, spriteKey: 'boss_vlogger' },
  boss_final: { hp: 600, speed: 0.4, damage: 40, kitaReward: 300, spriteKey: 'boss_mastermind' },
};

class Enemy {
  constructor(game, type = 'gangster') {
    this.game = game;
    this.type = type;
    this.alive = true;
    this.isAlive = true;

    const config = ENEMY_TYPES[type] || ENEMY_TYPES.gangster;
    
    // ===== POSITION & TRUE HITBOX SIZE =====
    // We expanded the hitboxes so they match the actual visual height/width!
    this.width = type === 'cockroach' ? 40 : 60;
    this.height = type === 'cockroach' ? 70 : 110;
    
    this.x = game.canvas.width + 50; 
    // Randomize Y slightly, but keep their feet strictly planted in the gameplay area
    this.y = Math.random() * (game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) + CONSTANTS.GAME_BOTTOM_HALF;
    
    // We separate drawing coords from physical coords so dead bodies don't block shots
    this.drawX = this.x;
    this.drawY = this.y;

    // ===== HEALTH =====
    const difficulty = this.game.levelManager?.currentDifficulty || CONSTANTS.DIFFICULTY.medium;
    this.maxHp = config.hp * difficulty.hpMult;
    this.hp = this.maxHp;

    // ===== MOVEMENT & COMBAT =====
    this.baseSpeed = config.speed * difficulty.speedMult;
    this.speed = this.baseSpeed;
    this.damage = config.damage;
    this.kitaReward = config.kitaReward;
    this.spriteKey = config.spriteKey;

    this.lastAttackTime = 0;

    // ===== STATUS EFFECTS =====
    this.slowActive = false;
    this.slowDuration = 0;
    this.slowFactor = 1;

    this.burnActive = false;
    this.burnDuration = 0;
    this.burnDamagePerTick = 0;
    this.lastBurnTick = 0;

    // ===== ANIMATION STATE MACHINE =====
    this.state = 'walk'; // States: 'walk', 'attack', 'hurt', 'dead'
    this.currentFrame = 0;
    this.animationTimer = 0;
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
    const now = Date.now();
    return (now - this.lastAttackTime) >= CONSTANTS.ENEMY_ATTACK_COOLDOWN;
  }

  recordAttack() {
    this.lastAttackTime = Date.now();
  }

  getCollisionRect() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  takeDamage(damage) {
    if (this.state === 'dead') return; // Dead bodies don't take more damage

    this.hp -= damage;
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.currentFrame = 0;
      
      // Move the physical collision box far off-screen so Rice/Pares pass OVER the corpse!
      this.drawX = this.x;
      this.drawY = this.y;
      this.x = -9999; 
      this.y = -9999;
    } else {
      // Show flinch animation when hit
      this.state = 'hurt';
      this.currentFrame = 0;
    }
  }

  update(delta) {
    if (!this.isAlive) return;

    // Keep visual coordinates tied to physical coordinates (unless dead)
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
    if (this.state !== 'dead' && this.state !== 'hurt') {
      if (this.isNearPlayer()) {
        this.state = 'attack';
        if (this.canAttack()) {
          this.game.player.takeDamage(CONSTANTS.PLAYER_DAMAGE_ON_HIT);
          this.recordAttack();
        }
      } else {
        this.state = 'walk';
        this.x -= this.speed;
      }
    }

    // Stop moving if they reach the far left bounds
    if (this.x < -this.width) {
      this.isAlive = false;
    }

    // ===== ANIMATION TIMER & FRAME CONFIG =====
    let maxFrames = 7;
    let frameSpeed = 100;

    if (this.state === 'dead') { 
      maxFrames = 5; 
      frameSpeed = 150; // Slower dramatic death
    } else if (this.state === 'hurt') { 
      maxFrames = 1; 
      frameSpeed = 250; // Flash the hurt frame for 250ms
    } else if (this.state === 'attack') { 
      maxFrames = 3; 
      frameSpeed = 150; // Attack animation speed
    }

    this.animationTimer += delta;
    if (this.animationTimer >= frameSpeed) {
      this.animationTimer = 0;
      this.currentFrame++;
      
      // Handle animation endings
      if (this.state === 'dead') {
        if (this.currentFrame >= maxFrames) {
          this.isAlive = false; // Despawn completely and grant Kita
        }
      } else if (this.state === 'hurt') {
        if (this.currentFrame >= maxFrames) {
          this.state = 'walk'; // Go back to walking after flinching
          this.currentFrame = 0;
        }
      } else {
        this.currentFrame = this.currentFrame % maxFrames;
      }
    }
  }

draw(ctx) {
    if (!this.isAlive) return;

    // Force Canvas to draw crisp pixel art without blurry edges
    ctx.imageSmoothingEnabled = false;

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];
    
    if (sprite && sprite.complete) {
      // 7 columns by 3 rows
      const cols = 7;
      const rows = 3;
      
      const exactSw = sprite.width / cols;
      const exactSh = sprite.height / rows;

      // ===== MAP SPRITE GRID TO ANIMATION STATE =====
      let row = 0;
      let startCol = 0;
      
      if (this.state === 'dead') { 
        row = 2; // Bottom row
        startCol = 0; 
      } else if (this.state === 'hurt') { 
        row = 1; // Middle row
        startCol = 1; // Col 1 is the 'flinch' frame
      } else if (this.state === 'attack') { 
        row = 1; // Middle row
        startCol = 2; // Cols 2, 3, 4 are the stabbing frames
      } else { 
        row = 0; // Top row is walking
        startCol = 0; 
      }

      // Calculate exact start AND end pixels to absolutely prevent drift
     // Calculate exact start AND end pixels to absolutely prevent drift
      const sx = Math.floor((startCol + this.currentFrame) * exactSw);
      const nextSx = Math.floor((startCol + this.currentFrame + 1) * exactSw);
      const sw = nextSx - sx; 

      const sy = Math.floor(row * exactSh);
      const nextSy = Math.floor((row + 1) * exactSh);
      const sh = nextSy - sy;

      // --- ADAPTIVE ANTI-BLEED FIX ---
      // We change the padding based on what the enemy is currently doing!
      let padX = 0;
      let padY = 0;

      if (this.state === 'walk' || this.state === 'hurt') {
        padX = 6; // Aggressive crop to prevent bleeding while walking
        padY = 4;
      } else if (this.state === 'attack') {
        padX = 1; // Barely any crop so the extended knife arm isn't chopped off!
        padY = 2;
      } else if (this.state === 'dead') {
        padX = 0; // No crop so the lying down animation fits perfectly
        padY = 0;
      }

      const cropX = sx + padX;
      const cropY = sy + padY;
      const cropW = sw - (padX * 2);
      const cropH = sh - (padY * 2);

      const targetHeight = this.type === 'cockroach' ? 70 : 110; 
      const scale = targetHeight / cropH;
      const drawW = cropW * scale;
      const drawH = targetHeight;
      
      ctx.save();
      // Use drawX/drawY so corpses stay exactly where they died
      ctx.translate(this.drawX + this.width / 2, this.drawY + this.height);
      
      ctx.scale(-1, 1); // Flip horizontally!

      // Draw using the aggressively cropped coordinates
      ctx.drawImage(sprite, cropX, cropY, cropW, cropH, -drawW / 2, -drawH, drawW, drawH);
      
      // Draw Burn/Slow Tint
      if (this.burnActive) {
        ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
        ctx.globalCompositeOperation = 'source-over';
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

    // Only draw HP bars and icons on LIVING enemies
    if (this.state !== 'dead') {
      ctx.fillStyle = '#00FF00';
      const barWidth = this.width * (this.hp / this.maxHp);
      ctx.fillRect(this.drawX, this.drawY - 12, barWidth, 5);

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.drawX, this.drawY - 12, this.width, 5);

      let iconX = this.drawX + this.width / 2 - 8;
      if (this.slowActive) {
        ctx.fillStyle = '#0096FF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('S', iconX + 4, this.drawY - 16);
        iconX += 10;
      }
      if (this.burnActive) {
        ctx.fillStyle = '#FF6400';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('B', iconX + 4, this.drawY - 16);
      }
    }
  }
}