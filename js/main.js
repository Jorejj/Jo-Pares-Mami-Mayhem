// main.js – Entry point for Jo's Pares Mami: Defend the Cart!
// Initializes the Game instance and starts the main game loop.

window.addEventListener('load', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  
  // Get loading screen elements
  const loadingScreen = document.getElementById('loading-screen');
  const loadingBar = document.getElementById('loading-bar');
  const loadingStatus = document.getElementById('loading-status');
  const loadingPercent = document.getElementById('loading-percent');
  
  // Loading status messages for flavor
  const loadingMessages = [
    'Preparing ingredients...',
    'Heating the broth...',
    'Slicing the beef...',
    'Cooking the noodles...',
    'Adding secret spices...',
    'Taste testing...',
    'Almost ready to serve!'
  ];

  /**
   * Update loading screen with progress
   */
  function updateLoadingProgress(loaded, total) {
    const percent = Math.round((loaded / total) * 100);
    
    if (loadingBar) {
      loadingBar.style.width = percent + '%';
    }
    
    if (loadingPercent) {
      loadingPercent.textContent = percent + '%';
    }
    
    if (loadingStatus) {
      // Show different messages based on progress
      const messageIndex = Math.min(
        Math.floor((percent / 100) * loadingMessages.length),
        loadingMessages.length - 1
      );
      loadingStatus.textContent = loadingMessages[messageIndex];
    }
  }

  /**
   * Hide loading screen with fade animation
   */
  function hideLoadingScreen() {
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
      }, 500);
    }
  }

  // Start the game with loading screen integration
  game.startWithLoadingScreen(updateLoadingProgress, hideLoadingScreen);
});
