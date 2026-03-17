// Enemy.js – Represents an enemy unit.
// Handles movement, combat, status effects (slow/burn), and rendering.

const ENEMY_TYPES = {
  gangster: {
    hp: 40,
    speed: 1.2,
    damage: 10,
    kitaReward: 20,
    baseWidth: 50,
    baseHeight: 160,
    spriteKey: "enemy_gangster",
  },
  cockroach: {
    hp: 15,
    speed: 2.5,
    damage: 5,
    kitaReward: 10,
    baseWidth: 40,
    baseHeight: 60,
    spriteKey: "enemy_cockroach",
  },
  jbhotdog: {
    hp: 30,
    speed: 1.5,
    damage: 8,
    kitaReward: 15,
    baseWidth: 55,
    baseHeight: 160,
    spriteKey: "enemy_jbhotdog",
  },
  bikejor: {
    hp: 25,
    speed: 2.2,
    damage: 10,
    kitaReward: 15,
    baseWidth: 70,
    baseHeight: 190,
    spriteKey: "enemy_bikejor",
  },
  kitboard: {
    hp: 45,
    speed: 1.3,
    damage: 12,
    kitaReward: 20,
    baseWidth: 50,
    baseHeight: 140,
    spriteKey: "enemy_kitboard",
  },
  rex: {
    hp: 50,
    speed: 1.0,
    damage: 15,
    kitaReward: 25,
    baseWidth: 50,
    baseHeight: 185,
    spriteKey: "enemy_rex",
  },
  rat: {
    hp: 20,
    speed: 2.0,
    damage: 5,
    kitaReward: 10,
    baseWidth: 40,
    baseHeight: 50,
    spriteKey: "enemy_rat",
  },
  dog: {
    hp: 35,
    speed: 1.8,
    damage: 15,
    kitaReward: 15,
    baseWidth: 60,
    baseHeight: 80,
    spriteKey: "enemy_dog",
  },
  student: {
    hp: 30,
    speed: 1.5,
    damage: 8,
    kitaReward: 15,
    baseWidth: 50,
    baseHeight: 160,
    spriteKey: "enemy_student",
  },
  worker: {
    hp: 50,
    speed: 1.0,
    damage: 12,
    kitaReward: 20,
    baseWidth: 55,
    baseHeight: 110,
    spriteKey: "enemy_worker",
  },
  elite: {
    hp: 80,
    speed: 0.8,
    damage: 20,
    kitaReward: 30,
    baseWidth: 60,
    baseHeight: 120,
    spriteKey: "enemy_elite",
  },
  boss_kap: {
    hp: 300,
    speed: 0.5,
    damage: 30,
    kitaReward: 100,
    baseWidth: 80,
    baseHeight: 160,
    spriteKey: "boss_inspector",
  },
  boss_diwata: {
    hp: 400,
    speed: 0.6,
    damage: 25,
    kitaReward: 150,
    baseWidth: 80,
    baseHeight: 160,
    spriteKey: "boss_vlogger",
  },
  boss_final: {
    hp: 600,
    speed: 0.4,
    damage: 40,
    kitaReward: 300,
    baseWidth: 90,
    baseHeight: 180,
    spriteKey: "boss_mastermind",
  },
  newDaga1: {
    hp: 150,
    speed: 0.4,
    damage: 40,
    kitaReward: 300,
    baseWidth: 60,
    baseHeight: 150,
    spriteKey: "newDaga1",
  },
  ian: {
    hp: 150,
    speed: 0.4,
    damage: 40,
    kitaReward: 300,
    baseWidth: 90,
    baseHeight: 180,
    spriteKey: "ian",
  },
};

class Enemy {
  constructor(game, type = "gangster") {
    this.game = game;
    this.type = type;
    this.alive = true;
    this.isAlive = true;

    const config = ENEMY_TYPES[type] || ENEMY_TYPES.gangster;

    // ===== POSITION & TRUE HITBOX SIZE =====
    // This now reads dynamically from the ENEMY_TYPES config above!
    this.width = config.baseWidth || 60;
    this.height = config.baseHeight || 110;

    this.x = game.canvas.width + 50;
    this.y =
      Math.random() *
        (game.canvas.height - CONSTANTS.GAME_BOTTOM_HALF - this.height) +
      CONSTANTS.GAME_BOTTOM_HALF;

    this.drawX = this.x;
    this.drawY = this.y;

    // ===== HEALTH =====
    const difficulty =
      this.game.levelManager?.currentDifficulty || CONSTANTS.DIFFICULTY.medium;
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
    this.lastBurnTick = Date.now();

    // ===== ANIMATION STATE MACHINE =====
    this.state = "walk";
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
    if (this.state === "dead") return false;
    return (
      this.x <=
      CONSTANTS.PLAYER_X +
        CONSTANTS.PLAYER_WIDTH +
        CONSTANTS.PLAYER_ATTACK_RANGE
    );
  }

  canAttack() {
    const now = Date.now();
    return now - this.lastAttackTime >= CONSTANTS.ENEMY_ATTACK_COOLDOWN;
  }

  recordAttack() {
    this.lastAttackTime = Date.now();
  }

  getCollisionRect() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  takeDamage(damage) {
    if (this.state === "dead") return;

    this.hp -= damage;

    if (this.hp <= 0) {
      this.hp = 0;
      this.state = "dead";
      this.currentFrame = 0;

      this.drawX = this.x;
      this.drawY = this.y;
      this.x = -9999;
      this.y = -9999;
    } else {
      this.state = "hurt";
      this.currentFrame = 0;
    }
  }

  update(delta) {
    if (!this.isAlive) return;

    if (this.state !== "dead") {
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

    if (this.burnActive && this.state !== "dead") {
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
    if (this.state !== "dead" && this.state !== "hurt") {
      if (this.isNearPlayer()) {
        this.state = "attack";
        if (this.canAttack()) {
          this.game.player.takeDamage(CONSTANTS.PLAYER_DAMAGE_ON_HIT);
          this.recordAttack();
        }
      } else {
        this.state = "walk";
        this.x -= this.speed;
      }
    }

    if (this.x < -this.width) {
      this.isAlive = false;
    }

    // ===== ANIMATION TIMER & FRAME CONFIG =====
    let maxFrames = 5;
    let frameSpeed = 100;

    if (this.state === "dead") {
      frameSpeed = 150;
    } else if (this.state === "hurt") {
      maxFrames = 1;
      frameSpeed = 250;
    } else if (this.state === "attack") {
      frameSpeed = 120;
    }

    this.animationTimer += delta;
    if (this.animationTimer >= frameSpeed) {
      this.animationTimer = 0;
      this.currentFrame++;

      if (this.state === "dead") {
        // Stop on the last frame of the death animation
        if (this.currentFrame >= maxFrames) {
          this.currentFrame = maxFrames - 1;
        }
      } else {
        // Loop normally
        this.currentFrame = this.currentFrame % maxFrames;

        // Return to walk after flinching
        if (this.state === "hurt") {
          this.state = "walk";
        }
      }
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    ctx.imageSmoothingEnabled = false;

    const sprite = this.game.assetLoader?.images?.[this.spriteKey];

    if (sprite && sprite.complete) {
      const cols = 5;
      const rows = 3;

      const sw = sprite.width / cols;
      const sh = sprite.height / rows;

      let row = 0;
      if (this.state === "dead") {
        row = 2;
      } else if (this.state === "hurt") {
        row = 2;
      } else if (this.state === "attack") {
        row = 1;
      } else {
        row = 0;
      }

      const sx = this.currentFrame * sw;
      const sy = row * sh;

      // --- NEW ASPECT RATIO FIX ---
      // Scale the width proportionally to the target height so they don't look slim!
      const scale = this.height / sh;
      const drawW = sw * scale;
      const drawH = this.height;

      ctx.save();
      // Translate to bottom-center of the collision box
      ctx.translate(this.drawX + this.width / 2, this.drawY + this.height);
      ctx.scale(-1, 1); // Flip horizontally

      // Draw using the new proportional drawW
      ctx.drawImage(sprite, sx, sy, sw, sh, -drawW / 2, -drawH, drawW, drawH);

      // Status Tints
      if (this.burnActive) {
        ctx.fillStyle = "rgba(255, 100, 0, 0.4)";
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
        ctx.globalCompositeOperation = "source-over";
      } else if (this.slowActive) {
        ctx.fillStyle = "rgba(0, 150, 255, 0.4)";
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.restore();
    } else {
      ctx.fillStyle = CONSTANTS.COLORS.ENEMY;
      ctx.fillRect(this.drawX, this.drawY, this.width, this.height);
    }

    // Draw HP bars
    if (this.state !== "dead") {
      ctx.fillStyle = "#00FF00";
      const barWidth = this.width * (this.hp / this.maxHp);
      ctx.fillRect(this.drawX, this.drawY - 12, barWidth, 5);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(this.drawX, this.drawY - 12, this.width, 5);
    }
  }
}
