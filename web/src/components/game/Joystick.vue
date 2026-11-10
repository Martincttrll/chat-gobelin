<script setup lang="ts">
import type { Point } from "@/core/game/physics";
import { STICK_RADIUS } from "@/core/game/joystick";

defineProps<{ origin: Point; tilt: Point }>();
</script>

<template>
  <div class="joystick" :style="{ left: `${origin.x}px`, top: `${origin.y}px` }">
    <div
      class="knob"
      :style="{
        transform: `translate(${tilt.x * STICK_RADIUS}px, ${tilt.y * STICK_RADIUS}px)`,
      }" />
  </div>
</template>

<style scoped>
.joystick {
  position: absolute;
  display: grid;
  place-items: center;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border: 1px solid var(--text-color);
  border-radius: 50%;
  background: color-mix(in srgb, var(--background-color) 70%, transparent);
  pointer-events: none;
  animation: appear 0.15s ease-out;
}

.knob {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--text-color);
}

@keyframes appear {
  from {
    opacity: 0;
    scale: 0.6;
  }
}
</style>
