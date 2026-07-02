/* ============================================================
   controllers/InputController.js
   Adapta el InputManager (módulo de bajo nivel) a las acciones
   del juego: arrancar/reiniciar con ENTER y exponer los ejes de
   movimiento de cada jugador al GameController.
   ============================================================ */

import { InputManager } from '../modules/input.js';
import { DebugLogger } from '../modules/debug.js';

export class InputController {
  constructor() {
    this.input = new InputManager();
  }

  init({ onStart }) {
    DebugLogger.logTrace('InputController', 'init', 'Iniciando InputController y asignando listeners');
    this.input.attach();
    // ENTER → iniciar / reiniciar (lo gestiona el GameController)
    this.input.onAction('Enter', onStart);
    
    // F9 → Exportar Log de Depuración
    this.input.onAction('F9', () => {
      DebugLogger.logTrace('InputController', 'F9_Press', 'Usuario ha solicitado exportación de log manual');
      DebugLogger.exportLogFile();
    });
  }

  /** Vector de movimiento de P1 (WASD). */
  axisP1() { return this.input.getAxis('p1'); }

  /** Vector de movimiento de P2 (Flechas). */
  axisP2() { return this.input.getAxis('p2'); }
}
