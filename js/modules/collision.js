/* ============================================================
   modules/collision.js
   Detección de colisiones AABB (Axis-Aligned Bounding Box).
   Toda entidad colisionable expone {x, y, w, h} donde (x,y) es
   la esquina superior izquierda en coordenadas del tablero.
   ============================================================ */

/**
 * Colisión AABB entre dos cajas.
 * @returns {boolean} true si se solapan.
 */
export function aabbIntersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Comprueba si una entidad colisiona con algún obstáculo del mapa.
 * Asume que todos los obstáculos (incluso círculos) se pueden
 * aproximar de forma óptima a su AABB (Bounding Box).
 */
export function collidesWithAnyObstacle(entityBox, obstacles) {
  if (!obstacles) return false;
  for (let i = 0; i < obstacles.length; i++) {
    if (aabbIntersects(entityBox, obstacles[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Retorna el obstáculo exacto con el que colisionó la entidad.
 * - Para obstáculos 'circle': usa Círculo-Caja (más preciso que AABB puro, evita hitbox injusto).
 * - Para el resto (rect-v, rect-h, L-shape): usa AABB estándar.
 * Devuelve null si no hay colisión.
 */
export function getCollidingObstacle(entityBox, obstacles) {
  if (!obstacles) return null;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    let hit = false;

    if (obs.type === 'circle') {
      // Radio del círculo = la mitad de su ancho (siempre w === h en círculos)
      const cr = obs.w / 2;
      const cx = obs.x + cr;
      const cy = obs.y + cr;
      // Punto más cercano del AABB del jugador al centro del círculo
      const nearX = Math.max(entityBox.x, Math.min(cx, entityBox.x + entityBox.w));
      const nearY = Math.max(entityBox.y, Math.min(cy, entityBox.y + entityBox.h));
      const dx = cx - nearX;
      const dy = cy - nearY;
      // Reducimos el radio efectivo un 15% para que no se sienta injusto
      hit = (dx * dx + dy * dy) < ((cr * 0.85) ** 2);
    } else {
      hit = aabbIntersects(entityBox, obs);
    }

    if (hit) return obs;
  }
  return null;
}

/**
 * ¿Está el punto/caja `a` contenido dentro de la zona `zone`?
 * Útil para detectar que un jugador entra en una zona de respuesta.
 */
export function isInsideZone(a, zone) {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  return (
    cx >= zone.x &&
    cx <= zone.x + zone.w &&
    cy >= zone.y &&
    cy <= zone.y + zone.h
  );
}

/**
 * Mantiene una caja dentro de los límites del tablero (clamp).
 * Devuelve {x, y} corregidos.
 */
export function clampToBounds(box, bounds) {
  return {
    x: Math.max(bounds.x, Math.min(box.x, bounds.x + bounds.w - box.w)),
    y: Math.max(bounds.y, Math.min(box.y, bounds.y + bounds.h - box.h)),
  };
}
