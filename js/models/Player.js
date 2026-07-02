/* ============================================================
   models/Player.js
   Modelo de jugador: posición, dimensiones, velocidad y vidas.
   NO toca el DOM (eso es responsabilidad de BoardView/HudView).
   ============================================================ */

export class Player {
  /**
   * @param {string} id        Identificador ('p1' | 'p2').
   * @param {object} opts       {x, y, w, h, speed, lives, name}
   */
  constructor(id, opts = {}) {
    this.id = id;
    this.name = opts.name || (id === 'p1' ? 'Jugador 1' : 'Jugador 2');
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.w = opts.w ?? 34;
    this.h = opts.h ?? 34;
    this.speed = opts.speed ?? 260;     // px/segundo (aumentado por mayor densidad de obstáculos)
    this.lives = opts.lives ?? 3;
    this.invulnerableUntil = 0;          // timestamp (ms) para i-frames tras recibir daño
    this.alive = true;
    this.hasResponded = false;
    this.score = 0;                      // sistema de puntos
    this.correctAnswers = 0;             // aciertos en esta partida
    this.incorrectAnswers = 0;           // errores en esta partida
    this.insideZoneIndex = -1;           // zona actual en la que está colisionando (-1 si ninguna)
  }

  /** Caja AABB para el módulo de colisiones. */
  get box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  /** Centro de la entidad (lo persigue el misil). */
  get center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  /**
   * ¿Está el jugador actualmente en i-frames?
   * @param {number} now  Marca temporal actual (performance.now() o Date.now()).
   * @returns {boolean}
   */
  isInvulnerable(now) {
    return now < this.invulnerableUntil;
  }

  /**
   * Activa el escudo de invulnerabilidad.
   * @param {number} now       Marca temporal actual.
   * @param {number} duration  Duración en ms (por defecto 1500 ms = 1.5 s).
   */
  makeInvulnerable(now, duration = 1500) {
    this.invulnerableUntil = now + duration;
  }

  /**
   * Resta una vida SI el jugador NO está en i-frames.
   * Tras recibir daño se activan automáticamente los i-frames.
   * @param {number} now  Marca temporal actual (performance.now()).
   * @returns {number|false} Vidas restantes, o false si estaba invulnerable.
   */
  loseLife(now) {
    if (this.isInvulnerable(now)) return false;   // i-frames activos → sin daño

    if (this.lives > 0) this.lives -= 1;
    if (this.lives === 0) this.alive = false;

    // Activar i-frames automáticamente tras el golpe
    this.makeInvulnerable(now);
    return this.lives;
  }

  /**
   * Reinicia estadísticas de partida (preserva el nombre del jugador).
   */
  resetStats() {
    this.lives = 3;
    this.alive = true;
    this.score = 0;
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.hasResponded = false;
    this.insideZoneIndex = -1;
    this.invulnerableUntil = 0;
  }
}
