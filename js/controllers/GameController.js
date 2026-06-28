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

  /** Comienza / reinicia la partida (lo dispara ENTER). */
  startGame() {
    if (this.state.phase === Phase.PLAYING
        || this.state.phase === Phase.QUESTION_POPUP
        || this.state.phase === Phase.COUNTDOWN) return;

    this.state.reset();
    this.state.phase = Phase.QUESTION_POPUP;   // aún no es PLAYING
    this.state.zones = this.board.readZones();
    this.hud.showStart(false);
    this.hud.showGameover(false);

    // Cargar pregunta y mostrarla en el popup
    const q = this.questions.nextQuestion();
    this.hud.showQuestionPopup(q);

    // Iniciar temporizador del popup
    this._popupTimer = this._popupDuration;

    this.hud.renderLives(this.state.player1);
    this.hud.renderLives(this.state.player2);
    this._isEvaluating = false; // Asegurar desbloqueo al empezar
  }

  /* ========================================================
     UPDATE — avanza la lógica del juego (dt en segundos).
     ======================================================== */
  update(dt) {
    // --- Fase: Popup de pregunta (10 s) ---
    if (this.state.phase === Phase.QUESTION_POPUP) {
      this._updatePopup(dt);
      return;
    }

    // --- Fase: Cuenta regresiva 3-2-1 ---
    if (this.state.phase === Phase.COUNTDOWN) {
      this._updateCountdown(dt);
      return;
    }

    if (!this.state.isPlaying) return;

    this._updatePlayers(dt);   // 1) movimiento WASD / flechas
    this._updateMissile(dt);   // 2) persecución del misil
    this._checkCollisions();   // 3) colisiones AABB (Zonas y Misil)
    this._updateTimer(dt);     // 4) temporizador de ronda + Penalización
  }

  // --------------------------------------------------------
  // POPUP DE PREGUNTA (10 s)
  // --------------------------------------------------------
  _updatePopup(dt) {
    this._popupTimer -= dt;
    this.hud.updatePopupTimer(this._popupTimer, this._popupDuration);

    if (this._popupTimer <= 0) {
      // Ocultar popup → pasar a cuenta regresiva
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
    this._countdownTimer = 1;  // 1 segundo por dígito

    // Pequeño delay para que la animación de salida del popup termine
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
        // ¡Empezar el juego!
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
  //    P1 → WASD   |   P2 → Flechas
  // --------------------------------------------------------
  _updatePlayers(dt) {
    const bounds = this.state.bounds;

    // === [LÓGICA DE MOVIMIENTO P1 — WASD] ===============
    const a1 = this.input.axisP1();
    this.state.player1.x += a1.x * this.state.player1.speed * dt;
    this.state.player1.y += a1.y * this.state.player1.speed * dt;
    Object.assign(this.state.player1, clampToBounds(this.state.player1.box, bounds));

    // === [LÓGICA DE MOVIMIENTO P2 — FLECHAS] ============
    const a2 = this.input.axisP2();
    this.state.player2.x += a2.x * this.state.player2.speed * dt;
    this.state.player2.y += a2.y * this.state.player2.speed * dt;
    Object.assign(this.state.player2, clampToBounds(this.state.player2.box, bounds));
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
  _// --------------------------------------------------------
  // 3) COLISIONES AABB (CORREGIDO)
  // --------------------------------------------------------
  _checkCollisions() {
    const m = this.state.missile;

    // === [COLISIÓN AABB: MISIL vs JUGADOR] ==============
    for (const player of this.state.players) {
      if (!player.alive) continue;
      if (m.active && aabbIntersects(player.box, m.box)) {
        // Tu lógica de daño por misil existente...
      }
    }

    // === [COLISIÓN AABB: JUGADOR vs ZONA DE RESPUESTA] ==
    if (this._isEvaluating) return;

    for (const player of this.state.players) {
      if (!player.alive) continue;

      for (const zone of this.state.zones) {
        if (isInsideZone(player.box, zone)) {
          
          // 1. Activar bloqueo inmediato para que no vuelva a chocar en el siguiente frame
          this._isEvaluating = true;

          // === SOLUCIÓN AQUÍ ===
          // Usamos la propiedad nativa del objeto 'zone' en lugar de un método roto
          const esCorrecto = zone.isCorrect; 

          // 2. Aplicar consecuencias asociadas
          if (esCorrecto) {
            this._handleAcierto(player, zone);
          } else {
            this._handleFallo(player, zone);
          }

          return; // Romper el ciclo al detectar la primera colisión válida
        }
      }
    }
  }

  // --------------------------------------------------------
  // MANEJO DE CONSECUENCIAS (ACIERTOS / FALLOS)
  // --------------------------------------------------------
  _handleAcierto(player, zone) {
    console.log(`[ACIERTO] Jugador ${player.id} respondió correctamente.`);
    
    // Beneficio: recuperar 1 vida hasta un máximo de 3
    if (player.lives < 3) {
      player.lives += 1;
      this.hud.renderLives(player);
    }

    // Feedback visual usando las clases nativas de tu board.css
    const zonesElements = document.querySelectorAll('.answer-zone');
    const zoneElement = zonesElements[zone.index];
    if (zoneElement) {
      zoneElement.classList.add('is-correct'); // Verde lima neón
    }

    // Pausa de 1.5s para apreciar el acierto antes de limpiar y saltar
    setTimeout(() => {
      if (zoneElement) zoneElement.classList.remove('is-correct');
      this._cargarSiguientePregunta();
    }, 1500);
  }

  _handleFallo(player, zone) {
    console.log(`[FALLO] Jugador ${player.id} seleccionó una zona incorrecta.`);
    
    // Penalización: Pierde 1 vida
    player.lives -= 1;
    if (player.lives <= 0) {
      player.alive = false;
      player.lives = 0;
    }
    this.hud.renderLives(player);

    // Aplicar animación de daño (.is-hurt) e .is-dead si corresponde al jugador
    const playerElement = document.querySelector(`.player--${player.id}`);
    if (playerElement) {
      playerElement.classList.add('is-hurt');
      setTimeout(() => playerElement.classList.remove('is-hurt'), 280);
      
      if (!player.alive) {
        playerElement.classList.add('is-dead');
      }
    }

    // Feedback visual de la zona usando las clases nativas de tu board.css
    const zonesElements = document.querySelectorAll('.answer-zone');
    const zoneElement = zonesElements[zone.index];
    if (zoneElement) {
      zoneElement.classList.add('is-wrong'); // Rojo sangre neón
    }

    // Verificar si es el fin de la partida completa
    if (!this.state.player1.alive && !this.state.player2.alive) {
      this.state.phase = Phase.GAMEOVER;
      this.hud.showGameover(true);
      return;
    }

    // Esperar 2s para que vean el error antes de limpiar y saltar la pregunta
    setTimeout(() => {
      if (zoneElement) zoneElement.classList.remove('is-wrong');
      this._cargarSiguientePregunta();
    }, 2000);
  }

  _cargarSiguientePregunta() {
    // 1. Liberar el candado de evaluación para la nueva ronda
    this._isEvaluating = false;

    // 2. Transición hacia la fase de lectura congelada
    this.state.phase = Phase.QUESTION_POPUP;

    // 3. Obtener la nueva pregunta y renderizarla en el DOM
    const proximaPregunta = this.questions.nextQuestion();
    this.hud.showQuestionPopup(proximaPregunta);

    // 4. RESET DEL TEMPORIZADOR DEL POPUP (Evita que el juego se quede colgado)
    this._popupTimer = this._popupDuration;
  }

  // --------------------------------------------------------
  // 4) TEMPORIZADOR DE RONDA & PENALIZACIÓN POR TIEMPO
  // --------------------------------------------------------
  _updateTimer(dt) {
    if (this._isEvaluating) return; // Si ya se está evaluando, frenar el reloj

    this.state.timeLeft -= dt;
    
    if (this.state.timeLeft <= 0) {
      this.state.timeLeft = 0;
      
      // Activar bloqueo inmediato
      this._isEvaluating = true;
      console.log("[TIEMPO AGOTADO] Quitando vida a los jugadores rezagados.");

      // Quitar una vida a todos los jugadores que sigan vivos
      this.state.players.forEach((player) => {
        if (player.alive) {
          player.lives -= 1;
          
          // Efecto visual de daño por tiempo agotado
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

      // Verificar condición de Game Over global
      if (!this.state.player1.alive && !this.state.player2.alive) {
        this.state.phase = Phase.GAMEOVER;
        this.hud.showGameover(true);
        return;
      }

      // Pasar a la siguiente pregunta automáticamente para mantener el dinamismo
      this._cargarSiguientePregunta();
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