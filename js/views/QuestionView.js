/* ============================================================
   views/QuestionView.js
   Muestra la pregunta en el panel central/superior y reparte sus
   4 respuestas en las zonas (esquinas). Controla la visibilidad
   temporal del panel.
   ============================================================ */

export class QuestionView {
  constructor() {
    this.panel = document.getElementById('question-panel');
    this.topicEl = document.getElementById('question-topic');
    this.textEl = document.getElementById('question-text');
    this.zoneTextEls = [
      document.querySelector('#zone-top-left .answer-zone__text'),
      document.querySelector('#zone-top-right .answer-zone__text'),
      document.querySelector('#zone-bottom-left .answer-zone__text'),
      document.querySelector('#zone-bottom-right .answer-zone__text'),
    ];
  }

  /** Renderiza una pregunta: respuestas (objetos {text, isCorrect}) en zonas. */
  show(question) {
    question.answers.forEach((ans, i) => {
      if (this.zoneTextEls[i]) {
        // La respuesta es ahora un objeto { text, isCorrect }
        this.zoneTextEls[i].textContent = typeof ans === 'object' ? ans.text : ans;
      }
    });
  }

  /** Oculta el panel (las respuestas pueden permanecer en las zonas). */
  hidePanel() {
    this.panel.classList.remove('is-visible');
  }

  /** Limpia el texto de las zonas entre rondas. */
  clearZones() {
    this.zoneTextEls.forEach((el) => { if (el) el.textContent = ''; });
  }
}
