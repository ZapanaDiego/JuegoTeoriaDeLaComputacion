/* ============================================================
   models/QuestionModel.js
   Carga y administra el banco de preguntas (data/questions.json).
   Sirve preguntas sin repetir y valida respuestas por índice de
   zona (0..3 = TL, TR, BL, BR).
   ============================================================ */

export class QuestionModel {
  constructor(dataUrl = 'data/questions.json') {
    this.dataUrl = dataUrl;
    this.questions = [];
    this.zoneMap = {};
    this._remaining = [];
    this.current = null;
  }

  /** Carga el JSON de preguntas de forma asíncrona. */
  async load() {
    const res = await fetch(this.dataUrl);
    if (!res.ok) throw new Error(`No se pudo cargar ${this.dataUrl}`);
    const data = await res.json();
    this.questions = data.questions ?? [];
    this.zoneMap = data.meta?.zoneMap ?? {};
    this._resetPool();
    return this.questions.length;
  }

  _resetPool() {
    this._remaining = [...this.questions];
  }

  /** Devuelve una pregunta aleatoria sin repetir hasta agotar el banco. */
  next() {
    if (this._remaining.length === 0) this._resetPool();
    const idx = Math.floor(Math.random() * this._remaining.length);
    this.current = this._remaining.splice(idx, 1)[0];
    return this.current;
  }

  /** @returns {boolean} true si la zona elegida es la correcta. */
  isCorrect(zoneIndex) {
    return !!this.current && this.current.correctIndex === zoneIndex;
  }
}
