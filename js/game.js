/* ============================================================
   game.js — PUNTO DE ENTRADA (bootstrap del MVC)
   Crea Modelos, Vistas y Controladores, los conecta y arranca el
   bucle de juego. No contiene lógica de jugabilidad: esa vive en
   los controladores (ver GameController). Mantiene el sistema
   modular y escalable.
   ============================================================ */

import { GameLoop }           from './modules/gameloop.js';
import { GameState, Phase }   from './models/GameState.js';
import { QuestionModel }      from './models/QuestionModel.js';
import { BoardView }          from './views/BoardView.js';
import { HudView }            from './views/HudView.js';
import { QuestionView }       from './views/QuestionView.js';
import { InputController }    from './controllers/InputController.js';
import { QuestionController } from './controllers/QuestionController.js';
import { GameController }     from './controllers/GameController.js';
// 1. Importamos el nuevo controlador de audio
import { AudioController }    from './controllers/AudioController.js'; 

async function bootstrap() {
  /* ---------- 1) VISTAS (acceso al DOM ya cargado) ---------- */
  const boardView    = new BoardView();
  const hudView      = new HudView();
  const questionView = new QuestionView();

  /* ---------- 2) MODELOS (estado inicial) ---------- */
  const bounds   = boardView.getBounds();           // límites fijos del tablero
  const state    = new GameState(bounds);
  const qModel   = new QuestionModel('data/questions.json');

  /* ---------- 3) CONTROLADORES ---------- */
  const inputCtrl    = new InputController();
  const questionCtrl = new QuestionController(qModel, questionView);
  const audioCtrl    = new AudioController(); // 2. Instanciamos el controlador
  
  await questionCtrl.init();                          // carga el JSON de preguntas

  // 3. Inyectamos audioCtrl en el GameController
  const game = new GameController({
    state, 
    inputCtrl, 
    questionCtrl, 
    boardView, 
    hudView, 
    questionView,
    audioCtrl 
  });

  /* ---------- 4) ENTRADA: ENTER inicia / reinicia ---------- */
  inputCtrl.init({
    onStart: () => {
      if (state.phase === Phase.START || state.phase === Phase.GAMEOVER) {
        game.startGame();
      }
    },
  });

  game.init();

  /* ---------- 5) BUCLE PRINCIPAL (requestAnimationFrame) ----------
     update(dt): avanza la lógica   |  render(dt): sincroniza el DOM. */
  const loop = new GameLoop(
    (dt) => game.update(dt),
    ()   => game.render(),
  );
  loop.start();

  // Expuesto para depuración en consola
  window.__TC = { state, game, loop, audioCtrl };
}

// Espera a que el DOM esté listo antes de tocar elementos.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}