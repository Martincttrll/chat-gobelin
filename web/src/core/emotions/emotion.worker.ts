// Tourne dans un Web Worker : le chargement et l'inférence du modèle ne bloquent pas la page (ni le jeu).
import { pipeline, type TextClassificationPipeline } from '@huggingface/transformers'
import type { WorkerRequest, WorkerResponse } from './emotionClient'

const MODEL = 'jdp8/multilingual_go_emotions-ONNX'

let classifier: Promise<TextClassificationPipeline> | undefined

function post(message: WorkerResponse) {
  self.postMessage(message)
}

function load() {
  classifier ??= pipeline('text-classification', MODEL, {
    dtype: 'q8', // onnx/model_quantized.onnx, ~179 Mo
    progress_callback: (info) => {
      if (info.status === 'progress_total') post({ type: 'progress', progress: info.progress })
    },
  }).then((pipe) => {
    post({ type: 'ready' })
    return pipe as TextClassificationPipeline
  })
  return classifier
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    const pipe = await load()
    if (data.type !== 'classify') return

    const start = performance.now()
    const output = await pipe(data.text, { top_k: null })
    post({
      type: 'result',
      id: data.id,
      emotions: output as { label: string; score: number }[],
      duration: performance.now() - start,
    })
  } catch (error) {
    post({ type: 'error', id: data.type === 'classify' ? data.id : undefined, message: String(error) })
  }
}
