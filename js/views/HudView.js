/* ============================================================
   views/HudView.js
   Sincroniza el HUD con el estado: corazones (vidas) por jugador,
   temporizador central y overlays de inicio / game over /
   popup de pregunta / cuenta regresiva.
   ============================================================ */

export class HudView {
  constructor() {
    this.hearts = {
      p1: [...document.querySelectorAll('#hearts-p1 .heart')],
      p2: [...document.querySelectorAll('#hearts-p2 .heart')],
    };
    this.scores = {
      p1: document.getElementById('score-p1'),
      p2: document.getElementById('score-p2'),
    };
    this.timerEl = document.getElementById('timer-value');
    this.overlayStart = document.getElementById('overlay-start');
    this.overlayGameover = document.getElementById('overlay-gameover');
    this.gameoverTitle = document.getElementById('gameover-title');
    this.gameoverSubtitle = document.getElementById('gameover-subtitle');

    // --- Inputs y Labels ---
    this.inputP1Name = document.getElementById('input-p1-name');
    this.inputP2Name = document.getElementById('input-p2-name');
    this.labels = {
      p1: document.querySelector('#hud-p1 .hud__label'),
      p2: document.querySelector('#hud-p2 .hud__label'),
    };

    // --- Popup de pregunta ---
    this.overlayPopup = document.getElementById('overlay-question-popup');
    this.popupCard    = this.overlayPopup.querySelector('.popup-card');
    this.popupTopic   = document.getElementById('popup-topic');
    this.popupText    = document.getElementById('popup-text');
    this.popupFill    = document.getElementById('popup-timer-fill');
    this.popupLabel   = document.getElementById('popup-timer-label');

    // --- Cuenta regresiva ---
    this.overlayCountdown = document.getElementById('overlay-countdown');
    this.countdownNumber  = document.getElementById('countdown-number');
  }

  /** Pinta las vidas: corazones perdidos reciben .is-lost. */
  renderLives(player) {
    const set = this.hearts[player.id];
    set.forEach((heart, i) => {
      heart.classList.toggle('is-lost', i >= player.lives);
    });
  }

  /** Pinta el puntaje del jugador. */
  renderScore(player) {
    const el = this.scores[player.id];
    if (el) {
      el.textContent = `PTS: ${player.score}`;
    }
  }

  /** Actualiza el temporizador y marca estado crítico. */
  renderTimer(timeLeft) {
    const secs = Math.max(0, Math.ceil(timeLeft));
    this.timerEl.textContent = String(secs).padStart(2, '0');
    this.timerEl.classList.toggle('is-critical', secs <= 3);
  }

  showStart(show)    { this.overlayStart.classList.toggle('is-visible', show); }

  showGameover(show, title = 'FIN', subtitle = '') {
    this.gameoverTitle.textContent = title;
    if (this.gameoverSubtitle) this.gameoverSubtitle.textContent = subtitle;
    this.overlayGameover.classList.toggle('is-visible', show);
  }

  /**
   * Muestra la pantalla final con los resultados completos del ganador.
   * @param {Player} winner  - El jugador ganador (aún vivo).
   * @param {Player} loser   - El jugador derrotado.
   */
  showResults(winner, loser) {
    const titleEl = this.gameoverTitle;
    const subtitleEl = this.gameoverSubtitle;

    // Título: nombre del ganador en mayúsculas
    titleEl.textContent = `🏆 ${winner.name.toUpperCase()} GANA`;
    titleEl.style.color = '#b6ff00';
    titleEl.style.textShadow = '0 0 20px #b6ff00, 0 0 40px #b6ff00';

    // Estadísticas detalladas del ganador
    if (subtitleEl) {
      subtitleEl.innerHTML = `
        <div style="line-height:1.8; font-size:1.1rem;">
          <div style="color:#b6ff00; font-size:1.4rem; margin-bottom:8px;">
            ${winner.score} <span style="font-size:.9rem; color:#aaa;">puntos</span>
          </div>
          <div style="color:#00ffea;">
            Aciertos: <strong>${winner.correctAnswers}</strong>
            &nbsp;|&nbsp;
            Errores: <strong style="color:#ff0055;">${winner.incorrectAnswers}</strong>
          </div>
          <div style="margin-top:12px; font-size:.85rem; color:#777; border-top: 1px solid #333; padding-top:10px;">
            ${loser.name}: ${loser.score} pts — Aciertos: ${loser.correctAnswers} | Errores: ${loser.incorrectAnswers}
          </div>
        </div>
      `;
    }

    this.overlayGameover.classList.add('is-visible');
  }

  getPlayerNames() {
    return {
      p1: this.inputP1Name ? this.inputP1Name.value.trim() : '',
      p2: this.inputP2Name ? this.inputP2Name.value.trim() : ''
    };
  }

  setPlayerNames(name1, name2) {
    if (this.labels.p1) this.labels.p1.textContent = name1;
    if (this.labels.p2) this.labels.p2.textContent = name2;
  }

  /* ---------- Popup de pregunta (10 s) ---------- */

  /** Muestra el popup con la pregunta dada y reinicia la barra. */
  showQuestionPopup(question) {
    this.popupTopic.textContent = question.topic;
    this.popupText.textContent  = question.text;
    this.popupFill.style.transition = 'none';
    this.popupFill.style.width = '100%';
    this.popupLabel.textContent = '10';
    this.popupCard.classList.remove('is-exiting');
    this.overlayPopup.classList.add('is-visible');
  }

  /** Actualiza la barra de tiempo y la etiqueta (secsLeft: 0-10). */
  updatePopupTimer(secsLeft, totalSecs) {
    const pct = Math.max(0, (secsLeft / totalSecs) * 100);
    this.popupFill.style.transition = 'width 1s linear';
    this.popupFill.style.width = `${pct}%`;
    this.popupLabel.textContent = Math.max(0, Math.ceil(secsLeft));
  }

  /** Oculta el popup con animación de salida. */
  hideQuestionPopup() {
    this.popupCard.classList.add('is-exiting');
    setTimeout(() => {
      this.overlayPopup.classList.remove('is-visible');
      this.popupCard.classList.remove('is-exiting');
    }, 400);
  }

  /* ---------- Cuenta regresiva 3-2-1 ---------- */

  showCountdown(show) {
    this.overlayCountdown.classList.toggle('is-visible', show);
  }

  updateCountdownNumber(n) {
    this.countdownNumber.textContent = n;
  }
}
