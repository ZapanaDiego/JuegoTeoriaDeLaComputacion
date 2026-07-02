/* ============================================================
   models/QuestionModel.js
   Carga y administra el banco de preguntas (data/questions.json).
   Sirve preguntas sin repetir y valida respuestas por índice de
   zona (0..3 = TL, TR, BL, BR).
   ============================================================ */

import { DebugLogger } from '../modules/debug.js';

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
    DebugLogger.logTrace('QuestionModel', 'load', `Cargando JSON desde ${this.dataUrl}`);
    const res = await fetch(this.dataUrl);
    if (!res.ok) {
      DebugLogger.logLogicError('QuestionModel', 'Error cargando dataUrl', this.dataUrl);
      throw new Error(`No se pudo cargar ${this.dataUrl}`);
    }
    const data = await res.json();
    this.questions = data.questions ?? [];
    this.zoneMap = data.meta?.zoneMap ?? {};
    this._resetPool();
    DebugLogger.logTrace('QuestionModel', 'load', `Banco de preguntas cargado con ${this.questions.length} items`);
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
    DebugLogger.logTrace('QuestionModel', 'next', `Pregunta seleccionada: ID ${this.current.id}`);
    return this.current;
  }

  /** @returns {boolean} true si la zona elegida corresponde a la respuesta con isCorrect === 1. */
  isCorrect(zoneIndex) {
    if (!this.current) return false;
    const answer = this.current.answers[zoneIndex];
    const correct = !!answer && answer.isCorrect === 1;
    DebugLogger.logTrace('QuestionModel', 'isCorrect', `Validando zona ${zoneIndex}: ${correct ? 'ACIERTO' : 'FALLO'}`);
    return correct;
  }
}
