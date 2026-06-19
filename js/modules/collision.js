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
