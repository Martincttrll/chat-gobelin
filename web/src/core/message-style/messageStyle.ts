import type { CSSProperties } from 'vue'
import type { Mood } from '@/types/api'
import { MOODS } from './moods'

// Valeurs provisoires.
const AVERAGE_CPM = 200 // caractères/min : frappe moyenne, en dessous pas d'inclinaison
const FAST_CPM = 400 // caractères/min : inclinaison max
const MAX_SKEW = -20 // degrés

const SHORT_PAUSE = 500 // ms → espace normal
const LONG_PAUSE = 3000 // ms → espace max
const MAX_EXTRA_GAP = 2 // em

export function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

// speed en caractères/s (mesuré par typingSpeed.ts). 0 = frappe moyenne ou plus lente, 1 = frappe rapide.
export function typingIntensity(speed: number): number {
  const cpm = speed * 60
  return clamp01((cpm - AVERAGE_CPM) / (FAST_CPM - AVERAGE_CPM))
}

export function speedToSkew(speed: number): number {
  return typingIntensity(speed) * MAX_SKEW
}

export function pauseToGap(pause = 0): string {
  return `${clamp01((pause - SHORT_PAUSE) / (LONG_PAUSE - SHORT_PAUSE)) * MAX_EXTRA_GAP}em`
}

export function getMessageStyle(mood: Mood, typingSpeed: number): CSSProperties {
  return {
    ...MOODS[mood].text,
    transform: `skewX(${speedToSkew(typingSpeed)}deg)`,
  }
}
