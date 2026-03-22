/**
 * SecretMenuManager.js
 * ULTIMATE AUDIO FIX:
 * 1. Prevents duplicate game loops.
 * 2. Physically blocks Main Menu BGM from ever playing again after a jump.
 * 3. Cleans up all existing audio before launching.
 */

(function() {
    console.log("%c [SecretMenu] Kitchen Override Active! ", "background: #e74c3c; color: #fff; font-weight: bold;");

    // 1. SINGLETON WRAPPER: Ensures only one game loop exists
    const OriginalGame = window.Game;
    if (OriginalGame && !window.isGameWrapped) {
        window.Game = function(...args) {
            if (window.gameInstance) return window.gameInstance;
            const instance = new OriginalGame(...args);
            window.gameInstance = instance;
            return instance;
        };
        window.Game.prototype = OriginalGame.prototype;
        Object.assign(window.Game, OriginalGame);
        window.isGameWrapped = true;
    }

    class SecretMenuManager {
        constructor() {
            this.game = null;
            this.selectedLevel = 1;
            this.selectedDiff = 'medium';
            this.isMenuOpen = false;
            this.init();
        }

        init() {
            this.injectStyles();
            this.injectUI();
            
            window.addEventListener('keydown', (e) => {
                if (e.shiftKey && e.code === 'KeyS') {
                    this.handleShortcut();
                }
            }, true);
        }

        handleShortcut() {
            if (!this.game) this.game = window.gameInstance;

            // Auto-initialize ONLY if engine not found
            if (!this.game) {
                const canvas = document.getElementById('gameCanvas');
                if (canvas) {
                    this.game = new Game(canvas);
                    if (this.game.assetLoader && this.game.assetLoader._loaded === 0) {
                        this.game.startWithLoadingScreen();
                    }
                }
            }

            this.toggleMenu();
        }

        injectStyles() {
            if (document.getElementById('secret-menu-styles')) return;
            const style = document.createElement('style');
            style.id = 'secret-menu-styles';
            style.innerHTML = `
                #screen-secret-menu {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 200000 !important;
                    background: rgba(0, 0, 0, 0.95) !important;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    pointer-events: auto !important;
                    font-family: 'AlteHaasGroteskBold', sans-serif;
                }
                .secret-grid-item {
                    background: rgba(255,255,255,0.05);
                    border: 2px solid #555;
                    padding: 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    text-align: center;
                    color: white;
                    transition: all 0.2s;
                }
                .secret-grid-item:hover { background: rgba(255,255,255,0.15); border-color: #f1c40f; }
                .secret-grid-item.selected {
                    background: #f1c40f !important;
                    color: #000 !important;
                    border: 4px solid #fff !important;
                    font-weight: 900;
                    transform: scale(1.05);
                }
                .secret-grid-item.boss { border-color: #e74c3c; }
                .secret-diff-btn { opacity: 0.5; border: 4px solid transparent !important; cursor: pointer; transition: 0.2s; }
                .secret-diff-btn:hover { opacity: 0.8; }
                .secret-diff-btn.active { opacity: 1; border: 6px solid #fff !important; transform: scale(1.1); }
            `;
            document.head.appendChild(style);
        }

        injectUI() {
            const container = document.getElementById('game-container') || document.body;
            const screen = document.createElement('div');
            screen.id = 'screen-secret-menu';
            screen.innerHTML = `
                <div class="comic-box" style="width: 850px; background: #1a1a2e; border: 8px solid #f1c40f; box-shadow: 20px 20px 0 #000;">
                    <h1 class="comic-title" style="color: #e74c3c; font-size: 55px; text-shadow: 4px 4px 0 #000;">STAGE JUMP</h1>
                    <div id="secret-level-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 20px; max-height: 400px; overflow-y: auto; padding: 20px; background: rgba(0,0,0,0.5); border-radius: 12px;"></div>
                    <div style="margin: 20px;">
                        <div id="secret-diff-container" style="display: flex; gap: 25px; justify-content: center;">
                            <button class="secret-diff-btn menu-btn green" data-diff="easy">EASY</button>
                            <button class="secret-diff-btn menu-btn yellow active" data-diff="medium">MEDIUM</button>
                            <button class="secret-diff-btn menu-btn red" data-diff="hard">HARD</button>
                        </div>
                    </div>
                    <div style="padding-bottom: 30px;">
                        <button id="btn-secret-launch" class="menu-btn green" style="width: 320px; height: 70px; font-size: 30px;">START MISSION</button>
                        <button id="btn-secret-close" class="menu-btn red" style="width: 120px; height: 70px; font-size: 30px;">X</button>
                    </div>
                </div>
            `;
            container.appendChild(screen);

            const diffBtns = screen.querySelectorAll('.secret-diff-btn');
            diffBtns.forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    diffBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.selectedDiff = btn.dataset.diff;
                };
            });

            document.getElementById('btn-secret-launch').onclick = (e) => {
                e.stopPropagation();
                this.launch();
            };
            document.getElementById('btn-secret-close').onclick = (e) => {
                e.stopPropagation();
                this.toggleMenu();
            };
        }

        refreshLevelGrid() {
            const grid = document.getElementById('secret-level-grid');
            const game = this.game || window.gameInstance;
            if (!grid || !game || !game.stageManager) return;

            grid.innerHTML = '';
            for (let i = 1; i <= 15; i++) {
                const item = document.createElement('div');
                const isBoss = i % 5 === 0;
                item.className = `secret-grid-item ${isBoss ? 'boss' : ''} ${i === this.selectedLevel ? 'selected' : ''}`;
                item.innerHTML = `<b>STAGE ${i}</b><br><small>${isBoss ? 'BOSS' : 'NORMAL'}</small>`;
                item.onclick = (e) => {
                    e.stopPropagation();
                    grid.querySelectorAll('.secret-grid-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    this.selectedLevel = i;
                };
                grid.appendChild(item);
            }
        }

        toggleMenu() {
            const screen = document.getElementById('screen-secret-menu');
            if (!screen) return;
            this.isMenuOpen = !this.isMenuOpen;
            screen.style.display = this.isMenuOpen ? 'flex' : 'none';
            if (this.isMenuOpen) this.refreshLevelGrid();
        }

        launch() {
            const game = this.game || window.gameInstance;
            if (!game) return;

            console.log(`[SecretMenu] Launching Mission ${this.selectedLevel}`);

            // === CRITICAL AUDIO RESET ===
            window.isSecretMenuJumped = true; 

            // === STATE SETUP ===
            game.currentDifficultyKey = this.selectedDiff;
            game.currentDifficulty = CONSTANTS.DIFFICULTY[this.selectedDiff];
            game.levelManager.currentLevel = this.selectedLevel;
            game.waveManager.currentWave = this.selectedLevel;
            
            // Stats & Ammo
            game.player.hp = game.player.maxHp;
            game.player.kita = (this.selectedLevel - 1) * 350; 
            game.player.resetAmmo();

            // Gear Unlocks
            const arsenal = game.player.arsenal;
            const specials = game.player.specials;
            if (this.selectedLevel >= 6) arsenal.pares.unlocked = true;
            if (this.selectedLevel >= 11) arsenal.rice.unlocked = true;
            if (this.selectedLevel >= 4) specials.calamansi.unlocked = true;
            if (this.selectedLevel >= 8) specials.chili.unlocked = true;
            game.player.selectWeapon('mami');

            // Cleanup World
            game.waveManager.clearAllEnemies();
            game.player.projectilePool.releaseAll();
            game.enemyProjectiles = [];
            
            // Hide UI
            const screens = ['screen-main-menu', 'screen-difficulty', 'loading-screen', 'screen-victory', 'screen-shop'];
            screens.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            this.isMenuOpen = false;
            const screen = document.getElementById('screen-secret-menu');
            if (screen) screen.style.display = 'none';

            game.currentState = CONSTANTS.STATES.PLAYING;
            game.isRunning = true;
            
            const enemies = game.stageManager.getWaveEnemies(this.selectedLevel);
            game.waveManager.startWave(enemies);
            
            // Final audio refresh
            game._updateAudio();
        }
    }

    window.secretMenu = new SecretMenuManager();
})();
