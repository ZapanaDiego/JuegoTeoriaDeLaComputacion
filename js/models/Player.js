/* ============================================================
   models/Player.js
   Modelo de jugador: posición, dimensiones, velocidad y vidas.
   NO toca el DOM (eso es responsabilidad de BoardView/HudView).
   ============================================================ */

export class Player {
  /**
   * @param {string} id        Identificador ('p1' | 'p2').
   * @param {object} opts       {x, y, w, h, speed, lives}
   */
  constructor(id, opts = {}) {
    this.id = id;
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.w = opts.w ?? 34;
    this.h = opts.h ?? 34;
    this.speed = opts.speed ?? 220;     // px/segundo
    this.lives = opts.lives ?? 3;
    this.invulnerableUntil = 0;          // timestamp para i-frames tras recibir daño
    this.alive = true;
  }

  /** Caja AABB para el módulo de colisiones. */
  get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  /** Centro de la entidad (lo persigue el misil). */
  get center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  loseLife() {
    if (this.lives > 0) this.lives -= 1;
    if (this.lives === 0) this.alive = false;
    return this.lives;
  }
}
