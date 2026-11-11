import gsap from 'gsap'

const MOOD_COLORS = ['--purple', '--pink', '--blue', '--yellow', '--red']
const SECONDS_PER_COLOR = 6

const ease = gsap.parseEase('sine.inOut')
let colors: string[] | undefined

// La couleur ne dépend que de l'heure : tous les blobs, sur toutes les pages, sont synchronisés
// et un changement de page ne fait pas repartir le cycle du début.
// GSAP n'interpole pas une var(--x) : on lit une fois les vraies couleurs calculées.
export function cycleColor(time = Date.now() / 1000): string {
  if (!colors) {
    const style = getComputedStyle(document.documentElement)
    colors = MOOD_COLORS.map((name) => style.getPropertyValue(name).trim())
  }

  const position = (time / SECONDS_PER_COLOR) % colors.length
  const index = Math.floor(position)
  const from = colors[index]!
  const to = colors[(index + 1) % colors.length]!
  return gsap.utils.interpolate(from, to, ease(position - index))
}
