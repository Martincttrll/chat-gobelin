import type { Mood } from '@/types/api'

export interface EmotionScore {
  label: string
  score: number
}

// Regroupement des 28 émotions GoEmotions dans nos 6 humeurs (proposition, à valider avec les créas).
export const EMOTION_TO_MOOD: Record<string, Mood> = {
  anger: 'anger',
  annoyance: 'anger',
  disgust: 'anger',
  disapproval: 'anger',

  joy: 'joy',
  amusement: 'joy',
  excitement: 'joy',
  love: 'joy',
  gratitude: 'joy',
  optimism: 'joy',
  admiration: 'joy',
  approval: 'joy',
  pride: 'joy',
  relief: 'joy',
  caring: 'joy',
  desire: 'joy',

  sadness: 'sadness',
  grief: 'sadness',
  disappointment: 'sadness',
  remorse: 'sadness',
  embarrassment: 'sadness',

  fear: 'stress',
  nervousness: 'stress',

  surprise: 'surprise',
  realization: 'surprise',
  curiosity: 'surprise',
  confusion: 'surprise',

  neutral: 'neutral',
}

export interface MoodResult {
  mood: Mood
  scores: Record<Mood, number>
}

// Score d'une humeur = le meilleur score de ses émotions (pas la somme : la Joie, qui regroupe
// 12 émotions, gagnerait sinon par simple accumulation de petits scores).
export function toMood(emotions: EmotionScore[]): MoodResult {
  const scores: Record<Mood, number> = {
    neutral: 0,
    anger: 0,
    joy: 0,
    sadness: 0,
    stress: 0,
    surprise: 0,
  }
  for (const { label, score } of emotions) {
    const mood = EMOTION_TO_MOOD[label]
    if (mood) scores[mood] = Math.max(scores[mood], score)
  }

  const mood = (Object.keys(scores) as Mood[]).reduce((best, m) => (scores[m] > scores[best] ? m : best))
  return { mood, scores }
}
