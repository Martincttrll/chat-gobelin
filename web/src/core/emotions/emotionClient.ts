import type { Mood } from '@/types/api'
import { toMood, type EmotionScore } from './moodMapping'

export type WorkerRequest = { type: 'load' } | { type: 'classify'; id: number; text: string }

export type WorkerResponse =
  | { type: 'progress'; progress: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; emotions: EmotionScore[]; duration: number }
  | { type: 'error'; id?: number; message: string }

export interface Detection {
  emotions: EmotionScore[]
  duration: number // ms d'inférence
}

// Un seul worker pour toute l'app : le modèle n'est chargé qu'une fois en mémoire.
let worker: Worker | undefined
let nextId = 0
const pending = new Map<number, { resolve: (d: Detection) => void; reject: (e: Error) => void }>()
const progressListeners = new Set<(progress: number) => void>()
let ready = false

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker(new URL('./emotion.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    if (data.type === 'progress') {
      progressListeners.forEach((listener) => listener(data.progress))
    } else if (data.type === 'ready') {
      ready = true
      progressListeners.forEach((listener) => listener(100))
    } else if (data.type === 'result') {
      pending.get(data.id)?.resolve({ emotions: data.emotions, duration: data.duration })
      pending.delete(data.id)
    } else if (data.id !== undefined) {
      pending.get(data.id)?.reject(new Error(data.message))
      pending.delete(data.id)
    }
  }
  return worker
}

export function isEmotionModelReady() {
  return ready
}

// Lance le téléchargement du modèle (mis en cache par le navigateur pour les visites suivantes).
// À appeler tôt (preloader) pour que la première détection soit immédiate.
export function preloadEmotions(onProgress?: (progress: number) => void): () => void {
  if (onProgress) progressListeners.add(onProgress)
  getWorker().postMessage({ type: 'load' } satisfies WorkerRequest)
  return () => onProgress && progressListeners.delete(onProgress)
}

export function detectEmotions(text: string): Promise<Detection> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ type: 'classify', id, text } satisfies WorkerRequest)
  })
}

// Neutre si le modèle n'est pas encore chargé : on n'attend pas la fin du téléchargement pour envoyer.
export async function detectMood(text: string): Promise<Mood> {
  if (!ready) return 'neutral'
  try {
    return toMood((await detectEmotions(text)).emotions).mood
  } catch {
    return 'neutral'
  }
}
