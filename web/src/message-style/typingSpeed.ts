// Au-delà, le temps entre deux touches est plafonné dans le calcul de la vitesse.
const MAX_KEY_DELAY = 1000

export function createTypingTracker() {
  let activeTime = 0
  let charCount = 0
  let lastKeyAt: number | null = null
  let lastLetterAt: number | null = null
  let afterSpace = false
  let pauses: number[] = []

  function onInput(event: Event) {
    const { inputType, data } = event as InputEvent
    if (inputType !== 'insertText' || !data) return

    const now = performance.now()

    if (lastKeyAt !== null) {
      activeTime += Math.min(now - lastKeyAt, MAX_KEY_DELAY)
    }
    lastKeyAt = now
    charCount += data.length

    if (data === ' ') {
      afterSpace = true
      return
    }
    if (afterSpace && lastLetterAt !== null) {
      pauses.push(now - lastLetterAt)
    }
    afterSpace = false
    lastLetterAt = now
  }

  // Vitesse en caractères par seconde.
  function getResult() {
    const typingSpeed = activeTime > 0 ? charCount / (activeTime / 1000) : 0
    return { typingSpeed, pauses }
  }

  function reset() {
    activeTime = 0
    charCount = 0
    lastKeyAt = null
    lastLetterAt = null
    afterSpace = false
    pauses = []
  }

  return { onInput, getResult, reset }
}
