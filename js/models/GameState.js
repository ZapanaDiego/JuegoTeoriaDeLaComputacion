/* ============================================================
   models/GameState.js
   ============================================================ */

import { Player } from './Player.js';
import { Missile } from './Missile.js';
import { isInsideZone } from '../modules/collision.js'; 

export const Phase = Object.freeze({
  START:          'start',
  QUESTION_POPUP: 'question_popup',   
  COUNTDOWN:      'countdown',         
  PLAYING:        'playing',
  GAMEOVER:       'gameover',
});

export class GameState {
  constructor(bounds) {
    this.bounds = bounds;
    this.phase = Phase.START;

    this.player1 = new Player('p1', {
      x: bounds.x + 80,
      y: bounds.y + bounds.h / 2 - 17,
    });
    this.player2 = new Player('p2', {
      x: bounds.x + bounds.w - 114,
      y: bounds.y + bounds.h / 2 - 17,
    });

    this.missile = new Missile({
      x: bounds.x + bounds.w / 2 - 9,
      y: bounds.y + bounds.h / 2 - 9,
    });

    this.zones = [];        
    this.roundTime = 10;
    this.timeLeft = this.roundTime;
    this.players = [this.player1, this.player2];
    this.isEvaluatingAnswer = false; 
  }

  get isPlaying() { return this.phase === Phase.PLAYING; }

  reset() {
    this.player1.lives = 3; this.player1.alive = true;
    this.player2.lives = 3; this.player2.alive = true;
    this.timeLeft = this.roundTime;
    this.isEvaluatingAnswer = false; 
    this.phase = Phase.PLAYING;
  }

  nextQuestion() {
    this.timeLeft = this.roundTime;
    this.isEvaluatingAnswer = false; 
    this.phase = Phase.PLAYING;
  }

  /**
   * @param {number} dt Tiempo transcurrido desde el último frame en segundos (ej. 0.016 para 60fps)
   */
  update(dt = 0.016) {
    if (!this.isPlaying) return;

    // 1. MANEJO DEL TEMPORIZADOR
    if (!this.isEvaluatingAnswer) {
      this.timeLeft -= dt;

      // ¿Se acabó el tiempo?
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.aplicarPenalizacionPorTiempo();
        return; // Salimos para evitar procesar colisiones en este frame
      }
    }

    // 2. PROCESAR COLISIONES FÍSICAS (Tu lógica anterior)
    if (this.isEvaluatingAnswer) return;

    this.players.forEach((player) => {
      if (!player.alive) return; 

      this.zones.forEach((zone) => {
        if (isInsideZone(player, zone)) {
          this.isEvaluatingAnswer = true; 

          this.lastResponse = {
            playerId: player.id,
            zoneId: zone.id,
            isCorrect: zone.isCorrect
          };

          if (zone.isCorrect) {
            this.consecuenciaAcierto(player, zone);
          } else {
            this.consecuenciaFallo(player, zone);
          }
        }
      });
    });
  }

  /**
   * PENALIZACIÓN POR TIEMPO AGOSTADO
   * Aplica daño a todos los jugadores vivos que no respondieron a tiempo.
   */
  aplicarPenalizacionPorTiempo() {
    console.log("[TIEMPO AGOTADO] Ningún jugador respondió a tiempo. Aplicando penalización.");
    
    // Bloqueamos la evaluación para que el controlador tome el mando
    this.isEvaluatingAnswer = true;

    // Daño a TODOS los jugadores que sigan vivos
    this.players.forEach((player) => {
      if (player.alive) {
        player.lives -= 1;
        console.log(`Jugador ${player.id} pierde 1 vida por lento. Vidas restantes: ${player.lives}`);
        
        if (player.lives <= 0) {
          player.alive = false;
          player.lives = 0;
        }
      }
    });

    // Guardamos un registro de que la ronda terminó por tiempo
    this.lastResponse = {
      timeout: true
    };

    // Cambiamos a la fase de popup/espera para que el controlador limpie y mande la siguiente pregunta
    this.phase = Phase.QUESTION_POPUP;
  }

  consecuenciaAcierto(player, zone) {
    console.log(`[ACIERTO] Jugador ${player.id} respondió correctamente.`);
    if (player.lives < 3) player.lives += 1;
    this.phase = Phase.QUESTION_POPUP; 
  }

  consecuenciaFallo(player, zone) {
    console.log(`[FALLO] Jugador ${player.id} eligió la zona incorrecta.`);
    player.lives -= 1;
    if (player.lives <= 0) {
      player.alive = false;
      player.lives = 0;
    }
    zone.flashRed = true; 
    this.phase = Phase.QUESTION_POPUP;
  }
}