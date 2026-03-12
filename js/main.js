// main.js – Entry point for Jo's Pares Mami: Defend the Cart!
// Initializes the Game instance and starts the main game loop.

window.addEventListener('load', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  game.start();
});
