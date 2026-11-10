import type { Point } from './physics'

export const STICK_RADIUS = 50 // px, course max du stick

// Inclinaison du stick entre l'endroit où le doigt s'est posé et sa position actuelle :
// de -1 à 1 sur chaque axe, longueur max 1.
export function stickTilt(origin: Point, point: Point): Point {
  const dx = point.x - origin.x
  const dy = point.y - origin.y
  const ratio = 1 / Math.max(Math.hypot(dx, dy), STICK_RADIUS)
  return { x: dx * ratio, y: dy * ratio }
}
