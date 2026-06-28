/* ============================================================
   controllers/GameController.js
   CEREBRO DEL JUEGO. Conecta entrada → estado → vistas dentro del
   bucle (update/render). Aquí se implementa la jugabilidad:
   movimiento de jugadores, persecución del misil y colisiones AABB.
   ============================================================ */

import { Phase } from '../models/GameState.js';
import { clampToBounds, aabbIntersects, isInsideZone } from '../modules/collision.js';

export class GameController {
  constructor({ state, inputCtrl, questionCtrl, boardView, hudView, questionView, audioCtrl}) {
    this.state = state;
    this.input = inputCtrl;
    this.questions = questionCtrl;
    this.board = boardView;
    this.hud = hudView;
    this.qView = questionView;
    this.audioCtrl = audioCtrl;

    // Temporizadores internos para el popup y la cuenta regresiva
    this._popupTimer = 0;
    this._popupDuration = 10;   // segundos
    this._countdownTimer = 0;
    this._countdownCurrent = 3;

    // === MECANISMO DE BLOQUEO (COOLDOWN/LOCK) ===
    this._isEvaluating = false; 
  }

  /** Arranque inicial: pintar HUD y dejar listo el overlay de inicio. */
  init() {
    this.hud.renderLives(this.state.player1);
    this.hud.renderLives(this.state.player2);
    this.hud.renderTimer(this.state.timeLeft);
    this.hud.showStart(true);
  }

  /** FUNCIÓN AUXILIAR: Devuelve a los jugadores de forma segura a sus esquinas de origen */
  _resetPlayerPositions() {
    if (this.state.player1) {
      this.state.player1.x = 80;   // Coordenada inicial izquierda
      this.state.player1.y = 350;  // Centrado verticalmente
    }
    if (this.state.player2) {
      this.state.player2.x = 1100; // Coordenada inicial derecha
      this.state.player2.y = 350;  // Centrado verticalmente
    }
    if (this.state.missile) {
      this.state.missile.x = 600;
      this.state.missile.y = 350;
    }
  }

  /** Comienza / reinicia la partida (lo dispara ENTER). */
  startGame() {
    if (this.state.phase === Phase.PLAYING
        || this.state.phase === Phase.QUESTION_POPUP
        || this.state.phase === Phase.COUNTDOWN) return;

    this.state.reset();
    this.state.phase = Phase.QUESTION_POPUP;   // aún no es PLAYING
    
    // 1. Teletransportar jugadores al spawn inicial de la partida
    this._resetPlayerPositions();
    if (this.state.player1) { this.state.player1.alive = true; this.state.player1.lives = 3; }
    if (this.state.player2) { this.state.player2.alive = true; this.state.player2.lives = 3; }
    if (this.state.missile) { this.state.missile.active = true; }

    // 2. Limpieza total de estilos visuales anteriores
    const zonesElements = document.querySelectorAll('.answer-zone');
    zonesElements.forEach(zoneElement => {
      zoneElement.classList.remove('is-correct', 'is-wrong');
    });

    this.state.players.forEach(p => {
      p.hasAnswered = false;
      const playerElement = document.querySelector(`.player--${p.id}`);
      if (playerElement) {
        playerElement.classList.remove('is-dead', 'is-hurt');
      }
    });

    // 3. Cargar primera pregunta
    const q = this.questions.nextQuestion();
    this.hud.showQuestionPopup(q);

    // 4. Mapear zonas físicas del tablero
    this.state.zones = this.board.readZones();

    this._popupTimer = this._popupDuration;

    // Actualizar HUD por completo
    this.hud.showStart(false);
    this.hud.showGameover(false);
    this.hud.renderLives(this.state.player1);
    this.hud.renderLives(this.state.player2);

    this.audioCtrl.playPrimary();
  }

  /* ========================================================
     UPDATE — avanza la lógica del juego (dt en segundos).
     ======================================================== */
  update(dt) {
    if (this.state.phase === Phase.QUESTION_POPUP) {
      this._updatePopup(dt);
      return;
    }

    if (this.state.phase === Phase.COUNTDOWN) {
      this._updateCountdown(dt);
      return;
    }

    if (this.state.phase === Phase.GAMEOVER) return;

    // Ejecutamos el reloj de la ronda activa.
    this._updateTimer(dt);

    // Si el temporizador activó el GAMEOVER tras el descuento, cortamos el frame inmediatamente
    if (this.state.phase === Phase.GAMEOVER) return;


    // Movimiento físico y colisiones (solo si la ronda sigue su curso)
    this._updatePlayers(dt);   
    this._updateMissile(dt);   
    this._checkCollisions();   
  }

  // --------------------------------------------------------
  // 4) TEMPORIZADOR DE RONDA (SINCRONIZADO PARA MULTIJUGADOR)
  // --------------------------------------------------------
  _updateTimer(dt) {
    this.state.timeLeft -= dt;
    
    if (this.state.timeLeft <= 0) {
      this.state.timeLeft = 0;
      
      // Averiguamos si todos los jugadores activos ya dejaron su respuesta
      const activos = this.state.players.filter(p => p.alive);
      const todosRespondieron = activos.length > 0 && activos.every(p => p.hasAnswered);

      // === CASO A: El tiempo llegó a 0 y los que están vivos ya respondieron ===
      if (todosRespondieron) {
        this.state.timeLeft = this.state.roundTime; 
        this._cargarSiguientePregunta();
        return;
      }

      // === CASO B: Tiempo Agotado (Castigo a los que NO respondieron) ===
      console.log("[TIEMPO AGOTADO] Penalizando solo a los que no pisaron casilla.");

      this.state.players.forEach((player) => {
        if (player.alive && !player.hasAnswered) {
          player.lives -= 1;
          
          const playerElement = document.querySelector(`.player--${player.id}`);
          if (playerElement) {
            playerElement.classList.add('is-hurt');
            setTimeout(() => playerElement.classList.remove('is-hurt'), 280);
          }

          if (player.lives <= 0) {
            player.alive = false;
            player.lives = 0;
            if (playerElement) playerElement.classList.add('is-dead');
          }
          this.hud.renderLives(player);
        }
      });

      // CONTROL DE FIN DE JUEGO: Si todos murieron por tiempo agotado
      if (!this.state.player1.alive && !this.state.player2.alive) {
        this.state.phase = Phase.GAMEOVER;
        this.hud.showGameover(true);
        return; 
      }

      this.state.timeLeft = this.state.roundTime;
      this._cargarSiguientePregunta();
    }
  }
  
  // --------------------------------------------------------
  // CARGAR SIGUIENTE PREGUNTA (CORREGIDO CON REPOSICIONAMIENTO)
  // --------------------------------------------------------
  _cargarSiguientePregunta() {
    if (this.state.phase === Phase.GAMEOVER) return;

    // === SOLUCIÓN AL DAÑO FANTASMA ===
    // Devolvemos a los jugadores inmediatamente a sus zonas iniciales de spawn neutrales
    // ANTES de que comience el escaneo de la nueva pregunta, alejándolos de los paneles.
    this._resetPlayerPositions();

    // 1. Apagamos la bandera de respuesta de ambos jugadores
    this.state.players.forEach(p => p.hasAnswered = false);

    // 2. Limpiamos las clases CSS del DOM anteriores (.is-correct y .is-wrong)
    const zonesElements = document.querySelectorAll('.answer-zone');
    zonesElements.forEach(zoneElement => {
      zoneElement.classList.remove('is-correct', 'is-wrong');
    });

    // 3. Solicitamos la nueva pregunta
    const proximaPregunta = this.questions.nextQuestion();
    
    // 4. Pintamos el popup y actualizamos los textos en el DOM
    this.hud.showQuestionPopup(proximaPregunta);

    // 5. Escaneamos las nuevas respuestas físicas
    this.state.zones = this.board.readZones();

    // 6. Cambiar de fase de forma segura
    this._popupTimer = this._popupDuration; // 10 segundos de lectura
    this.state.phase = Phase.QUESTION_POPUP;
  }

  // --------------------------------------------------------
  // POPUP DE PREGUNTA (10 s)
  // --------------------------------------------------------
  _updatePopup(dt) {
    this._popupTimer -= dt;
    this.hud.updatePopupTimer(this._popupTimer, this._popupDuration);

    if (this._popupTimer <= 0) {
      this.hud.hideQuestionPopup();
      this._startCountdown();
    }
  }

  // --------------------------------------------------------
  // CUENTA REGRESIVA 3-2-1
  // --------------------------------------------------------
  _startCountdown() {
    this.state.phase = Phase.COUNTDOWN;
    this._countdownCurrent = 3;
    this._countdownTimer = 1;

    setTimeout(() => {
      this.hud.updateCountdownNumber(this._countdownCurrent);
      this.hud.showCountdown(true);
    }, 420);
  }

  _updateCountdown(dt) {
    this._countdownTimer -= dt;

    if (this._countdownTimer <= 0) {
      this._countdownCurrent -= 1;

      if (this._countdownCurrent <= 0) {
        this.hud.showCountdown(false);
        this.state.phase = Phase.PLAYING;
        this.state.timeLeft = this.state.roundTime;
        return;
      }

      this.hud.updateCountdownNumber(this._countdownCurrent);
      this._countdownTimer = 1;
    }
  }

  // --------------------------------------------------------
  // 1) MOVIMIENTO DE JUGADORES
  // --------------------------------------------------------
  _updatePlayers(dt) {
    const bounds = this.state.bounds;

    if (this.state.player1.alive) {
      const a1 = this.input.axisP1();
      this.state.player1.x += a1.x * this.state.player1.speed * dt;
      this.state.player1.y += a1.y * this.state.player1.speed * dt;
      Object.assign(this.state.player1, clampToBounds(this.state.player1.box, bounds));
    }

    if (this.state.player2.alive) {
      const a2 = this.input.axisP2();
      this.state.player2.x += a2.x * this.state.player2.speed * dt;
      this.state.player2.y += a2.y * this.state.player2.speed * dt;
      Object.assign(this.state.player2, clampToBounds(this.state.player2.box, bounds));
    }
  }

  // --------------------------------------------------------
  // 2) PERSECUCIÓN DEL MISIL
  // --------------------------------------------------------
  _updateMissile(dt) {
    const m = this.state.missile;
    if (!m.active) return;

    const target = m.target ?? this.state.player1;
    const dx = target.center.x - m.center.x;
    const dy = target.center.y - m.center.y;
    const dist = Math.hypot(dx, dy) || 1;
    m.x += (dx / dist) * m.speed * dt;
    m.y += (dy / dist) * m.speed * dt;
  }

  // --------------------------------------------------------
  // 3) COLISIONES AABB
  // --------------------------------------------------------
  _checkCollisions() {
    if (this.state.phase === Phase.GAMEOVER) return;
    const m = this.state.missile;

    // === [MISIL vs JUGADOR] ==============
    for (const player of this.state.players) {
      if (!player.alive) continue;
      if (m.active && aabbIntersects(player.box, m.box)) {
        // Tu lógica de daño por misil...
      }
    }

    // === [JUGADOR vs ZONA DE RESPUESTA] ==
    for (const player of this.state.players) {
      if (!player.alive || player.hasAnswered) continue;

      for (const zone of this.state.zones) {
        if (isInsideZone(player.box, zone)) {
          player.hasAnswered = true;
          const esCorrecto = zone.isCorrect; 

          if (esCorrecto) {
            this._handleAcierto(player, zone);
          } else {
            this._handleFallo(player, zone);
          }
          break; 
        }
      }
    }
  }

  // --------------------------------------------------------
  // MANEJO DE CONSECUENCIAS (ESTRICTO CORAZÓN POR CORAZÓN)
  // --------------------------------------------------------
  _handleAcierto(player, zone) {
    console.log(`[ACIERTO] Jugador ${player.id} respondió correctamente.`);

    if (player.lives < 3) {
      player.lives += 1;
      this.hud.renderLives(player);
    }

    const zonesElements = document.querySelectorAll('.answer-zone');
    const zoneElement = zonesElements[zone.index];
    if (zoneElement) {
      zoneElement.classList.add('is-correct');
    }
  }

  _handleFallo(player, zone) {
    console.log(`[FALLO] Jugador ${player.id} seleccionó una zona incorrecta.`);

    // Restamos exactamente UNA vida
    player.lives -= 1;
    
    if (player.lives <= 0) {
      player.alive = false;
      player.lives = 0;
    }
    this.hud.renderLives(player);

    const playerElement = document.querySelector(`.player--${player.id}`);
    if (playerElement) {
      playerElement.classList.add('is-hurt');
      setTimeout(() => playerElement.classList.remove('is-hurt'), 280);
      
      if (!player.alive) {
        playerElement.classList.add('is-dead');
      }
    }

    const zonesElements = document.querySelectorAll('.answer-zone');
    const zoneElement = zonesElements[zone.index];
    if (zoneElement) {
      zoneElement.classList.add('is-wrong');
    }

    // Si ambos pierden todas las vidas (llegan a 0), entramos a GAMEOVER sin cargar nada más
    if (!this.state.player1.alive && !this.state.player2.alive) {
      this.state.phase = Phase.GAMEOVER;
      this.hud.showGameover(true);
    }
  }

  /* ========================================================
     RENDER
     ======================================================== */
  render() {
    this.board.render(this.state);
    this.hud.renderTimer(this.state.timeLeft);
  }
}