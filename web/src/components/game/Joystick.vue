<script setup lang="ts">
import type { Point } from "@/core/game/physics";
import { STICK_RADIUS } from "@/core/game/joystick";

defineProps<{ origin: Point; tilt: Point }>();
</script>

<template>
  <div class="joystick sketch" :style="{ left: `${origin.x}px`, top: `${origin.y}px` }">
    <img
      class="knob"
      src="@/assets/img/joystick.svg"
      alt=""
      draggable="false"
      :style="{
        transform: `translate(${tilt.x * STICK_RADIUS}px, ${tilt.y * STICK_RADIUS}px)`,
      }" />
  </div>
</template>

<style scoped>
/* Même cercle crayonné que les photos de channel (.sketch : contour filtré sur un ::before). */
.joystick {
  --sketch-background: color-mix(in srgb, var(--background-color) 70%, transparent);
  position: absolute;
  display: grid;
  place-items: center;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  pointer-events: none;
  animation: appear 0.15s ease-out;
}

/* Ombre et tremblé refaits ici : ceux de l'export Figma pixelisent dans un <img> sur Safari. */
.knob {
  width: 60px;
  height: 60px;
  filter: url(#sketch) drop-shadow(3px 4px 4px rgb(42 37 58 / 0.58));
}

@keyframes appear {
  from {
    opacity: 0;
    scale: 0.6;
  }
}
</style>
