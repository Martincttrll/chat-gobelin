import type { CSSProperties } from 'vue'
import type { MessageMetadata, Mood } from '@/types/api'

export interface MoodStyle {
  label: string
  color: string | null
  secondary: string | null
  text: CSSProperties
  animation: 'dance' | 'lens' | 'sway' | 'shake' | null
}

// Valeurs provisoires, en attendant la DA.
export const MOODS: Record<Mood, MoodStyle> = {
  neutral: {
    label: 'Neutre',
    color: null,
    secondary: null,
    text: {},
    animation: null,
  },
  anger: {
    label: 'Colère',
    color: 'var(--red)',
    secondary: 'var(--red-secondary)',
    text: { textTransform: 'uppercase', fontWeight: 700, fontSize: '1.3em' },
    animation: null,
  },
  joy: {
    label: 'Joie',
    color: 'var(--yellow)',
    secondary: 'var(--yellow-secondary)',
    text: { fontWeight: 700 },
    animation: 'dance',
  },
  sadness: {
    label: 'Tristesse',
    color: 'var(--blue)',
    secondary: 'var(--blue-secondary)',
    text: { fontWeight: 100, fontSize: '0.8em' },
    animation: 'sway',
  },
  stress: {
    label: 'Stress',
    color: 'var(--purple)',
    secondary: 'var(--purple-secondary)',
    text: { letterSpacing: '-0.08em' },
    animation: 'shake',
  },
  surprise: {
    label: 'Surprise',
    color: 'var(--pink)',
    secondary: 'var(--pink-secondary)',
    text: {},
    animation: 'lens',
  },
}

export function moodColor(metadata?: MessageMetadata): string {
  return (metadata && MOODS[metadata.mood]?.color) || 'var(--text-color)'
}

export function moodSecondaryColor(metadata?: MessageMetadata): string {
  return (metadata && MOODS[metadata.mood]?.secondary) || 'var(--text-color)'
}
