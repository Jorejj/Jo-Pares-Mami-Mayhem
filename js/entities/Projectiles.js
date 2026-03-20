// Projectiles.js – Defines all food projectiles Jo can launch from his catapult.
// Projectile physics are handled by Physics.js; this class manages state, collision, and rendering.
// Special behaviors: Mami (standard), Pares (splits at apex), Rice (splash radius on impact)

const PROJECTILE_CONFIG = {
  mami:  { baseDamage: 25, radius: 5,  color: '#FFD700' },
  pares: { baseDamage: 40, radius: 7,  color: '#FF6B35' },
  cola:  { baseDamage: 20, radius: 5,  color: '#8B4513' }, // Added Cola just in case!
  rice:  { baseDamage: 15, radius: 4,  color: '#90EE90', splashRadius: 80 },
};

class Projectile {
  constructor(game, x, y, velX, velY, type, damage, level = 1) {
    this.game = game;
    this.type = type;
    this.level = level;

    const config = PROJECTILE_CONFIG[type] || PROJECTILE_CONFIG.mami;
    this.radius = config.radius;
    this.color = config.color;
    this.damage = damage;
    this.splashRadius = config.splashRadius || 0;

    this.x = x;
    this.y = y;

    // Velocity (pixels per frame)
    this.velX = velX;
    this.velY = velY;
    this.prevVelY = this.velY;

    this.isActive = true;
    this.hasHit = false;
    this.apexReached = false;

    // ===== NEW: SPRITE SHEET CONFIGURATION =====
    // Change these if your grid cells in projectiles.png are not 64x64
    this.frameWidth = 64;  
    this.frameHeight = 64; 

    // Maps the weapon type to the specific row on your image
    this.typeToRowMap = {
      'mami': 0,  // Top row
      'pares': 1, // 2nd row
      'cola': 2,  // 3rd row
      'rice': 3   // 4th row
    };
  }

  /**
   * Called when projectile hits something.
   * Special behavior per projectile type.
   * @param {Enemy} enemy - Enemy the projectile hit
   */
  onHit(enemy) {
    if (this.type === 'rice') {
      // Rice: Apply splash damage to nearby enemies
      this._applySplashDamage(enemy);
    } else if (this.type === 'pares') {
      // Pares: Already hit the enemy normally, special split happens at apex
    }
    this.hasHit = true;
  }

  /**
   * Apply splash damage to all enemies in radius of impact.
   * Used by Rice projectile type.
   * @private
   */
  _applySplashDamage(impactEnemy) {
    const enemies = (this.game.waveManager && this.game.waveManager.enemies) || [];
    
    enemies.forEach(enemy => {
      if (!enemy.isAlive) return;

      const dist = Physics.getDistance(
        this.x, this.y,
        enemy.x + enemy.width / 2, enemy.y + enemy.height / 2
      );

      if (dist <= this.splashRadius) {
        // Reduced splash damage (60% of normal)
        const splashDamage = Math.ceil(this.damage * 0.6);
        enemy.takeDamage(splashDamage);
      }
    });
  }

  /**
   * Spawn child projectiles when Pares reaches apex.
   * Splits into 2-3 smaller projectiles moving downward.
   * @private
   */
  _splitAtApex() {
    if (this.apexReached || this.game.player.projectiles.length > 50) return;

    this.apexReached = true;

    // Create 2 child projectiles
    for (let i = -1; i <= 1; i += 2) {
      const childProj = new Projectile(
        this.game,
        this.x + i * 20,
        this.y,
        this.velX + i * 3, // Spread sideways
        this.velY + 2,      // Downward
        'mami',             // Child becomes basic mami
        this.damage * 0.5,  // Half damage
        this.level
      );
      this.game.player.projectiles.push(childProj);
    }

    this.isActive = false; // Original projectile dies
  }

  /**
   * Update projectile state each frame.
   * - Apply physics (gravity)
   * - Check bounds
   * - Special logic per type
   * @param {number} delta - Time delta in ms
   */
  update(delta) {
    if (!this.isActive) return;

    this.prevVelY = this.velY;
    this.x += this.velX;
    this.y += this.velY;

    // Apply gravity
    this.velY += CONSTANTS.GRAVITY;

    // ===== SPECIAL BEHAVIOR =====

    // Pares: Check if apex reached (velocity changed from negative to positive)
    if (this.type === 'pares' && Physics.isApexReached(this.prevVelY, this.velY)) {
      this._splitAtApex();
      return;
    }

   // --- RICE AURA ---
    if (this.type === 'rice' && this.splashRadius > 0) {
      const enemies = (this.game.waveManager && this.game.waveManager.enemies) || [];
      
      const burnDamageScaling = [2, 4, 8, 12, 16];
      const tickDamage = burnDamageScaling[this.level - 1] || 2;

      enemies.forEach(enemy => {
        if (!enemy.isAlive) return;

        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const dist = Physics.getDistance(this.x, this.y, enemyCenterX, enemyCenterY);

        if (dist <= this.splashRadius && !enemy.burnActive) {
         enemy.applyBurnStatus(CONSTANTS.SPECIALS.chili.burnDuration, tickDamage);
        }
      });
    }

    // ===== BOUNDS CHECK =====
    const canvas = this.game.canvas;
    if (this.x > canvas.width + 50 || this.x < -50 || this.y > canvas.height + 50) {
      this.isActive = false;
    }
  }

/**
   * Draw projectile on canvas using dynamic Sprite Sheet Math.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.isActive) return;

    // Fetch the single master sprite sheet
    const sheet = this.game.assetLoader?.images?.projectilesSheet;
    
    if (sheet && sheet.complete && sheet.width > 0) {
      // 1. DYNAMICALLY CALCULATE FRAME SIZE
      // Your image has 5 columns (levels) and 3 rows (Mami, Pares, Rice)
      const cols = 5;
      const rows = 3;
      
      const frameW = sheet.width / cols;
      const frameH = sheet.height / rows;

      // 2. MAP WEAPON TYPE TO THE CORRECT ROW
      const typeToRowMap = {
        'mami': 0,  // Top row
        'pares': 1, // Middle row
        'cola': 1,  // Fallback to pares if you don't have a cola sprite yet
        'rice': 2   // Bottom row
      };

      let row = typeToRowMap[this.type];
      if (row === undefined) row = 0; 

      // 3. MAP WEAPON LEVEL TO THE CORRECT COLUMN (Max level 5)
      const col = Math.min(Math.max(0, this.level - 1), 4);

      // Calculate Source X and Source Y for cutting the image
      const sx = col * frameW;
      const sy = row * frameH;

      // 4. PROPORTIONAL SCALING (The Anti-Distortion Fix!)
      // Set the target visual height based on the projectile level
      const targetHeight = (this.radius * 4) + (this.level * 10); 
      
      // Scale the width proportionally so the bowl stays the exact same shape
      const scale = targetHeight / frameH;
      const drawW = frameW * scale;
      const drawH = targetHeight;

      ctx.save();
      
      // Draw the perfectly proportioned slice!
      ctx.drawImage(
        sheet, 
        sx, sy, 
        frameW, frameH, 
        this.x - drawW / 2, this.y - drawH / 2, 
        drawW, drawH
      );

      ctx.restore();

    } else {
      // Fallback: Draw as colored circle if image isn't loaded yet
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + (this.level * 2), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw splash radius indicator for Rice projectiles
    if (this.type === 'rice' && this.splashRadius > 0) {
      const currentRadius = this.splashRadius + (this.level * 10);
      
      // 1. OUTER GLOW AURA (Heat effect)
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius);
      gradient.addColorStop(0, 'rgba(255, 100, 0, 0.3)');
      gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. DASHED BORDER (Range indicator)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // 3. STEAM PARTICLES (Floating up)
      if (this.game.gameFrame % 5 === 0) {
        // We can just draw small white circles that look like steam
        for (let i = 0; i < 3; i++) {
          const offsetX = (Math.random() - 0.5) * (currentRadius * 0.8);
          const offsetY = (Math.random() - 0.5) * (currentRadius * 0.8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(this.x + offsetX, this.y + offsetY - (this.game.gameFrame % 20), 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}