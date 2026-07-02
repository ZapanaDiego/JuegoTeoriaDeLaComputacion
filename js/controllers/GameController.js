/* ============================================================
   controllers/GameController.js
   CEREBRO DEL JUEGO. Conecta entrada → estado → vistas dentro del
   bucle (update/render). Aquí se implementa la jugabilidad:
   movimiento de jugadores, persecución del misil y colisiones AABB.
   ============================================================ */

import { Phase } from '../models/GameState.js';
import { clampToBounds, aabbIntersects, isInsideZone, collidesWithAnyObstacle, getCollidingObstacle } from '../modules/collision.js';
import { DebugLogger } from '../modules/debug.js';

export class GameController {
  constructor({ state, inputCtrl, questionCtrl, boardView, hudView, questionView, audioCtrl}) {
    this.state = state;
    this.input = inputCtrl;
    this.questions = questionCtrl;
    this.boardView = boardView;
    this.hud = hudView;
    this.qView = questionView;
    this.audioCtrl = audioCtrl;

    // Nombres persistentes entre rondas (sobreviven a la revancha)
    this._p1Name = 'Jugador 1';
    this._p2Name = 'Jugador 2';
    this._namesRegistered = false; // false = primera vez, muestra inputs

    // Temporizadores internos para el popup
    this._popupTimer = 0;
    this._popupDuration = 10;   // segundos

    // === MECANISMO DE BLOQUEO (COOLDOWN/LOCK) ===
    this._isEvaluating = false; 
  }

  /** Arranque inicial: pintar HUD y dejar listo el overlay de inicio. */
  init() {
    DebugLogger.logTrace('GameController', 'init', 'Iniciando renderizado inicial (HUD)');
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
    DebugLogger.logTrace('GameController', 'startGame', 'Comenzando o reiniciando el juego');
    if (this.state.phase === Phase.PLAYING
        || this.state.phase === Phase.QUESTION_POPUP) return;

    const isRematch = this._namesRegistered;

    if (!isRematch) {
      // === PRIMERA PARTIDA: capturar nombres de los inputs ===
      const names = this.hud.getPlayerNames();
      this._p1Name = names.p1 || 'Jugador 1';
      this._p2Name = names.p2 || 'Jugador 2';
      this._namesRegistered = true;
    }

    // Aplicar nombres al modelo (preservados entre revanchas)
    this.state.player1.name = this._p1Name;
    this.state.player2.name = this._p2Name;

    if (isRematch) {
      // === REVANCHA: resetear solo estadísticas, conservar nombres ===
      this.state.player1.resetStats();
      this.state.player2.resetStats();
      // Limpiar DOM de obstáculos viejos
      this.boardView.resetZones();
      // Regenerar mapa
      this.state.generateProceduralObstacles();
      this.boardView.initObstacles(this.state.obstacles);
      this.state.timeLeft = this.state.roundTime;
      this.state.isEvaluatingAnswer = false;
    } else {
      // === PRIMERA VEZ: reset total del estado ===
      this.state.reset();
      this.boardView.initObstacles(this.state.obstacles);
    }

    // Ocultar pantalla de inicio (inputs)
    this.hud.showStart(false);
    // Ocultar pantalla de gameover si viene de revancha
    this.hud.showGameover(false);

    // Mostrar nombres en el HUD
    this.hud.setPlayerNames(this._p1Name, this._p2Name);

    DebugLogger.logPhase(this.state.phase, Phase.QUESTION_POPUP);
    this.state.phase = Phase.QUESTION_POPUP;

    // Reposicionar jugadores al centro
    this._resetPlayerPositions();

    // Limpiar flags de respuesta
    this.state.players.forEach(p => {
      p.hasResponded = false;
      p.insideZoneIndex = -1;
      const el = document.querySelector(`.player--${p.id}`);
      if (el) el.classList.remove('is-dead', 'is-hurt');
    });

    // Cargar primera pregunta
    const q = this.questions.nextQuestion();
    this.hud.showQuestionPopup(q);
    this.state.zones = this.boardView.readZones();
    this._popupTimer = this._popupDuration;

    // Actualizar HUD completo
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
    // Bloquear toda lógica si la partida aún no empezó
    if (this.state.phase === Phase.START) return;

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
      const todosRespondieron = activos.length > 0 && activos.every(p => p.hasResponded);

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
        if (player.alive && !player.hasResponded) {
          const result = player.loseLife(now);
          if (result === false) return;   // i-frames activos → sin daño

          this.boardView.flashHurtWithShield(player.id);
          this.hud.renderLives(player);
        }
      });

      // CONTROL DE FIN DE JUEGO: Si alguien murió por tiempo agotado
      const p1 = this.state.player1;
      const p2 = this.state.player2;
      if (!p1.alive || !p2.alive) {
        if (!p1.alive && !p2.alive) {
          // Empate: ambos muertos → sin ganador claro, usar el de más puntos
          const winner = p1.score >= p2.score ? p1 : p2;
          const loser  = winner === p1 ? p2 : p1;
          this._triggerGameOver(winner, loser);
        } else {
          const winner = p1.alive ? p1 : p2;
          const loser  = p1.alive ? p2 : p1;
          this._triggerGameOver(winner, loser);
        }
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
    DebugLogger.logTrace('GameController', '_cargarSiguientePregunta', 'Limpiando estado e inyectando nueva pregunta');
    if (this.state.phase === Phase.GAMEOVER) return;

    // === SOLUCIÓN AL DAÑO FANTASMA ===
    this._resetPlayerPositions();

    // 1. Apagamos la bandera de respuesta de ambos jugadores y reseteamos zona actual
    this.state.players.forEach(p => {
      p.hasResponded = false;
      p.insideZoneIndex = -1;
    });

    // 2. Limpiamos las clases CSS del DOM anteriores (.is-correct y .is-wrong)
    this.boardView.resetZones();

    // 3. Regenerar mapa: nuevos obstáculos por cada ronda
    this.state.generateProceduralObstacles();
    this.boardView.initObstacles(this.state.obstacles);
    DebugLogger.logMapGen(`Mapa regenerado para nueva ronda. Total: ${this.state.obstacles.length} obstáculos.`);

    // 4. Solicitamos la nueva pregunta
    const proximaPregunta = this.questions.nextQuestion();
    
    // 5. Pintamos el popup y actualizamos los textos en el DOM
    this.hud.showQuestionPopup(proximaPregunta);

    // 6. Escaneamos las nuevas respuestas físicas
    this.state.zones = this.boardView.readZones();

    // 7. Cambiar de fase de forma segura
    this._popupTimer = this._popupDuration; // 10 segundos de lectura
    DebugLogger.logPhase(this.state.phase, Phase.QUESTION_POPUP);
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
      DebugLogger.logPhase(this.state.phase, Phase.PLAYING);
      this.state.phase = Phase.PLAYING;
      this.state.timeLeft = this.state.roundTime;
    }
  }

  // --------------------------------------------------------
  // 1) MOVIMIENTO DE JUGADORES
  // --------------------------------------------------------
  _updatePlayers(dt) {
    const bounds = this.state.bounds;
    const obstacles = this.state.obstacles || [];

    for (const player of this.state.players) {
      if (!player.alive) continue;

      const axis = player.id === 'p1' ? this.input.axisP1() : this.input.axisP2();
      
      // Movimiento y Colisión en el eje X
      player.x += axis.x * player.speed * dt;
      let obsX = getCollidingObstacle(player.box, obstacles);
      if (obsX) {
        player.x -= axis.x * player.speed * dt; // Revertir X
        if (axis.x !== 0) player.x -= Math.sign(axis.x); // Factor de desatascamiento de 1px
        DebugLogger.logPhysics(`[Sliding] Bloqueo en Eje X para ${player.id}`, { axis: 'X', obstacleId: obsX.id, playerPos: { x: player.x, y: player.y } });
      }

      // Movimiento y Colisión en el eje Y
      player.y += axis.y * player.speed * dt;
      let obsY = getCollidingObstacle(player.box, obstacles);
      if (obsY) {
        player.y -= axis.y * player.speed * dt; // Revertir Y
        if (axis.y !== 0) player.y -= Math.sign(axis.y); // Factor de desatascamiento de 1px
        DebugLogger.logPhysics(`[Sliding] Bloqueo en Eje Y para ${player.id}`, { axis: 'Y', obstacleId: obsY.id, playerPos: { x: player.x, y: player.y } });
      }

      // Clamp fluido a los bordes externos del canvas
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
        // Evaluar la respuesta si es la primera vez que entra a esta zona Y si no ha respondido en esta ronda
        if (player.insideZoneIndex !== collidingZone.index && !player.hasResponded) {
          player.insideZoneIndex = collidingZone.index;
          player.hasResponded = true; // Bloquea llamadas repetitivas de verificación

          const esCorrecto = this.questions.model.isCorrect(collidingZone.index);
          if (esCorrecto) {
            this._handleAcierto(player, collidingZone);
          } else {
            this._handleFallo(player, collidingZone);
          }
        }
      } else {
        // Al salir al tablero neutral, puede volver a intentar
        player.insideZoneIndex = -1;
        player.hasResponded = false; // <-- Esto permite rectificar
      }
    }
  }

  // --------------------------------------------------------
  // MANEJO DE CONSECUENCIAS (ESTRICTO CORAZÓN POR CORAZÓN)
  // --------------------------------------------------------
  _handleAcierto(player, zone) {
    DebugLogger.logTrace('GameController', '_handleAcierto', `Acierto de ${player.id}`);

    // Actualizar contador de aciertos
    player.correctAnswers++;

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
    DebugLogger.logTrace('GameController', '_handleFallo', `Fallo de ${player.id}`);

    // Actualizar contador de errores
    player.incorrectAnswers++;

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
    this.boardView.flashHurtWithShield(player.id);

    const zonesElements = document.querySelectorAll('.answer-zone');
    const zoneElement = zonesElements[zone.index];
    if (zoneElement) {
      zoneElement.classList.remove('is-correct');
      zoneElement.classList.add('is-wrong');
    }

    // Comprobar fin de juego: si un jugador muere, el otro gana inmediatamente
    const p1 = this.state.player1;
    const p2 = this.state.player2;

    if (!p1.alive || !p2.alive) {
      const winner = p1.alive ? p1 : p2;
      const loser  = p1.alive ? p2 : p1;
      this._triggerGameOver(winner, loser);
    }
  }

  /**
   * Activa la pantalla de fin de juego con las estadísticas completas.
   */
  _triggerGameOver(winner, loser) {
    DebugLogger.logTrace('GameController', '_triggerGameOver', `Ganador: ${winner.name}`);
    this.state.phase = Phase.GAMEOVER;

    // Reproducir audio de victoria y detener la música de juego
    this.audioCtrl.playVictory();

    // Mostrar pantalla de resultados
    this.hud.showResults(winner, loser);
  }

  /* ========================================================
     RENDER
     ======================================================== */
  render() {
    this.boardView.render(this.state);
    this.hud.renderTimer(this.state.timeLeft);
  }
}