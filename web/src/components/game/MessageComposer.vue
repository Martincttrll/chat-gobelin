<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import type { MessageMetadata, Mood } from "@/types/api";
import type { Point } from "@/core/game/physics";
import { MOODS } from "@/core/message-style/moods";
import { createTypingTracker } from "@/core/message-style/typingSpeed";
import { pickMood, wheelItems, type WheelItem } from "@/core/message-style/moodWheel";
import MoodWheel from "@/components/game/MoodWheel.vue";

const emit = defineEmits<{
  submit: [text: string, metadata: MessageMetadata];
}>();

const LONG_PRESS = 400; // ms

const content = ref("");
const mood = ref<Mood>("neutral");
const typingTracker = createTypingTracker();
const wheel = ref<{ origin: Point; items: WheelItem[]; hovered: Mood | null } | null>(null);

let pressTimer: number | undefined;
let longPressed = false;

function submit() {
  emit("submit", content.value, {
    mood: mood.value,
    ...typingTracker.getResult(),
  });
}

function onPressStart(event: PointerEvent) {
  const button = event.currentTarget as HTMLButtonElement;
  button.setPointerCapture(event.pointerId);
  longPressed = false;

  pressTimer = setTimeout(() => {
    longPressed = true;
    const rect = button.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    wheel.value = { origin, items: wheelItems(origin), hovered: null };
    navigator.vibrate?.(10);
  }, LONG_PRESS);
}

function onPressMove(event: PointerEvent) {
  if (!wheel.value) return;
  const { items, origin } = wheel.value;
  wheel.value.hovered = pickMood(items, origin, { x: event.clientX, y: event.clientY });
}

function onPressEnd() {
  clearTimeout(pressTimer);
  if (wheel.value?.hovered) mood.value = wheel.value.hovered;
  wheel.value = null;
}

function onPressCancel() {
  clearTimeout(pressTimer);
  wheel.value = null;
}

// Le clic qui suit un longpress ne doit pas envoyer le message.
function onClick(event: MouseEvent) {
  if (!longPressed) return;
  event.preventDefault();
  longPressed = false;
}

onUnmounted(() => clearTimeout(pressTimer));
</script>

<template>
  <form class="composer" @submit.prevent="submit">
    <span
      class="field message"
      :class="{ glowing: MOODS[mood].color }"
      :style="{ '--glow': MOODS[mood].color ?? undefined }">
      <input
        v-model="content"
        placeholder="Écrire un message"
        required
        @input="typingTracker.onInput" />
    </span>
    <button
      type="submit"
      @pointerdown="onPressStart"
      @mousedown.prevent
      @pointermove="onPressMove"
      @pointerup="onPressEnd"
      @pointercancel="onPressCancel"
      @click="onClick"
      @contextmenu.prevent>
      <img src="@/assets/img/slingshot-white.svg" alt="Envoyer le message" draggable="false" />
    </button>

    <!-- Hors du HUD : ses transforms (Flip) casseraient le position: fixed de la roue. -->
    <Teleport to="body">
      <MoodWheel
        v-if="wheel"
        :origin="wheel.origin"
        :items="wheel.items"
        :hovered="wheel.hovered" />
    </Teleport>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  gap: 0.5rem;
}

.message {
  flex: 1;
  min-width: 0;
  transition: box-shadow 0.3s ease;
}

.message.glowing {
  --sketch-border: var(--glow);
  box-shadow: 0 0 1.25rem 0.1rem var(--glow);
}

button[type="submit"] {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  aspect-ratio: 1;
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
}
</style>
