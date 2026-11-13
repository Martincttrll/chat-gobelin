import type { MessageMetadata } from '@/types/api'
import { ballRadius, type Ball } from './physics'

// Traînée provisoire en SVG (lueur qui suit la boule), pour un premier rendu (la version aquarelle Three.js est dans core/trail).
// Valeurs provisoires.
export const TRAIL_FADE = 0.7 // s avant qu'un point de la traînée disparaisse
const MIN_STEP = 0.003 // déplacement minimal (map 0–1) entre deux points

export interface TrailPoint {
  x: number // map 0–1
  y: number
  time: number // s
}

export interface Trail {
  ballId: number
  width: number // px : diamètre de la boule
  metadata: MessageMetadata
  points: TrailPoint[]
}

// Ajoute la position des boules en vol, oublie les points trop vieux. La traînée d'une boule
// attrapée ou posée finit de s'effacer toute seule.
export function updateTrails(trails: Trail[], balls: Ball[], time: number): Trail[] {
  for (const ball of balls) {
    if (ball.onGround) continue
    let trail = trails.find((t) => t.ballId === ball.id)
    if (!trail) {
      trail = { ballId: ball.id, width: ballRadius(ball.text) * 2, metadata: ball.metadata, points: [] }
      trails.push(trail)
    }
    const last = trail.points.at(-1)
    if (!last || Math.hypot(ball.x - last.x, ball.y - last.y) >= MIN_STEP) {
      trail.points.push({ x: ball.x, y: ball.y, time })
    }
  }

  return trails
    .map((trail) => ({ ...trail, points: trail.points.filter((p) => time - p.time < TRAIL_FADE) }))
    // Une traînée qui commence n'a qu'un point : on la garde, sinon elle ne grandit jamais.
    .filter((trail) => trail.points.length > 0)
}
