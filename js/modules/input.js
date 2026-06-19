/* ============================================================
   modules/input.js
   Gestor de entrada por teclado. Mantiene un mapa de teclas
   presionadas (estado continuo) para movimiento fluido y expone
   callbacks para teclas de acción puntuales (Enter, etc.).

   Mapeo de jugadores:
     P1 → W A S D
     P2 → Flechas (ArrowUp/Down/Left/Right)
   ============================================================ */

export const KEYMAP = {
  p1: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' },
  p2: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
};

export class InputManager {
  constructor() {
    this._pressed = new Set();          // teclas mantenidas
    this._actionHandlers = new Map();   // code -> callback (one-shot por pulsación)
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  /** ¿Está la tecla mantenida ahora mismo? */
  isDown(code) { return this._pressed.has(code); }

  /**
   * Devuelve el vector de dirección {x,y} (cada componente -1, 0 o 1)
   * para un jugador, leyendo su mapa de teclas.
   */
  getAxis(playerKey) {
    const k = KEYMAP[playerKey];
    return {
      x: (this.isDown(k.right) ? 1 : 0) - (this.isDown(k.left) ? 1 : 0),
      y: (this.isDown(k.down) ? 1 : 0) - (this.isDown(k.up) ? 1 : 0),
    };
  }

  /** Registra una acción puntual (se dispara una vez por pulsación). */
  onAction(code, callback) { this._actionHandlers.set(code, callback); }

  _onKeyDown(e) {
    if (!this._pressed.has(e.code)) {
      const handler = this._actionHandlers.get(e.code);
      if (handler) handler(e);
    }
    this._pressed.add(e.code);
  }

  _onKeyUp(e) {
    this._pressed.delete(e.code);
  }
}
