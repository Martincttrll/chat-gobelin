import type { CSSProperties } from 'vue'
import type { MessageMetadata, Mood } from '@/types/api'

export interface MoodStyle {
  label: string
  color: string | null
  text: CSSProperties
  animation: 'dance' | null
  cone: boolean
}

// Valeurs provisoires, en attendant la DA.
export const MOODS: Record<Mood, MoodStyle> = {
  neutral: {
    label: 'Neutre',
    color: null,
    text: {},
    animation: null,
    cone: false,
  },
  anger: {
    label: 'Colère',
    color: 'var(--red)',
    text: { textTransform: 'uppercase', fontWeight: 700 },
    animation: null,
    cone: false,
  },
  joy: {
    label: 'Joie',
    color: 'var(--yellow)',
    text: { fontWeight: 700 },
    animation: 'dance',
    cone: false,
  },
  sadness: {
    label: 'Tristesse',
    color: 'var(--blue)',
    text: { fontWeight: 100, fontSize: '0.8em' },
    animation: null,
    cone: false,
  },
  stress: {
    label: 'Stress',
    color: 'var(--purple)',
    text: { letterSpacing: '-0.08em' },
    animation: null,
    cone: false,
  },
  surprise: {
    label: 'Surprise',
    color: 'var(--pink)',
    text: {},
    animation: null,
    cone: true,
  },
}

export function moodColor(metadata?: MessageMetadata): string {
  return (metadata && MOODS[metadata.mood]?.color) || 'var(--text-color)'
}
