// Enemy.js – Base class for all enemy types in Jo's Pares Mami.
// Each enemy type has unique HP, speed, damage, and Kita reward values.

const ENEMY_TYPES = {
  gangster:   { hp: 40,  speed: 1.2, damage: 10, kitaReward: 5,  spriteKey: 'enemy_gangster' },
  cockroach:  { hp: 15,  speed: 2.5, damage: 5,  kitaReward: 2,  spriteKey: 'enemy_cockroach' },
  rat:        { hp: 20,  speed: 2.0, damage: 5,  kitaReward: 2,  spriteKey: 'enemy_rat' },
  dog:        { hp: 35,  speed: 1.8, damage: 15, kitaReward: 8,  spriteKey: 'enemy_dog' },
  student:    { hp: 30,  speed: 1.5, damage: 8,  kitaReward: 5,  spriteKey: 'enemy_gangster' },
  worker:     { hp: 50,  speed: 1.0, damage: 12, kitaReward: 10, spriteKey: 'enemy_gangster' },
  elite:      { hp: 80,  speed: 0.8, damage: 20, kitaReward: 20, spriteKey: 'enemy_gangster' },
  boss_kap:   { hp: 300, speed: 0.5, damage: 30, kitaReward: 100, spriteKey: 'boss_inspector' },
  boss_diwata:{ hp: 400, speed: 0.6, damage: 25, kitaReward: 150, spriteKey: 'boss_vlogger' },
  boss_final: { hp: 600, speed: 0.4, damage: 40, kitaReward: 300, spriteKey: 'boss_inspector' },
};

class Enemy {
  constructor(game, type) {
    this.game = game;
    this.type = type;

    const config = ENEMY_TYPES[type] || ENEMY_TYPES.gangster;
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.speed = config.speed;
    this.damage = config.damage;
    this.kitaReward = config.kitaReward;
    this.spriteKey = config.spriteKey;

    this.width = 48;
    this.height = 72;

    // Spawn at the right edge, random vertical position in the play field
    this.x = game.canvas.width + 10;
    this.y = game.canvas.height - 200 - Math.random() * 60;

    this.isAlive = true;
  }

  update(delta) {
    if (!this.isAlive) return;

    // Move left toward Jo's cart
    this.x -= this.speed * (delta / 16);

    // Reached the cart – deal damage and remove self
    if (this.x <= this.game.player.x + 60) {
      this.game.player.takeDamage(this.damage);
      this.isAlive = false;
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;

    const sprite = this.game.assetLoader.images[this.spriteKey];
    if (sprite && sprite.complete) {
      ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // HP bar above enemy
    const barWidth = this.width;
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = '#555';
    ctx.fillRect(this.x, this.y - 8, barWidth, 5);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(this.x, this.y - 8, barWidth * hpRatio, 5);
  }
}
