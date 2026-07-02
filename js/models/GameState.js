/* ============================================================
   models/GameState.js
   ============================================================ */

import { Player } from './Player.js';
import { Missile } from './Missile.js';
import { isInsideZone } from '../modules/collision.js'; 
import { DebugLogger } from '../modules/debug.js';

export const Phase = Object.freeze({
  START:          'start',
  QUESTION_POPUP: 'question_popup',   
  COUNTDOWN:      'countdown',         
  PLAYING:        'playing',
  REVEAL_ANSWER:  'reveal_answer',
  GAMEOVER:       'gameover',
});

export class GameState {
  constructor(bounds) {
    DebugLogger.logTrace('GameState', 'constructor', 'Inicializando estado de juego');
    this.bounds = bounds;
    this.phase = Phase.START;

    // Los jugadores inician en el centro del tablero
    this.player1 = new Player('p1', this._getInitialPlayerPos('p1'));
    this.player2 = new Player('p2', this._getInitialPlayerPos('p2'));

    this.missile = new Missile({
      x: bounds.x + bounds.w / 2 - 9,
      y: bounds.y + bounds.h / 2 - 9,
    });

    this.zones = [];        
    this.roundTime = 50; // Ampliado para dar tiempo con obstáculos
    this.timeLeft = this.roundTime;
    this.players = [this.player1, this.player2];
    this.isEvaluatingAnswer = false; 
    
    // Generación inicial de obstáculos
    this.obstacles = [];
    this.generateProceduralObstacles();
  }

  get isPlaying() { return this.phase === Phase.PLAYING; }

  /**
   * Retorna la posición inicial centrada de un jugador.
   */
  _getInitialPlayerPos(playerId) {
    const offsetX = playerId === 'p1' ? -40 : 10;
    return {
      x: this.bounds.x + this.bounds.w / 2 + offsetX,
      y: this.bounds.y + this.bounds.h / 2 - 17, // 17 es la mitad de la altura del jugador asumiendo h=34
    };
  }

  reset() {
    DebugLogger.logTrace('GameState', 'reset', 'Reiniciando estado para nueva partida');
    // Reiniciar vidas, estado y posición
    const p1Pos = this._getInitialPlayerPos('p1');
    this.player1.x = p1Pos.x; this.player1.y = p1Pos.y;
    this.player1.lives = 3; this.player1.alive = true; this.player1.score = 0; this.player1.insideZoneIndex = -1;
    
    const p2Pos = this._getInitialPlayerPos('p2');
    this.player2.x = p2Pos.x; this.player2.y = p2Pos.y;
    this.player2.lives = 3; this.player2.alive = true; this.player2.score = 0; this.player2.insideZoneIndex = -1;
    
    this.timeLeft = this.roundTime;
    this.isEvaluatingAnswer = false; 
    
    DebugLogger.logPhase(this.phase, Phase.PLAYING);
    this.phase = Phase.PLAYING;
    
    // Regenerar el mapa con nuevos obstáculos cada partida
    this.generateProceduralObstacles();
  }

  nextQuestion() {
    DebugLogger.logTrace('GameState', 'nextQuestion', 'Restaurando tiempo para nueva ronda');
    this.timeLeft = this.roundTime;
    this.isEvaluatingAnswer = false; 
    DebugLogger.logPhase(this.phase, Phase.PLAYING);
    this.phase = Phase.PLAYING;
  }

  /**
   * Genera entre 45 y 60 obstáculos por ronda.
   * Tamaños reducidos para garantizar pasillos navegables entre ellos.
   * Separación mínima de 48px (> 34px del jugador) garantizando paso siempre.
   */
  generateProceduralObstacles() {
    this.obstacles = [];
    const numObstacles = Math.floor(Math.random() * 18) + 50; // 45–60
    DebugLogger.logMapGen(`Iniciando generación de mapa. Objetivo: ${numObstacles} obstáculos.`);

    // L-shape queda excluido: dos piezas juntas consumen demasiado espacio
    const types = ['rect-v', 'rect-h', 'circle'];
    let globalAttempts = 0;
    const maxGlobalAttempts = 2500; // techo extremo para alcanzar hasta 60 obstáculos
    let rejectedCount = 0;

    while (this.obstacles.length < numObstacles && globalAttempts < maxGlobalAttempts) {
      globalAttempts++;
      const type = types[Math.floor(Math.random() * types.length)];
      const { w, h } = this._getRandomObstacleSize(type);
      // Margen interior de borde
      const margin = 20;
      const x = this.bounds.x + margin + Math.random() * (this.bounds.w - w - margin * 2);
      const y = this.bounds.y + margin + Math.random() * (this.bounds.h - h - margin * 2);
      const obstacle = { id: `obs-${this.obstacles.length}`, x, y, w, h, type };

      if (this._isValidObstaclePosition(obstacle)) {
        this.obstacles.push(obstacle);
        DebugLogger.logMapGen(`Obstáculo aceptado: ${obstacle.id}`, { type, x: Math.floor(x), y: Math.floor(y) });
      } else {
        rejectedCount++;
      }
    }

    DebugLogger.logMapGen(
      `Generación terminada: ${this.obstacles.length}/${numObstacles} colocados. Rechazados: ${rejectedCount}. Intentos: ${globalAttempts}.`
    );
  }

  /** Genera las dos piezas AABB de una forma en "L" en una posición aleatoria. */
  _generateLShape() {
    const armW = Math.floor(Math.random() * 15) + 15; // 15-30px de grosor
    const arm1Len = Math.floor(Math.random() * 50) + 60; // 60-110px largo
    const arm2Len = Math.floor(Math.random() * 50) + 60;
    const flip = Math.random() < 0.5; // orientación aleatoria

    // Pieza vertical + horizontal que comparten esquina
    let piece1, piece2;
    if (flip) {
      // L: brazo vertical a la izquierda, brazo horizontal abajo
      piece1 = { w: armW, h: arm1Len };
      piece2 = { w: arm2Len, h: armW };
    } else {
      // L invertida: brazo horizontal arriba, brazo vertical a la derecha
      piece1 = { w: arm2Len, h: armW };
      piece2 = { w: armW, h: arm1Len };
    }

    const baseX = this.bounds.x + 20 + Math.random() * (this.bounds.w - piece1.w - piece2.w - 40);
    const baseY = this.bounds.y + 20 + Math.random() * (this.bounds.h - piece1.h - piece2.h - 40);
    const groupId = `lgrp-${Date.now()}`;

    return [
      { id: `${groupId}-a`, x: baseX, y: baseY, ...piece1, type: 'L-shape' },
      { id: `${groupId}-b`, x: baseX, y: baseY + piece1.h - armW, ...piece2, type: 'L-shape' },
    ];
  }

  /**
   * Retorna dimensiones reducidas por tipo para garantizar pasillos navegables.
   * El jugador mide ~34px, así que los obstáculos no superan los 60px de grosor.
   */
  _getRandomObstacleSize(type) {
    switch (type) {
      case 'rect-v':
        // Pilar vertical: fino (12-22px) y moderadamente largo (40-75px)
        return { w: Math.random() * 10 + 12, h: Math.random() * 35 + 40 };
      case 'rect-h':
        // Barra horizontal: moderadamente larga (40-75px) y fina (12-22px)
        return { w: Math.random() * 35 + 40, h: Math.random() * 10 + 12 };
      case 'circle':
      default: {
        // Pilares pequeños: diámetro 20-38px
        const d = Math.random() * 18 + 20;
        return { w: d, h: d };
      }
    }
  }

  /**
   * Valida si un obstáculo puede colocarse.
   * 
   * ZONA CENTRAL: Círculo de radio 130px centrado en el spawn.
   * ESQUINAS: Zona dinámica de bounds.w*0.20 x bounds.h*0.20 (20% del tablero).
   *   Con un tablero de 1280x680: caja de 256x136px por esquina.
   * SEPARACIÓN: 60px de distancia mínima entre bounding-boxes de obstáculos.
   */
  _isValidObstaclePosition(obs) {
    const cx = this.bounds.x + this.bounds.w / 2;
    const cy = this.bounds.y + this.bounds.h / 2;

    // ── 1. Zona central de spawn: radio 130px ──────────────────────────────
    const obsCx = obs.x + obs.w / 2;
    const obsCy = obs.y + obs.h / 2;
    const distCenter = Math.sqrt((obsCx - cx) ** 2 + (obsCy - cy) ** 2);
    if (distCenter < 130 + Math.max(obs.w, obs.h) / 2) return false;

    // ── 2. Esquinas: 20% del ancho y alto del tablero ─────────────────────
    // cw = 20% del ancho → ej. 1280*0.20 = 256px
    // ch = 20% del alto  → ej.  680*0.20 = 136px
    const cw = Math.floor(this.bounds.w * 0.20);
    const ch = Math.floor(this.bounds.h * 0.20);
    const corners = [
      { x: this.bounds.x,                      y: this.bounds.y },
      { x: this.bounds.x + this.bounds.w - cw, y: this.bounds.y },
      { x: this.bounds.x,                      y: this.bounds.y + this.bounds.h - ch },
      { x: this.bounds.x + this.bounds.w - cw, y: this.bounds.y + this.bounds.h - ch },
    ];
    for (const corner of corners) {
      if (
        obs.x     < corner.x + cw &&
        obs.x + obs.w > corner.x &&
        obs.y     < corner.y + ch &&
        obs.y + obs.h > corner.y
      ) return false;
    }

    // ── 3. Separación mínima de 48px + pasillo libre de 40px ──────────────────
    // La caja expandida asegura que entre dos obs haya al menos 48px de espacio.
    // El jugador mide 34px; 48px > 34px, garantizando paso siempre.
    const MIN_SEP = 48;
    for (const placed of this.obstacles) {
      const expanded = {
        x: obs.x - MIN_SEP,
        y: obs.y - MIN_SEP,
        w: obs.w + MIN_SEP * 2,
        h: obs.h + MIN_SEP * 2,
      };
      if (
        expanded.x           < placed.x + placed.w &&
        expanded.x + expanded.w > placed.x &&
        expanded.y           < placed.y + placed.h &&
        expanded.y + expanded.h > placed.y
      ) return false;
    }

    return true;
  }

  /**
   * @param {number} dt Tiempo transcurrido desde el último frame en segundos
   */
  update(dt = 0.016) {
    if (!this.isPlaying) return;

    // 1. MANEJO DEL TEMPORIZADOR
    if (!this.isEvaluatingAnswer) {
      this.timeLeft -= dt;

      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.aplicarPenalizacionPorTiempo();
        return;
      }
    }

    // 2. PROCESAR COLISIONES FÍSICAS DE ZONAS (Respuestas)
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

  aplicarPenalizacionPorTiempo() {
    DebugLogger.logTrace('GameState', 'aplicarPenalizacionPorTiempo', 'Aplicando daño por tiempo agotado a jugadores inactivos');
    console.log("[TIEMPO AGOTADO] Ningún jugador respondió a tiempo. Aplicando penalización.");
    this.isEvaluatingAnswer = true;

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

    this.lastResponse = { timeout: true };
    DebugLogger.logPhase(this.phase, Phase.QUESTION_POPUP);
    this.phase = Phase.QUESTION_POPUP;
  }

  consecuenciaAcierto(player, zone) {
    DebugLogger.logTrace('GameState', 'consecuenciaAcierto', `Acierto del jugador ${player.id}`);
    console.log(`[ACIERTO] Jugador ${player.id} respondió correctamente.`);
    if (player.lives < 3) player.lives += 1;
    DebugLogger.logPhase(this.phase, Phase.QUESTION_POPUP);
    this.phase = Phase.QUESTION_POPUP; 
  }

  consecuenciaFallo(player, zone) {
    DebugLogger.logTrace('GameState', 'consecuenciaFallo', `Fallo del jugador ${player.id}`);
    console.log(`[FALLO] Jugador ${player.id} eligió la zona incorrecta.`);
    player.lives -= 1;
    if (player.lives <= 0) {
      player.alive = false;
      player.lives = 0;
    }
    zone.flashRed = true; 
    DebugLogger.logPhase(this.phase, Phase.QUESTION_POPUP);
    this.phase = Phase.QUESTION_POPUP;
  }
}