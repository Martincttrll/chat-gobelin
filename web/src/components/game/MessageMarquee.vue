<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import gsap from "gsap";
import type { Message, MessageMetadata } from "@/types/api";
import { MOODS } from "@/core/message-style/moods";
import {
  getLetterStyle,
  getMessageStyle,
  pauseToGap,
  typingIntensity,
} from "@/core/message-style/messageStyle";
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
    letterCount: letterIndex,
    scale: random(MIN_SCALE, MAX_SCALE),
    top: VERTICAL_MARGIN + (slots[i]! + Math.random()) * slotHeight,
  };
});

const root = ref<HTMLElement>();
let animation: gsap.Context | undefined;

onMounted(() => {
  const speedFactor = 1 - typingIntensity(metadata.typingSpeed) * FAST_TYPING_SPEEDUP;

  animation = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>(".track").forEach((track) => {
      gsap
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
    });

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

onUnmounted(() => animation?.revert());
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
              :style="getLetterStyle(mood, letter.index, line.letterCount)"
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
