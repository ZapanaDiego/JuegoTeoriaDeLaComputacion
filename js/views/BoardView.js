/* ============================================================
   views/BoardView.js
   Refleja el estado de las entidades (jugadores, misil) en el DOM.
   Lee la geometría real de las 4 zonas de respuesta y aplica
   estados visuales (clases CSS). Mueve entidades con left/top
   sobre elementos position:absolute.
   ============================================================ */

export class BoardView {
  constructor() {
    this.board = document.getElementById('board');
    this.el = {
      p1: document.getElementById('player1'),
      p2: document.getElementById('player2'),
      //missile: document.getElementById('missile'),
      floating: document.getElementById('floating-layer'),
    };
    this.zoneEls = [
      document.getElementById('zone-top-left'),
      document.getElementById('zone-top-right'),
      document.getElementById('zone-bottom-left'),
      document.getElementById('zone-bottom-right'),
    ];
  }

  /** Límites del tablero en coordenadas locales (0,0 en su esquina). */
  getBounds() {
    return { x: 0, y: 0, w: this.board.clientWidth, h: this.board.clientHeight };
  }

  /** Lee posición/tamaño reales de cada zona, relativos al tablero. */
  readZones() {
    const base = this.board.getBoundingClientRect();
    return this.zoneEls.map((el, index) => {
      const r = el.getBoundingClientRect();
      return {
        index,
        id: el.id,
        x: r.left - base.left,
        y: r.top - base.top,
        w: r.width,
        h: r.height,
      };
    });
  }

  /**
   * Inicializa y renderiza los obstáculos en el DOM.
   * Limpia obstáculos anteriores si existen.
   */
  initObstacles(obstacles) {
    // 1. Limpiar obstáculos anteriores
    const oldObstacles = this.board.querySelectorAll('.obstacle');
    oldObstacles.forEach(obs => obs.remove());

    if (!obstacles) return;

    // 2. Iterar sobre el array y crear elementos div
    obstacles.forEach(obs => {
      const el = document.createElement('div');
      el.className = `obstacle obstacle--${obs.type}`;
      
      // 3. Posicionarlos absolutamente (Redondeo para evitar glitches de renderizado sub-pixel)
      el.style.left = `${Math.floor(obs.x)}px`;
      el.style.top = `${Math.floor(obs.y)}px`;
      el.style.width = `${Math.floor(obs.w)}px`;
      el.style.height = `${Math.floor(obs.h)}px`;
      
      // Inyectar en el tablero principal
      this.board.appendChild(el);
    });
  }

  /** Posiciona una entidad (absolute) según su modelo {x,y}. */
  _place(el, entity) {
    el.style.left = `${entity.x}px`;
    el.style.top = `${entity.y}px`;
  }

  /** Limpia visualmente los estados correct/wrong de las zonas de respuesta. */
  resetZones() {
    this.zoneEls.forEach(el => el.classList.remove('is-correct', 'is-wrong'));
  }

  /** Render principal por frame. */
  render(state) {
    const now = performance.now();

    this._place(this.el.p1, state.player1);
    this._place(this.el.p2, state.player2);
    //this._place(this.el.missile, state.missile);

    // Estados: muerte
    this.el.p1.classList.toggle('is-dead', !state.player1.alive);
    this.el.p2.classList.toggle('is-dead', !state.player2.alive);
    //this.el.missile.classList.toggle('is-armed', state.missile.active);

    // Estados: escudo / invulnerabilidad (parpadeo i-frames)
    this.el.p1.classList.toggle('is-shield', state.player1.alive && state.player1.isInvulnerable(now));
    this.el.p2.classList.toggle('is-shield', state.player2.alive && state.player2.isInvulnerable(now));
  }

  /** Marca brevemente una zona como correcta / incorrecta. */
  flashZone(index, correct) {
    const el = this.zoneEls[index];
    if (!el) return;
    el.classList.add(correct ? 'is-correct' : 'is-wrong');
    setTimeout(() => el.classList.remove('is-correct', 'is-wrong'), 700);
  }

  /** Efecto splatterpunk: salpicadura en (x,y) del tablero. */
  splatter(x, y) {
    const s = document.createElement('div');
    s.className = 'splatter';
    s.style.left = `${x - 30}px`;
    s.style.top = `${y - 30}px`;
    this.el.floating.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }

  /**
   * Animación de daño + transición a escudo de invulnerabilidad.
   * Reproduce hit-flash y luego el parpadeo is-shield se activa
   * automáticamente en render() gracias al timestamp invulnerableUntil.
   */
  flashHurtWithShield(playerId) {
    const el = playerId === 'p1' ? this.el.p1 : this.el.p2;
    el.classList.remove('is-shield');            // forzar re-trigger
    el.classList.add('is-hurt');
    setTimeout(() => el.classList.remove('is-hurt'), 300);
  }

  /** Animación de daño en un jugador (compat legacy). */
  flashHurt(playerId) {
    const el = playerId === 'p1' ? this.el.p1 : this.el.p2;
    el.classList.add('is-hurt');
    setTimeout(() => el.classList.remove('is-hurt'), 300);
  }
}
