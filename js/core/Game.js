// Game.js – Core game engine.
// Manages the main game loop, state transitions, and ties all managers together.

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.assetLoader = new AssetLoader();
    this.inputHandler = new InputHandler(canvas);
    this.saveManager = new SaveManager();

    this.player = new Player(this);
    this.levelManager = new LevelManager(this);
    this.waveManager = new WaveManager(this);
    this.shopManager = new ShopManager(this);
    this.uiManager = new UIManager(this);

    this.isRunning = false;
    this.lastTimestamp = 0;
  }

  start() {
    this.assetLoader.loadAll(() => {
      this.saveManager.load();
      this.levelManager.init();
      this.isRunning = true;
      requestAnimationFrame((ts) => this.loop(ts));
    });
  }

  loop(timestamp) {
    if (!this.isRunning) return;
    // Cap delta to 100ms to avoid large jumps on first frame or after tab focus
    const delta = this.lastTimestamp === 0 ? 16 : Math.min(timestamp - this.lastTimestamp, 100);
    this.lastTimestamp = timestamp;

    this.update(delta);
    this.draw();

    requestAnimationFrame((ts) => this.loop(ts));
  }

  update(delta) {
    this.player.update(delta);
    this.waveManager.update(delta);
    this.levelManager.update(delta);
    this.shopManager.update(delta);
    this.uiManager.update(delta);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.levelManager.draw(this.ctx);
    this.player.draw(this.ctx);
    this.waveManager.draw(this.ctx);
    this.uiManager.draw(this.ctx);
  }
}
