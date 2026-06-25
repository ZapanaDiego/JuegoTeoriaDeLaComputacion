/* ============================================================
   models/GameState.js
   Estado central del juego (única fuente de verdad). Agrupa
   jugadores, misil, zonas, fase actual y temporizador. No conoce
   ni el DOM ni la entrada; solo datos + transiciones de fase.
   ============================================================ */

import { Player } from './Player.js';
import { Missile } from './Missile.js';

/** Fases posibles del juego. */
export const Phase = Object.freeze({
  START:          'start',
  QUESTION_POPUP: 'question_popup',   // muestra la pregunta 10s
  COUNTDOWN:      'countdown',         // cuenta regresiva 3-2-1
  PLAYING:        'playing',
  GAMEOVER:       'gameover',
});

export class GameState {
  /**
   * @param {object} bounds  Límites del tablero {x, y, w, h} en px.
   */
  constructor(bounds) {
    this.bounds = bounds;
    this.phase = Phase.START;

    // Jugadores en lados opuestos del tablero
    this.player1 = new Player('p1', {
      x: bounds.x + 80,
      y: bounds.y + bounds.h / 2 - 17,
    });
    this.player2 = new Player('p2', {
      x: bounds.x + bounds.w - 114,
      y: bounds.y + bounds.h / 2 - 17,
    });

    // Misil centrado al inicio
    this.missile = new Missile({
      x: bounds.x + bounds.w / 2 - 9,
      y: bounds.y + bounds.h / 2 - 9,
    });

    // Zonas de respuesta (las rellena BoardView a partir del DOM real)
    this.zones = [];        // [{index, x, y, w, h, id}]

    // Temporizador de la ronda (segundos)
    this.roundTime = 10;
    this.timeLeft = this.roundTime;

    this.players = [this.player1, this.player2];
  }

  get isPlaying() { return this.phase === Phase.PLAYING; }

  /** Reinicia el estado para una nueva partida. */
  reset() {
    this.player1.lives = 3; this.player1.alive = true;
    this.player2.lives = 3; this.player2.alive = true;
    this.timeLeft = this.roundTime;
    this.phase = Phase.PLAYING;
  }
}
