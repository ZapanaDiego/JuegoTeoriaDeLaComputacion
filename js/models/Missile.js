/* ============================================================
   models/Missile.js
   Modelo del misil perseguidor. Guarda posición, velocidad y el
   objetivo actual. La lógica de persecución se aplica desde el
   GameController (ver comentario en game.js / GameController).
   ============================================================ */

export class Missile {
  constructor(opts = {}) {
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.w = opts.w ?? 18;
    this.h = opts.h ?? 18;
    this.speed = opts.speed ?? 120;     // px/segundo; puede escalar con el tiempo
    this.target = null;                  // referencia a un Player (objetivo)
    this.active = false;
  }

  get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  get center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }
}
