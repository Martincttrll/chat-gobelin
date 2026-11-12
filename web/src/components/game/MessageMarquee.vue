<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import gsap from "gsap";
import type { Message, MessageMetadata } from "@/types/api";
import { MOODS } from "@/core/message-style/moods";
import { getMessageStyle, pauseToGap, typingIntensity } from "@/core/message-style/messageStyle";
import { createLensPath, lensTransform } from "@/core/message-style/lens";
import { marqueeLines } from "@/core/message-style/marqueeLines";

const props = defineProps<{ message: Message }>();

// Valeurs provisoires.
const REPEAT = 6; // copies de la ligne dans la bande, pour que la boucle couvre toujours l'écran
const MIN_DURATION = 3; // s pour qu'une copie défile
const MAX_DURATION = 7; // s
const FAST_TYPING_SPEEDUP = 0.5; // frappe rapide : défilement jusqu'à 2× plus rapide
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.25;
const VERTICAL_MARGIN = 8; // % de la hauteur laissé libre en haut et en bas

const DEFAULT_METADATA: MessageMetadata = { mood: "neutral", typingSpeed: 0, pauses: [] };
const metadata = props.message.metadata ?? DEFAULT_METADATA;
const mood = MOODS[metadata.mood] ? metadata.mood : "neutral";
const copyStyle = getMessageStyle(mood, metadata.typingSpeed);
// Texte foncé sur les fonds clairs (papier, jaune).
const ink = mood === "neutral" || mood === "joy" ? "var(--background-color)" : "#fff";

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const wordLines = marqueeLines(props.message.content);
// Une tranche de hauteur par ligne, attribuée dans le désordre, avec une position au hasard dans
// la tranche : les lignes se chevauchent sans jamais laisser un grand trou.
const slots = gsap.utils.shuffle(wordLines.map((_, i) => i));
const slotHeight = (100 - VERTICAL_MARGIN * 2) / wordLines.length;

const lines = wordLines.map((words, i) => {
  let letterIndex = 0;
  const lineWords = words.map((word) => ({
    gap: pauseToGap(metadata.pauses[word.index]),
    letters: [...word.text].map((char) => ({ char, index: letterIndex++ })),
  }));
  return {
    words: lineWords,
    scale: random(MIN_SCALE, MAX_SCALE),
    top: VERTICAL_MARGIN + (slots[i]! + Math.random()) * slotHeight,
  };
});

const root = ref<HTMLElement>();
let animation: gsap.Context | undefined;
// Défilement de chaque ligne, pour le ralentir quand la ligne s'étire (Tristesse).
const scrolls = new Map<HTMLElement, gsap.core.Tween>();

// Loupe (Surprise) : position de chaque lettre dans sa bande, mesurée sans transform. À chaque
// image, on y ajoute la position de la bande (qui défile) pour savoir où la lettre est à l'écran.
let lensLetters: { el: HTMLElement; track: HTMLElement; x: number; y: number }[] = [];
const lensPath = createLensPath();

function measureLetters() {
  lensLetters.forEach(({ el }) => (el.style.transform = ""));
  lensLetters = [];
  root.value!.querySelectorAll<HTMLElement>(".track").forEach((track) => {
    const origin = track.getBoundingClientRect();
    track.querySelectorAll<HTMLElement>(".letter").forEach((el) => {
      const rect = el.getBoundingClientRect();
      lensLetters.push({
        el,
        track,
        x: rect.left + rect.width / 2 - origin.left,
        y: rect.top + rect.height / 2 - origin.top,
      });
    });
  });
}

function updateLens(time: number) {
  const screen = { width: window.innerWidth, height: window.innerHeight };
  const lens = lensPath(time, screen);
  // Toutes les lectures avant les écritures : un seul calcul de mise en page par image.
  const origins = new Map<HTMLElement, DOMRect>();
  for (const { track } of lensLetters) {
    if (!origins.has(track)) origins.set(track, track.getBoundingClientRect());
  }
  for (const { el, track, x, y } of lensLetters) {
    const origin = origins.get(track)!;
    el.style.transform = lensTransform({ x: origin.left + x, y: origin.top + y }, lens, screen);
  }
}

// Tristesse, tout en lenteur : chaque ligne entière monte et descend (sans vague dans la ligne),
// et une ligne sur deux, au hasard, s'étire en largeur puis revient.
const SWAY_MIN = 0.08; // em d'amplitude
const SWAY_MAX = 0.5; // em
const SWAY_MIN_DURATION = 2.5; // s pour un aller
const SWAY_MAX_DURATION = 5; // s
const STRETCHED_LINES = 0.5; // part des lignes qui s'étirent
const MAX_STRETCH = 1.8; // largeur max (× la largeur normale)

function sway() {
  gsap.utils.toArray<HTMLElement>(".line").forEach((line) => {
    const amplitude = random(SWAY_MIN, SWAY_MAX);
    gsap
      .fromTo(
        line,
        { y: `-${amplitude}em` },
        {
          y: `${amplitude}em`,
          duration: random(SWAY_MIN_DURATION, SWAY_MAX_DURATION),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        },
      )
      .progress(Math.random());

    if (Math.random() > STRETCHED_LINES) return;
    gsap.to(line, {
      scaleX: random(1.2, MAX_STRETCH),
      // Étirée depuis le milieu de l'écran (la ligne, elle, est bien plus large que l'écran).
      transformOrigin: "50vw 50%",
      duration: random(2, 3.5),
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      repeatDelay: random(1.5, 5),
      delay: random(0, 4),
      // scaleX étire aussi le trajet du défilement : on le ralentit d'autant pour garder la même vitesse.
      onUpdate: () => {
        scrolls.get(line)?.timeScale(1 / (gsap.getProperty(line, "scaleX") as number));
      },
    });
  });
}

onMounted(() => {
  const speedFactor = 1 - typingIntensity(metadata.typingSpeed) * FAST_TYPING_SPEEDUP;

  animation = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>(".track").forEach((track) => {
      const scroll = gsap
        .fromTo(
          track,
          { xPercent: -100 / REPEAT },
          {
            xPercent: 0,
            ease: "none",
            repeat: -1,
            duration: random(MIN_DURATION, MAX_DURATION) * speedFactor,
          },
        )
        .progress(Math.random());
      scrolls.set(track.parentElement!, scroll);
    });

    if (MOODS[mood].animation === "lens") {
      measureLetters();
      // Police chargée après coup : les lettres n'ont plus la même largeur.
      document.fonts.ready.then(() => root.value && measureLetters());
      gsap.ticker.add(updateLens);
    }

    if (MOODS[mood].animation === "sway") sway();

    if (MOODS[mood].animation === "shake") {
      // Tremblement : chaque lettre saute d'une petite position au hasard à une autre.
      gsap.to(".letter", {
        x: "random(-2, 2)",
        y: "random(-2, 2)",
        rotation: "random(-4, 4)",
        duration: 0.06,
        ease: "steps(1)",
        repeat: -1,
        repeatRefresh: true,
      });
    }

    if (MOODS[mood].animation === "dance") {
      gsap.to(".letter", {
        y: -6,
        duration: 0.3,
        ease: "sine.inOut",
        stagger: { each: 0.06, repeat: -1, yoyo: true },
      });
    }
  }, root.value);
});

onUnmounted(() => {
  gsap.ticker.remove(updateLens);
  animation?.revert();
});
</script>

<template>
  <div ref="root" class="marquee" :style="{ '--lines': lines.length, color: ink }">
    <div
      v-for="(line, l) in lines"
      :key="l"
      class="line"
      :style="{ fontSize: `${line.scale}em`, top: `${line.top}%` }">
      <!-- GSAP anime le transform de .track : le skew (vitesse de frappe) est donc sur .copy. -->
      <div class="track">
        <span v-for="copy in REPEAT" :key="copy" class="copy" :style="copyStyle">
          <span
            v-for="(word, w) in line.words"
            :key="w"
            class="word"
            :style="{ marginRight: word.gap }">
            <span
              v-for="letter in word.letters"
              :key="letter.index"
              class="letter"
              >{{ letter.char }}</span
            >
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Taille de base : grosse, mais réduite pour que toutes les lignes tiennent en hauteur. */
.marquee {
  position: absolute;
  inset: 0;
  overflow: hidden;
  font-size: min(5rem, calc(85dvh / var(--lines)));
  line-height: 1;
  pointer-events: none;
}

.line {
  position: absolute;
  left: 0;
  translate: 0 -50%;
}

.track {
  display: flex;
  width: max-content;
  white-space: nowrap;
}

.copy {
  display: inline-block;
  margin-right: 0.4em;
}

.word {
  display: inline-block;
  padding-right: 0.25em;
}

.letter {
  display: inline-block;
}
</style>
