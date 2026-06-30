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

    // Temporizadores internos para el popup
    this._popupTimer = 0;
    this._popupDuration = 10;   // segundos

    // === MECANISMO DE BLOQUEO (COOLDOWN/LOCK) ===
    this._isEvaluating = false; 
  }

  /** Arranque inicial: pintar HUD y dejar listo el overlay de inicio. */
  init() {
    this.hud.renderLives(this.state.player1);
    this.hud.renderLives(this.state.player2);
    this.hud.renderScore(this.state.player1);
    this.hud.renderScore(this.state.player2);
    this.hud.renderTimer(this.state.timeLeft);
    this.hud.showStart(true);
  }

  /** FUNCIÓN AUXILIAR: Devuelve a los jugadores de forma segura a sus esquinas de origen */
_resetPlayerPositions() {
    const centerX = this.state.bounds.w / 2;
    const centerY = this.state.bounds.h / 2;

    if (this.state.player1) {
      this.state.player1.x = centerX - 40;  
      this.state.player1.y = centerY - 17;  
    }
    if (this.state.player2) {
      this.state.player2.x = centerX + 10; 
      this.state.player2.y = centerY - 17; 
    }
  }

  /** Comienza / reinicia la partida (lo dispara ENTER). */
  startGame() {
    if (this.state.phase === Phase.PLAYING
        || this.state.phase === Phase.QUESTION_POPUP) return;

    this.state.reset();
    this.state.phase = Phase.QUESTION_POPUP;   // aún no es PLAYING
    
    // 1. Teletransportar jugadores al spawn inicial de la partida
    this._resetPlayerPositions();
    {
    const centerX = this.state.bounds.w / 2;
    const centerY = this.state.bounds.h / 2;

    if (this.state.player1) {
      this.state.player1.x = centerX - 40; 
      this.state.player1.y = centerY - 17;
      this.state.player1.vx = 0; this.state.player1.vy = 0;
    }
    if (this.state.player2) {
      this.state.player2.x = centerX + 10;
      this.state.player2.y = centerY - 17;
      this.state.player2.vx = 0; this.state.player2.vy = 0;
    }
  }



    this.state.players.forEach(p => {
      p.hasAnswered = false;
      p.insideZoneIndex = -1;
      p.score = 0;
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
    this.hud.renderScore(this.state.player1);
    this.hud.renderScore(this.state.player2);

    this.audioCtrl.playSecondary();
  }

  /* ========================================================
     UPDATE — avanza la lógica del juego (dt en segundos).
     ======================================================== */
  update(dt) {
    if (this.state.phase === Phase.QUESTION_POPUP) {
      this._updatePopup(dt);
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
      const now = performance.now();

      this.state.players.forEach((player) => {
        if (player.alive && !player.hasAnswered) {
          const result = player.loseLife(now);
          if (result === false) return;   // i-frames activos → sin daño

          this.board.flashHurtWithShield(player.id);
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

    // 1. Apagamos la bandera de respuesta de ambos jugadores y reseteamos zona actual
    this.state.players.forEach(p => {
      p.hasAnswered = false;
      p.insideZoneIndex = -1;
    });

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
      // Transición directa a PLAYING (sin cuenta regresiva)
      this.state.phase = Phase.PLAYING;
      this.state.timeLeft = this.state.roundTime;
    }
  }

  // --------------------------------------------------------
  // 1) MOVIMIENTO DE JUGADORES
  // --------------------------------------------------------
  _updatePlayers(dt) {
    const bounds = this.state.bounds;

    for (const player of this.state.players) {
      if (!player.alive) continue;

      const axis = player.id === 'p1' ? this.input.axisP1() : this.input.axisP2();
      player.x += axis.x * player.speed * dt;
      player.y += axis.y * player.speed * dt;

      // Clamp fluido a los bordes del canvas
      const clamped = clampToBounds(player.box, bounds);
      player.x = clamped.x;
      player.y = clamped.y;
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
      if (!player.alive) continue;

      let collidingZone = null;
      for (const zone of this.state.zones) {
        if (isInsideZone(player.box, zone)) {
          collidingZone = zone;
          break;
        }
      }

      if (collidingZone) {
        // Evaluar la respuesta si es la primera vez que entra a esta zona
        if (player.insideZoneIndex !== collidingZone.index) {
          player.insideZoneIndex = collidingZone.index;
          player.hasAnswered = true;

          const esCorrecto = this.questions.model.isCorrect(collidingZone.index);
          if (esCorrecto) {
            this._handleAcierto(player, collidingZone);
          } else {
            this._handleFallo(player, collidingZone);
          }
        }
      } else {
        // Si no está tocando ninguna zona, le permitimos volver a elegir
        player.insideZoneIndex = -1;
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

    // Aumentar puntos +100
    player.score += 100;
    this.hud.renderScore(player);

    const zonesElements = document.querySelectorAll('.answer-zone');
    const zoneElement = zonesElements[zone.index];
    if (zoneElement) {
      zoneElement.classList.remove('is-wrong');
      zoneElement.classList.add('is-correct');
    }
  }

  _handleFallo(player, zone) {
    console.log(`[FALLO] Jugador ${player.id} seleccionó una zona incorrecta.`);

    const now = performance.now();
    const result = player.loseLife(now);

    // Si estaba invulnerable, no aplica daño
    if (result === false) return;

    // Disminuir puntos -25 (mínimo 0)
    if (player.score < 25) {
      player.score = 0;
    } else {
      player.score -= 25;
    }
    this.hud.renderScore(player);

    this.hud.renderLives(player);
    this.board.flashHurtWithShield(player.id);

    const zonesElements = document.querySelectorAll('.answer-zone');
    const zoneElement = zonesElements[zone.index];
    if (zoneElement) {
      zoneElement.classList.remove('is-correct');
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