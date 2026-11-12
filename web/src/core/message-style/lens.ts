import type { Point, Size } from "@/core/game/physics";

// Valeurs provisoires, à tweaker.
// Rapporté au plus grand côté : sur un téléphone en portrait, la loupe couvre 2 à 3 lignes.
const RADIUS = 0.35; // rayon de la loupe, en fraction du plus grand côté de l'écran
const MAX_SCALE = 2.2; // grossissement au centre
const BULGE = 0.4; // les lettres sous la loupe sont repoussées vers le bord (0 = pas de bombé)
const STRETCH = 0.5; // étirement vers l'extérieur, max au bord de la loupe
const SPEED = 0.35; // vitesse du trajet de la loupe

// Trajet de la loupe : somme de sinus aux fréquences non multiples, il ne se répète pas à l'œil.
export function createLensPath() {
  const phases = Array.from({ length: 4 }, () => Math.random() * Math.PI * 2);
  return (time: number, screen: Size): Point => {
    const t = time * SPEED;
    return {
      x:
        screen.width *
        (0.5 +
          0.3 * Math.sin(t + phases[0]!) +
          0.12 * Math.sin(t * 2.3 + phases[1]!)),
      y:
        screen.height *
        (0.5 +
          0.3 * Math.sin(t * 0.77 + phases[2]!) +
          0.1 * Math.sin(t * 1.9 + phases[3]!)),
    };
  };
}

// Transform d'une lettre dont le centre (sans transform) est en letter.
export function lensTransform(
  letter: Point,
  lens: Point,
  screen: Size,
): string {
  const radius = RADIUS * Math.max(screen.width, screen.height);
  const dx = letter.x - lens.x;
  const dy = letter.y - lens.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return "";

  const edge = distance / radius; // 0 au centre, 1 au bord
  // 1 au centre, 0 au bord ; décroît lentement au début : une large zone reste bien déformée.
  const strength = 1 - edge * edge;
  const scale = 1 + (MAX_SCALE - 1) * strength;
  const push = BULGE * strength;
  const stretch = 1 + STRETCH * strength * edge;
  const angle = Math.atan2(dy, dx);

  // Étirement le long du rayon : on tourne dans l'axe du rayon, on étire en x, on revient.
  return `translate(${dx * push}px, ${dy * push}px) rotate(${angle}rad) scale(${scale * stretch}, ${scale}) rotate(${-angle}rad)`;
}
