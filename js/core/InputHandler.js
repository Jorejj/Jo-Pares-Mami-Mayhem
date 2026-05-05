// InputHandler.js – Captures and exposes keyboard and mouse/touch input.
// Handles catapult drag-to-aim and keyboard controls for FSM state transitions.

class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.lastDragVector = { vx: 0, vy: 0 }; // Preserve vector on release

    // ===== MOUSE/TOUCH EVENTS =====
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.mouse.isDown = true;
      this._updateMousePos(e);
      this.dragStart = { x: this.mouse.x, y: this.mouse.y };
      this.dragCurrent = { x: this.mouse.x, y: this.mouse.y };
      this.lastDragVector = { vx: 0, vy: 0 }; // Reset on new drag
    });

    window.addEventListener('mousemove', (e) => {
      this._updateMousePos(e);
      if (this.isDragging) {
        this.dragCurrent = { x: this.mouse.x, y: this.mouse.y };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.mouse.isDown = false;
    });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      this.mouse.isDown = true;
      this._updateTouchPos(e);
      this.dragStart = { x: this.mouse.x, y: this.mouse.y };
      this.dragCurrent = { x: this.mouse.x, y: this.mouse.y };
      this.lastDragVector = { vx: 0, vy: 0 }; // Reset on new drag
    });

    window.addEventListener('touchmove', (e) => {
      this._updateTouchPos(e);
      if (this.isDragging) {
        this.dragCurrent = { x: this.mouse.x, y: this.mouse.y };
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
      this.mouse.isDown = false;
    });

    // ===== KEYBOARD EVENTS =====
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[e.key.toLowerCase()] = false;
    });
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
    
    // --- NEW: Calculate scale so dragging works perfectly on small phone screens ---
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    this.mouse.x = (touch.clientX - rect.left) * scaleX;
    this.mouse.y = (touch.clientY - rect.top) * scaleY;
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  /**
   * Get drag vector (from drag start to current position).
   * Returns last known vector on release so _fire() can use it.
   * @returns {{ vx: number, vy: number }}
   */
  getDragVector() {
    const vector = {
      vx: (this.dragStart.x - this.dragCurrent.x) * CONSTANTS.PROJECTILE_SPEED_MULTIPLIER,
      vy: (this.dragStart.y - this.dragCurrent.y) * CONSTANTS.PROJECTILE_SPEED_MULTIPLIER,
    };
    // Save last vector before release
    if (this.isDragging) {
      this.lastDragVector = vector;
    }
    // Return saved vector (even after release, until next drag starts)
    return this.lastDragVector;
  }

  /**
   * Get trajectory preview points for drawing prediction line.
   * @param {number} startX - Spawn X
   * @param {number} startY - Spawn Y
   * @param {number} vx - Velocity X
   * @param {number} vy - Velocity Y
   * @param {number} frames - Number of frames to simulate
   * @returns {Array<{x, y}>}
   */
  getTrajectoryPoints(startX, startY, vx, vy, frames = CONSTANTS.TRAJECTORY_FRAMES) {
    return Physics.getTrajectoryPoints(startX, startY, vx, vy, frames);
  }
}
