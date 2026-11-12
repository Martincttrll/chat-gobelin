import type { CSSProperties } from 'vue'
import type { MessageMetadata, Mood } from '@/types/api'

export interface MoodStyle {
  label: string
  color: string | null
  secondary: string | null
  text: CSSProperties
  animation: 'dance' | null
  cone: boolean
}

// Valeurs provisoires, en attendant la DA.
export const MOODS: Record<Mood, MoodStyle> = {
  neutral: {
    label: 'Neutre',
    color: null,
    secondary: null,
    text: {},
    animation: null,
    cone: false,
  },
  anger: {
    label: 'Colère',
    color: 'var(--red)',
    secondary: 'var(--red-secondary)',
    text: { textTransform: 'uppercase', fontWeight: 700, fontSize: '1.3em' },
    animation: null,
    cone: false,
  },
  joy: {
    label: 'Joie',
    color: 'var(--yellow)',
    secondary: 'var(--yellow-secondary)',
    text: { fontWeight: 700 },
    animation: 'dance',
    cone: false,
  },
  sadness: {
    label: 'Tristesse',
    color: 'var(--blue)',
    secondary: 'var(--blue-secondary)',
    text: { fontWeight: 100, fontSize: '0.8em' },
    animation: null,
    cone: false,
  },
  stress: {
    label: 'Stress',
    color: 'var(--purple)',
    secondary: 'var(--purple-secondary)',
    text: { letterSpacing: '-0.08em' },
    animation: null,
    cone: false,
  },
  surprise: {
    label: 'Surprise',
    color: 'var(--pink)',
    secondary: 'var(--pink-secondary)',
    text: {},
    animation: null,
    cone: true,
  },
}

export function moodColor(metadata?: MessageMetadata): string {
  return (metadata && MOODS[metadata.mood]?.color) || 'var(--text-color)'
}

export function moodSecondaryColor(metadata?: MessageMetadata): string {
  return (metadata && MOODS[metadata.mood]?.secondary) || 'var(--text-color)'
}
