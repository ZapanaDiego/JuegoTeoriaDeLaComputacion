/* ============================================================
   controllers/QuestionController.js
   Coordina el modelo de preguntas con su vista. Decide cuándo
   mostrar una nueva pregunta y resuelve la respuesta según la
   zona en la que se posicione un jugador.
   ============================================================ */

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
    await this.model.load();
  }

  /** Sirve y muestra una nueva pregunta. */
  nextQuestion() {
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
    const correct = this.model.isCorrect(zoneIndex);
    this.view.flashZone(zoneIndex, correct);
    return correct;
  }
}
