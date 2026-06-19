/* ============================================================
   controllers/InputController.js
   Adapta el InputManager (módulo de bajo nivel) a las acciones
   del juego: arrancar/reiniciar con ENTER y exponer los ejes de
   movimiento de cada jugador al GameController.
   ============================================================ */

import { InputManager } from '../modules/input.js';

export class InputController {
  constructor() {
    this.input = new InputManager();
  }

  init({ onStart }) {
    this.input.attach();
    // ENTER → iniciar / reiniciar (lo gestiona el GameController)
    this.input.onAction('Enter', onStart);
  }

  /** Vector de movimiento de P1 (WASD). */
  axisP1() { return this.input.getAxis('p1'); }

  /** Vector de movimiento de P2 (Flechas). */
  axisP2() { return this.input.getAxis('p2'); }
}
