/* ============================================================
   views/HudView.js
   Sincroniza el HUD con el estado: corazones (vidas) por jugador,
   temporizador central y overlays de inicio / game over.
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
}
