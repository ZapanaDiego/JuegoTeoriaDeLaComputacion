/* ============================================================
   controllers/QuestionController.js
   Coordina el modelo de preguntas con su vista. Decide cuándo
   mostrar una nueva pregunta y resuelve la respuesta según la
   zona en la que se posicione un jugador.
   ============================================================ */

import { DebugLogger } from '../modules/debug.js';

export class QuestionController {
  /**
   * @param {QuestionModel} model
   * @param {QuestionView}  view
   */
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async init() {
    DebugLogger.logTrace('QuestionController', 'init', 'Inicializando controlador de preguntas');
    await this.model.load();
  }

  /** Sirve y muestra una nueva pregunta. */
  nextQuestion() {
    DebugLogger.logTrace('QuestionController', 'nextQuestion', 'Solicitando nueva pregunta a la vista');
    const q = this.model.next();
    this.view.clearZones();
    this.view.show(q);
    return q;
  }

  /**
   * Evalúa la zona elegida (0..3).
   * @returns {boolean} si fue correcta. La vista resalta la zona.
   */
  resolve(zoneIndex) {
    DebugLogger.logTrace('QuestionController', 'resolve', `Resolviendo respuesta en zona ${zoneIndex}`);
    const correct = this.model.isCorrect(zoneIndex);
    this.view.flashZone(zoneIndex, correct);
    return correct;
  }
}
