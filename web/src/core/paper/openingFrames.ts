import type { Point, Size } from '@/core/game/physics'

// Taille de chaque étape, en fraction de la demi-diagonale de l'écran.
// La dernière laisse volontairement des coins découverts : le plein écran vient juste après.
const STEPS = [0.12, 0.3, 0.75, 1]
const MIN_VERTICES = 5
const MAX_VERTICES = 8

function random(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function polygon(center: Point, radius: number): string {
  const count = Math.floor(random(MIN_VERTICES, MAX_VERTICES + 1))
  const step = (Math.PI * 2) / count
  const start = random(0, step)

  const points = Array.from({ length: count }, (_, i) => {
    const angle = start + i * step + random(-0.35, 0.35) * step
    const r = radius * random(0.8, 1.15)
    return `${center.x + Math.cos(angle) * r}px ${center.y + Math.sin(angle) * r}px`
  })
  return `polygon(${points.join(', ')})`
}

// Un clip-path par image du stop motion : la feuille part de origin et se recentre en grandissant.
export function openingFrames(origin: Point, screen: Size): string[] {
  const center = { x: screen.width / 2, y: screen.height / 2 }
  const halfDiagonal = Math.hypot(screen.width, screen.height) / 2

  return STEPS.map((size, i) => {
    const t = (i + 1) / STEPS.length
    const c = {
      x: origin.x + (center.x - origin.x) * t,
      y: origin.y + (center.y - origin.y) * t,
    }
    return polygon(c, size * halfDiagonal)
  })
}
