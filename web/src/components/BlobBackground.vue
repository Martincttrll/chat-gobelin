<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import gsap from "gsap";
import { cycleColor } from "@/core/utils/colorCycle";

withDefaults(defineProps<{ placement?: "top" | "center" }>(), {
  placement: "top",
});

const root = ref<HTMLElement>();
let ctx: gsap.Context | undefined;

function randomShape() {
  const r = () => `${gsap.utils.random(30, 70, 1)}%`;
  return `${r()} ${r()} ${r()} ${r()} / ${r()} ${r()} ${r()} ${r()}`;
}

function wander(blob: HTMLElement) {
  gsap.to(blob, {
    x: gsap.utils.random(-60, 60),
    y: gsap.utils.random(-40, 40),
    rotation: gsap.utils.random(-30, 30),
    scale: gsap.utils.random(0.85, 1.15),
    borderRadius: randomShape(),
    duration: gsap.utils.random(5, 8),
    ease: "sine.inOut",
    onComplete: () => wander(blob),
  });
}

const COLOR_OFFSET = 3; // s

let blobs: HTMLElement[] = [];

function paint() {
  const now = Date.now() / 1000;
  blobs.forEach((blob, i) => {
    blob.style.backgroundColor = cycleColor(now + i * COLOR_OFFSET);
  });
}

onMounted(() => {
  blobs = gsap.utils.toArray<HTMLElement>(".blob", root.value);
  paint();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  gsap.ticker.add(paint);
  // gsap.context : tous les tweens créés ici sont annulés d'un coup au démontage.
  ctx = gsap.context(() => {
    blobs.forEach((blob) => {
      blob.style.borderRadius = randomShape();
      wander(blob);
    });
  }, root.value);
});

onUnmounted(() => {
  gsap.ticker.remove(paint);
  ctx?.revert();
});
</script>

<template>
  <div ref="root" class="blobs" :class="placement" aria-hidden="true">
    <div class="blob one" />
    <div class="blob two" />
  </div>
</template>

<style scoped>
.blobs {
  position: fixed;
  left: 0;
  right: 0;
  z-index: -1;
  height: 60vh;
  overflow: hidden;
  pointer-events: none;
  filter: blur(55px);
}

/* Remontés de la moitié de leur hauteur (60vh) : seul le bas des blobs dépasse en haut de l'écran. */
.blobs.top {
  top: -35vh;
}

.blobs.center {
  top: 20vh;
}

.blob {
  position: absolute;
  opacity: 0.55;
  will-change: transform;
}

.one {
  top: 15%;
  left: -10%;
  width: 75vw;
  height: 30vh;
  background: #3900ff;
}

.two {
  top: 35%;
  right: -15%;
  width: 60vw;
  height: 25vh;
  background: #7d7979;
}
</style>
