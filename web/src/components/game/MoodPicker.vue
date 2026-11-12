<script setup lang="ts">
import { ref } from "vue";
import type { Mood } from "@/types/api";
import type { Point } from "@/core/game/physics";
import { MOODS } from "@/core/message-style/moods";
import { pickMood, wheelItems, type WheelItem } from "@/core/message-style/moodWheel";
import MoodWheel from "@/components/game/MoodWheel.vue";

defineProps<{ mood: Mood; compact: boolean }>();
const emit = defineEmits<{ pick: [mood: Mood] }>();

const wheel = ref<{ origin: Point; items: WheelItem[]; hovered: Mood | null } | null>(null);

function onPressStart(event: PointerEvent) {
  const button = event.currentTarget as HTMLButtonElement;
  button.setPointerCapture(event.pointerId);

  const rect = button.getBoundingClientRect();
  const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  wheel.value = { origin, items: wheelItems(origin), hovered: null };
  navigator.vibrate?.(10);
}

function onPressMove(event: PointerEvent) {
  if (!wheel.value) return;
  const { items, origin } = wheel.value;
  wheel.value.hovered = pickMood(items, origin, { x: event.clientX, y: event.clientY });
}

function onPressEnd() {
  if (wheel.value?.hovered) emit("pick", wheel.value.hovered);
  wheel.value = null;
}
</script>

<template>
  <button
    type="button"
    class="mood-picker"
    data-onboarding="mood"
    :class="{ compact }"
    :style="{ '--color': MOODS[mood].color ?? 'var(--text-color)' }"
    @pointerdown="onPressStart"
    @pointermove="onPressMove"
    @pointerup="onPressEnd"
    @pointercancel="wheel = null"
    @contextmenu.prevent>
    <span class="dot" />
    <span class="label">{{ MOODS[mood].label }}</span>
  </button>

  <!-- Dans body : un ancêtre avec transform ou filter casserait le position: fixed de la roue. -->
  <Teleport to="body">
    <MoodWheel
      v-if="wheel"
      :origin="wheel.origin"
      :items="wheel.items"
      :hovered="wheel.hovered" />
  </Teleport>
</template>

<style scoped>
.mood-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 3rem;
  padding: 0 1.25rem;
  transition:
    gap 0.3s ease,
    padding 0.3s cubic-bezier(0.65, 0, 0.35, 1);
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
}

.dot {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: var(--color);
  filter: url(#sketch-strong);
}
.label {
  max-width: 8rem;
  overflow: hidden;
  white-space: nowrap;
  transition:
    max-width 0.3s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.2s ease;
}

/* Largeur = rond (1rem) + 2 × 1rem = hauteur : la pill devient un cercle. */
.compact {
  gap: 0;
  padding: 0 1rem;
}

.compact .label {
  max-width: 0;
  opacity: 0;
}
</style>
