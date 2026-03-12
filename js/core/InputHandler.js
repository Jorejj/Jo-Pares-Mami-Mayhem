// InputHandler.js – Captures and exposes keyboard and mouse/touch input.
// Used by Player.js and ShopManager.js to respond to player actions.

class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false };

    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    canvas.addEventListener('mousedown', (e) => {
      this.mouse.isDown = true;
      this._updateMousePos(e);
    });
    canvas.addEventListener('mousemove', (e) => { this._updateMousePos(e); });
    canvas.addEventListener('mouseup', () => { this.mouse.isDown = false; });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      this.mouse.isDown = true;
      this._updateTouchPos(e);
    });
    canvas.addEventListener('touchmove', (e) => { this._updateTouchPos(e); });
    canvas.addEventListener('touchend', () => { this.mouse.isDown = false; });
  }

  _updateMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  _updateTouchPos(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    this.mouse.x = touch.clientX - rect.left;
    this.mouse.y = touch.clientY - rect.top;
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }
}
