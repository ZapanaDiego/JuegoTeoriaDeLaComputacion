# Guía de Desarrollo, Análisis y Colaboración (TC-Survival)

Esta guía ha sido diseñada para estructurar el desarrollo del proyecto **TC-Survival** entre **3 desarrolladores**. El objetivo principal es coordinar el trabajo a través de ramas independientes de Git, resolver los fallos de jugabilidad actuales y preparar la aplicación para su despliegue final en **GitHub Pages**.

---

## 1. Análisis del Proyecto y Arquitectura Actual

El juego sigue un patrón de diseño **MVC (Modelo-Vista-Controlador)** desacoplado en JavaScript puro (ES6 Modules), estructurado de la siguiente manera:

*   **Punto de Entrada**: `js/game.js` inicializa los módulos, modelos, vistas y controladores principales, y arranca el bucle de juego (`js/modules/gameloop.js`).
*   **Modelos (Estado)**:
    *   `js/models/GameState.js`: Centraliza las variables de estado (fase del juego, jugadores, misil, zonas y temporizador).
    *   `js/models/Player.js`: Define coordenadas, velocidad, vidas y estado de invulnerabilidad de un jugador.
    *   `js/models/Missile.js`: Modelo de datos del misil perseguidor.
    *   `js/models/QuestionModel.js`: Carga y baraja las preguntas desde el JSON.
*   **Vistas (Manipulación del DOM)**:
    *   `js/views/BoardView.js`: Sincroniza las posiciones de los jugadores y el misil en el tablero CSS. Proporciona efectos visuales (salpicaduras `splatter`, parpadeo de daño `flashHurt` y zonas).
    *   `js/views/HudView.js`: Muestra los corazones, temporizador y overlays de inicio/final de juego.
    *   `js/views/QuestionView.js`: Renderiza el texto de las preguntas y reparte las opciones por las esquinas.
*   **Controladores (Lógica y Flujo)**:
    *   `js/controllers/GameController.js`: El "cerebro" del juego. Llama a las actualizaciones físicas y gestiona el bucle principal.
    *   `js/controllers/InputController.js`: Traduce las teclas presionadas en vectores de dirección.
    *   `js/controllers/QuestionController.js`: Valida respuestas y avanza las preguntas.

---

## 2. Análisis Detallado de Fallos y Tareas Pendientes

Durante la revisión del código en `js/controllers/GameController.js`, se detectaron los siguientes vacíos de lógica y errores que impiden la jugabilidad:

1.  **Daño del Misil Desactivado**:
    *   La colisión entre el misil y los jugadores está comentada y el método para restar vidas (`_damage(player)`) no está implementado.
    *   El misil se inicializa en `active = false` y nunca cambia a verdadero.
2.  **Mecánica de Respuestas Incompleta**:
    *   La detección de colisiones del jugador con las zonas de respuesta está comentada.
    *   Falta el mecanismo de **anti-rebote / cooldown**. Si un jugador entra en la zona correcta, el juego intentará evaluar la colisión repetidamente en cada frame.
3.  **Falta de Consecuencias al Fallar o Acertar**:
    *   No se definen las consecuencias si un jugador responde mal (ej. perder vida, acelerar el misil) o bien (recuperar vida, ganar velocidad o un escudo temporal).
4.  **Temporizador Inerte**:
    *   Al llegar a `0`, el temporizador simplemente se reinicia a `10` segundos sin aplicar ninguna penalización a los jugadores.
5.  **Flujo de Fin de Juego (Game Over) Incompleto**:
    *   Falta evaluar cuándo un jugador muere (`lives === 0`) para cambiar de fase a `Phase.GAMEOVER`, detener el loop de juego, y mostrar en pantalla quién ganó o si hubo un empate.

---

## 3. Estrategia de Ramas en Git (Git Flow simplificado)

Para evitar pisarse el código entre los 3 desarrolladores, utilizaremos una estrategia basada en ramas temáticas (`feature branches`).

```
          (main)  o----------------------------o (Despliegue)
                 /                            /
      (develop) o-----o-----------------o----o
               /     /                 /
   (feature 1)o-----o (Física/i-frames) \
   (feature 2) o-----o (Zonas/Respuestas)\
   (feature 3)  o-------------------------o (Misil/Ciclos)
```

### Reglas del repositorio:
1.  **`main`**: Rama de producción. Solo contiene código estable que se despliega automáticamente en GitHub Pages.
2.  **`develop`**: Rama de integración. Aquí se fusionan las características terminadas para probar el juego completo.
3.  **Ramas de Feature**: Cada desarrollador creará su rama a partir de `develop` y subirá Pull Requests (PR) para integrarla.

---

## 4. Distribución de Tareas (3 Desarrolladores)

### 🧑‍💻 Desarrollador 1: Física, Movimiento de Jugadores e Inmunidad
*   **Nombre de Rama sugerido**: `feature/player-physics`
*   **Archivos objetivo**:
    *   `js/controllers/GameController.js` (método `_updatePlayers`)
    *   `js/models/Player.js`
    *   `js/views/BoardView.js` (efectos visuales)
*   **Tareas específicas**:
    1.  **Refinar Movimiento**: Asegurar que las colisiones del jugador con los bordes externos del canvas funcionen de forma fluida usando `clampToBounds`.
    2.  **Frames de Invulnerabilidad (i-frames)**: Implementar la propiedad `invulnerableUntil` en `Player.js`. Si el tiempo actual es menor que esta marca, el jugador no puede recibir daño.
    3.  **Animación de Daño y Escudo**:
        *   Crear una animación CSS de parpadeo de escudo (`is-shield` en `styles/board.css`).
        *   Integrar en `BoardView` la lógica visual para cuando el jugador es golpeado y entra en estado invulnerable.
    4.  **Colisión Jugador contra Jugador (Opcional)**: Evitar que los jugadores se atraviesen mutuamente usando una pequeña separación física al chocar.

---

### 🧑‍💻 Desarrollador 2: Zonas de Respuestas, Cuestionarios y Temporizador
*   **Nombre de Rama sugerido**: `feature/question-mechanics`
*   **Archivos objetivo**:
    *   `js/controllers/GameController.js` (métodos `_checkCollisions` y `_updateTimer`)
    *   `js/controllers/QuestionController.js`
    *   `styles/hud.css`
*   **Tareas específicas**:
    1.  **Detección de Respuesta**: Implementar la colisión del jugador con las esquinas (`this.state.zones`).
    2.  **Mecanismo de Bloqueo (Cooldown/Lock)**: Evitar evaluar la respuesta múltiples veces por segundo. Cuando un jugador toque una zona, se debe pausar la evaluación física de respuestas hasta que se cargue la siguiente pregunta.
    3.  **Consecuencias de Respuestas**:
        *   **Acierto**: Si el jugador pisa la zona correcta, obtiene un beneficio (por ejemplo: recuperar 1 vida hasta un máximo de 3, o ganar un escudo temporal) y se pasa inmediatamente a la siguiente pregunta.
        *   **Fallo**: Si pisa una incorrecta, pierde 1 vida, la zona parpadea en rojo y se pasa a la siguiente pregunta.
    4.  **Penalización por Tiempo**: Si el temporizador de la ronda llega a `0`, se debe aplicar daño a todos los jugadores que no hayan respondido y cargar una nueva pregunta para mantener el dinamismo.

---

### 🧑‍💻 Desarrollador 3: IA del Misil, Ciclo de Juego (Game Over) y Despliegue
*   **Nombre de Rama sugerido**: `feature/missile-lifecycle`
*   **Archivos objetivo**:
    *   `js/controllers/GameController.js` (método `_updateMissile`, lógica de daño y reinicios)
    *   `js/models/Missile.js`
    *   `js/views/HudView.js`
*   **Tareas específicas**:
    1.  **IA de Persecución del Misil**:
        *   Hacer que el misil seleccione dinámicamente un objetivo (por ejemplo, el jugador más cercano o el jugador que vaya ganando).
        *   Hacer que el misil se active tras pasar los primeros segundos de la ronda, o cuando alguien responda mal.
        *   Asegurar que la velocidad del misil aumente progresivamente con el tiempo para generar mayor tensión.
    2.  **Colisión Misil-Jugador**:
        *   Al impactar, restarle vida al jugador objetivo, empujarlo ligeramente, activar sus i-frames y resetear el misil al centro del tablero en estado inactivo por unos segundos.
        *   Llamar a `boardView.splatter(x, y)` en el lugar del choque.
    3.  **Ciclo de Vida del Juego (Game Over)**:
        *   Verificar continuamente si un jugador ha perdido todas sus vidas.
        *   Al terminar la partida, activar la fase `GAMEOVER`, mostrar el ganador en el HUD (`hud.showGameover(true, "¡P1 GANA!")`) y permitir el reinicio completo presionando **ENTER**.
    4.  **Configuración de Despliegue en GitHub Pages**.

---

## 5. Plan de Despliegue en GitHub Pages

Para publicar el juego y que sea accesible desde cualquier dispositivo, sigan estos pasos:

### Configuración del Repositorio en GitHub:
1.  Suban el código a un repositorio público en GitHub.
2.  Vayan a **Settings** (Configuración) > **Pages** en el menú de la izquierda.
3.  En la sección **Build and deployment**, bajo **Source**, seleccionen **Deploy from a branch**.
4.  Seleccionen la rama `main` (o `master`) y la carpeta `/ (root)`.
5.  Hagan clic en **Save** (Guardar).

> [!NOTE]
> Dado que el proyecto usa módulos nativos de JavaScript (`type="module"`), no se requiere ningún compilador o empaquetador (Webpack/Vite). GitHub Pages servirá los archivos estáticos directamente. Asegúrense de mantener las rutas relativas en los archivos HTML e imports de JS.

---

## 6. Consejos de Integración para Evitar Conflictos

*   **Hagan Pulls Frecuentes**: Antes de comenzar a programar cada día, ejecuten `git checkout develop` seguido de `git pull origin develop` para mantenerse actualizados.
*   **Fusión (Merges) a través de Pull Requests**: No fusionen directamente a `develop`. Suban su rama a GitHub y abran una Pull Request para que sus compañeros la revisen.
*   **Modularidad de CSS**: Los estilos están separados en `styles/board.css`, `styles/hud.css` y `styles/theme.css`. Intenten respetar esta separación para evitar conflictos de fusión en el diseño visual.
