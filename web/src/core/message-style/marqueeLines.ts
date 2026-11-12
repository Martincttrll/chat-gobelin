// Valeurs provisoires.
const MAX_LINE_LENGTH = 18 // caractères
const MIN_LINES = 4
const ENDS_PHRASE = /[.,;:!?…]$/
// Ponctuation précédée d'une espace (« trop bien ! ») : recollée au mot d'avant.
const PUNCTUATION_ONLY = /^[.,;:!?…]+$/

export interface LineWord {
  text: string
  index: number // position du mot dans le message, pour retrouver sa pause (metadata.pauses)
}

// Coupe après chaque ponctuation ou quand la ligne devient trop longue,
// puis répète les lignes d'un message court jusqu'à en avoir MIN_LINES.
export function marqueeLines(content: string): LineWord[][] {
  const lines: LineWord[][] = []
  let line: LineWord[] = []
  let length = 0

  function breakLine() {
    lines.push(line)
    line = []
    length = 0
  }

  content
    .split(' ')
    .filter(Boolean)
    .forEach((text, index) => {
      const previous = line[line.length - 1]
      if (previous && PUNCTUATION_ONLY.test(text)) {
        previous.text += `\u00a0${text}`
        length += 1 + text.length
      } else {
        if (line.length && length + 1 + text.length > MAX_LINE_LENGTH) breakLine()
        line.push({ text, index })
        length += (line.length > 1 ? 1 : 0) + text.length
      }
      if (ENDS_PHRASE.test(text)) breakLine()
    })
  if (line.length) breakLine()
  if (lines.length === 0) return []

  const result = [...lines]
  for (let i = 0; result.length < MIN_LINES; i++) {
    result.push(lines[i % lines.length]!)
  }
  return result
}
