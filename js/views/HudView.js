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
    this.timerEl = document.getElementById('timer-value');
    this.overlayStart = document.getElementById('overlay-start');
    this.overlayGameover = document.getElementById('overlay-gameover');
    this.gameoverTitle = document.getElementById('gameover-title');

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

  /** Actualiza el temporizador y marca estado crítico. */
  renderTimer(timeLeft) {
    const secs = Math.max(0, Math.ceil(timeLeft));
    this.timerEl.textContent = String(secs).padStart(2, '0');
    this.timerEl.classList.toggle('is-critical', secs <= 3);
  }

  showStart(show)    { this.overlayStart.classList.toggle('is-visible', show); }

  showGameover(show, title = 'FIN') {
    this.gameoverTitle.textContent = title;
    this.overlayGameover.classList.toggle('is-visible', show);
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
