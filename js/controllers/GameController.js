/* ============================================================
   controllers/GameController.js
   CEREBRO DEL JUEGO. Conecta entrada → estado → vistas dentro del
   bucle (update/render). Aquí se implementa la jugabilidad:
   movimiento de jugadores, persecución del misil y colisiones AABB.
   ============================================================ */

import { Phase } from '../models/GameState.js';
import { clampToBounds, aabbIntersects, isInsideZone } from '../modules/collision.js';

export class GameController {
  constructor({ state, inputCtrl, questionCtrl, boardView, hudView, questionView }) {
    this.state = state;
    this.input = inputCtrl;
    this.questions = questionCtrl;
    this.board = boardView;
    this.hud = hudView;
    this.qView = questionView;
  }

  /** Arranque inicial: pintar HUD y dejar listo el overlay de inicio. */
  init() {
    this.hud.renderLives(this.state.player1);
    this.hud.renderLives(this.state.player2);
    this.hud.renderTimer(this.state.timeLeft);
    this.hud.showStart(true);
  }

  /** Comienza / reinicia la partida (lo dispara ENTER). */
  startGame() {
    if (this.state.phase === Phase.PLAYING) return;
    this.state.reset();
    this.state.zones = this.board.readZones();   // geometría real de las 4 esquinas
    this.hud.showStart(false);
    this.hud.showGameover(false);
    this.questions.nextQuestion();
    this.state.timeLeft = this.state.roundTime;
    this.hud.renderLives(this.state.player1);
    this.hud.renderLives(this.state.player2);
  }

  /* ========================================================
     UPDATE — avanza la lógica del juego (dt en segundos).
     ======================================================== */
  update(dt) {
    if (!this.state.isPlaying) return;

    this._updatePlayers(dt);   // 1) movimiento WASD / flechas
    this._updateMissile(dt);   // 2) persecución del misil
    this._checkCollisions();   // 3) colisiones AABB
    this._updateTimer(dt);     // 4) temporizador de ronda
  }

  // --------------------------------------------------------
  // 1) MOVIMIENTO DE JUGADORES
  //    P1 → WASD   |   P2 → Flechas
  // --------------------------------------------------------
  _updatePlayers(dt) {
    const bounds = this.state.bounds;

    // === [LÓGICA DE MOVIMIENTO P1 — WASD] ===============
    // TODO: leer this.input.axisP1() => {x,y}, aplicar velocidad*dt
    //       a state.player1.x/y y limitar con clampToBounds().
    const a1 = this.input.axisP1();
    this.state.player1.x += a1.x * this.state.player1.speed * dt;
    this.state.player1.y += a1.y * this.state.player1.speed * dt;
    Object.assign(this.state.player1, clampToBounds(this.state.player1.box, bounds));

    // === [LÓGICA DE MOVIMIENTO P2 — FLECHAS] ============
    // TODO: idéntico a P1 pero con this.input.axisP2().
    const a2 = this.input.axisP2();
    this.state.player2.x += a2.x * this.state.player2.speed * dt;
    this.state.player2.y += a2.y * this.state.player2.speed * dt;
    Object.assign(this.state.player2, clampToBounds(this.state.player2.box, bounds));
  }

  // --------------------------------------------------------
  // 2) PERSECUCIÓN DEL MISIL
  //    El misil avanza hacia el centro del jugador objetivo.
  // --------------------------------------------------------
  _updateMissile(dt) {
    const m = this.state.missile;
    if (!m.active) return;

    // === [LÓGICA DE PERSECUCIÓN DEL MISIL] ==============
    // TODO: elegir objetivo (p.ej. el jugador más cercano o uno fijo),
    //       calcular vector director normalizado hacia target.center
    //       y avanzar m.x/m.y a m.speed*dt. Opcional: acelerar con el tiempo.
    const target = m.target ?? this.state.player1;
    const dx = target.center.x - m.center.x;
    const dy = target.center.y - m.center.y;
    const dist = Math.hypot(dx, dy) || 1;
    m.x += (dx / dist) * m.speed * dt;
    m.y += (dy / dist) * m.speed * dt;
  }

  // --------------------------------------------------------
  // 3) COLISIONES AABB
  //    a) misil vs jugador  → daño
  //    b) jugador vs zona   → respuesta seleccionada
  // --------------------------------------------------------
  _checkCollisions() {
    const m = this.state.missile;

    // === [COLISIÓN AABB: MISIL vs JUGADOR] ==============
    // TODO: para cada jugador vivo, si aabbIntersects(player.box, m.box)
    //       y no está invulnerable → loseLife(), feedback visual,
    //       resetear misil / activar i-frames.
    for (const player of this.state.players) {
      if (!player.alive) continue;
      if (m.active && aabbIntersects(player.box, m.box)) {
        // this._damage(player);
      }
    }

    // === [COLISIÓN AABB: JUGADOR vs ZONA DE RESPUESTA] ==
    // TODO: si un jugador entra en una zona (isInsideZone), resolver
    //       la pregunta con this.questions.resolve(zone.index) y aplicar
    //       consecuencias (acierto/fallo) + cargar siguiente pregunta.
    for (const player of this.state.players) {
      for (const zone of this.state.zones) {
        if (isInsideZone(player.box, zone)) {
          // const ok = this.questions.resolve(zone.index); ...
        }
      }
    }
  }

  // --------------------------------------------------------
  // 4) TEMPORIZADOR DE RONDA
  // --------------------------------------------------------
  _updateTimer(dt) {
    this.state.timeLeft -= dt;
    if (this.state.timeLeft <= 0) {
      // TODO: tiempo agotado → penalización / nueva pregunta / activar misil.
      this.state.timeLeft = this.state.roundTime;
    }
  }

  /* ========================================================
     RENDER — vuelca el estado al DOM (sin lógica de juego).
     ======================================================== */
  render() {
    this.board.render(this.state);
    this.hud.renderTimer(this.state.timeLeft);
  }
}
