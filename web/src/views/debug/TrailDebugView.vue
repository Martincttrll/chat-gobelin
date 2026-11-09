<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import gsap from "gsap";
import TrailScene from "@/core/trail/TrailScene";
import type Trail from "@/core/trail/Trail";

const canvas = ref<HTMLCanvasElement>();
const auto = ref(false);

// Pas de ref() : Vue envelopperait les objets Three dans des proxys réactifs.
let trailScene: TrailScene | undefined;
let drawing: Trail | undefined;
let autoTrail: Trail | undefined;
let nextId = 0;
let resizeObserver: ResizeObserver;

function pointerPx(event: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function onPointerDown(event: PointerEvent) {
  drawing = trailScene?.createTrail(nextId++);
  drawing?.addPoint(pointerPx(event), gsap.ticker.time);
  canvas.value!.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  drawing?.addPoint(pointerPx(event), gsap.ticker.time);
}

function onPointerUp() {
  drawing = undefined;
}

// Trajectoire en boucle (courbe de Lissajous) : une nouvelle traînée toutes les 3 s.
const AUTO_DURATION = 3; // s
let autoStart = 0;

function tickAuto(time: number) {
  if (!auto.value || !trailScene) return;

  if (!autoTrail || time - autoStart > AUTO_DURATION) {
    autoTrail = trailScene.createTrail(nextId++);
    autoStart = time;
  }

  const rect = canvas.value!.getBoundingClientRect();
  const t = time - autoStart;
  autoTrail.addPoint(
    {
      x: rect.width * (0.5 + 0.35 * Math.sin(t * 2.1)),
      y: rect.height * (0.5 + 0.35 * Math.sin(t * 1.3)),
    },
    time,
  );
}

function tick(time: number) {
  tickAuto(time);
  trailScene?.update();
}

onMounted(() => {
  trailScene = new TrailScene(canvas.value!);
  trailScene.init();

  resizeObserver = new ResizeObserver(([entry]) => {
    trailScene?.resize({ width: entry!.contentRect.width, height: entry!.contentRect.height });
  });
  resizeObserver.observe(canvas.value!);
  gsap.ticker.add(tick);
});

onUnmounted(() => {
  resizeObserver.disconnect();
  gsap.ticker.remove(tick);
  trailScene?.dispose();
});
</script>

<template>
  <div class="debug">
    <canvas
      ref="canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp" />

    <div class="controls">
      <RouterLink :to="{ name: 'home' }">←</RouterLink>
      <label><input v-model="auto" type="checkbox" /> Auto</label>
      <span>Dessine au doigt / à la souris</span>
    </div>
  </div>
</template>

<style scoped>
.debug {
  position: fixed;
  inset: 0;
  touch-action: none;
  user-select: none;
  background: var(--background-color);
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.controls {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.controls span {
  opacity: 0.6;
}
</style>
