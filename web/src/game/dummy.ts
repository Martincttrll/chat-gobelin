import type { Mood, MessageMetadata } from '@/types/api'
import { MOODS } from '@/message-style/moods'
import type { Point } from './physics'

const DUMMY_TEXTS = [
  'tu as fait le devoir de maths ?',
  'regarde par la fenêtre',
  'on joue à la récré ?',
  'le prof nous regarde',
  'passe-moi ta gomme stp',
]

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

export function randomPoint(): Point {
  return { x: 0.1 + Math.random() * 0.8, y: 0.15 + Math.random() * 0.7 }
}

export function randomDummyMessage(): { text: string; metadata: MessageMetadata } {
  const mood = pick(Object.keys(MOODS) as Mood[])
  return {
    text: pick(DUMMY_TEXTS),
    metadata: { mood, typingSpeed: 2 + Math.random() * 7, pauses: [] },
  }
}
