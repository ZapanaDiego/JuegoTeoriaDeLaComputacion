/* ============================================================
   modules/gameloop.js
   Bucle de juego reutilizable basado en requestAnimationFrame.
   Separa actualización lógica (update) de dibujado (render) y
   entrega delta-time en segundos para un movimiento independiente
   de los FPS.
   ============================================================ */

export class GameLoop {
  /**
   * @param {(dt:number, t:number)=>void} update  Lógica del juego.
   * @param {(dt:number, t:number)=>void} render  Sincronización con el DOM.
   */
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this._rafId = null;
    this._last = 0;
    this._running = false;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  _tick(now) {
    if (!this._running) return;

    // delta-time en segundos (acotado para evitar saltos al volver de otra pestaña)
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;

    this.update(dt, now);   // 1) avanzar estado del juego
    this.render(dt, now);   // 2) reflejarlo en el DOM

    this._rafId = requestAnimationFrame(this._tick);
  }
}
