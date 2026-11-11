import type { Point } from '@/core/game/physics'
import type { Mood } from '@/types/api'
import { MOODS } from './moods'

const RADIUS = 130 // px, distance entre le doigt et les humeurs
// Éventail vers le haut (0° = droite, 90° = haut) : le bouton est en bas au centre de l'écran.
const START_ANGLE = 150
const END_ANGLE = 30
const DEAD_ZONE = 40 // px autour du bouton où rien n'est sélectionné
const PICK_DISTANCE = 70 // px max entre le doigt et une humeur

export interface WheelItem {
  mood: Mood
  x: number
  y: number
}

export function wheelItems(origin: Point): WheelItem[] {
  const moods = Object.keys(MOODS) as Mood[]
  const step = (END_ANGLE - START_ANGLE) / (moods.length - 1)

  return moods.map((mood, i) => {
    const angle = ((START_ANGLE + i * step) * Math.PI) / 180
    return {
      mood,
      x: origin.x + RADIUS * Math.cos(angle),
      y: origin.y - RADIUS * Math.sin(angle),
    }
  })
}

export function pickMood(items: WheelItem[], origin: Point, point: Point): Mood | null {
  if (Math.hypot(point.x - origin.x, point.y - origin.y) < DEAD_ZONE) return null

  let picked: Mood | null = null
  let closest = PICK_DISTANCE
  for (const item of items) {
    const distance = Math.hypot(point.x - item.x, point.y - item.y)
    if (distance < closest) {
      picked = item.mood
      closest = distance
    }
  }
  return picked
}
