<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { Message } from "@/types/api";
import { useUserStore } from "@/stores/user";

const props = defineProps<{ messages: Message[] }>();
const emit = defineEmits<{ close: [] }>();
const userStore = useUserStore();

const panel = ref<HTMLElement>();
const list = ref<HTMLElement>();

// Distance de glissé vers le bas (px) au-delà de laquelle le panneau se ferme au relâchement.
const CLOSE_DISTANCE = 100;

const dragY = ref(0);
const dragging = ref(false);
let dragStart = 0;

function onDragStart(event: PointerEvent) {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  dragging.value = true;
  dragStart = event.clientY;
}

function onDragMove(event: PointerEvent) {
  if (!dragging.value) return;
  dragY.value = Math.max(0, event.clientY - dragStart);
}

function onDragEnd() {
  if (!dragging.value) return;
  dragging.value = false;
  if (dragY.value > CLOSE_DISTANCE) {
    // Le style inline l'emporte sur la classe de sortie du <Transition> : on finit le glissé nous-mêmes.
    dragY.value = panel.value!.offsetHeight;
    emit("close");
  } else {
    dragY.value = 0;
  }
}

// Marge en px : on considère qu'on est « en bas » même à quelques pixels près.
const BOTTOM_THRESHOLD = 40;

function isAtBottom() {
  const el = list.value!;
  return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
}

function scrollToBottom() {
  list.value!.scrollTop = list.value!.scrollHeight;
}

onMounted(scrollToBottom);

// flush: "pre" : on mesure la position avant que les nouveaux messages soient ajoutés au DOM.
watch(
  () => props.messages,
  async () => {
    if (!isAtBottom()) return;
    await nextTick();
    scrollToBottom();
  },
  { flush: "pre" },
);
</script>

<template>
  <div class="conversation">
    <div class="backdrop" @click="emit('close')" />

    <aside
      ref="panel"
      class="panel"
      :class="{ dragging }"
      :style="{ transform: dragY ? `translateY(${dragY}px)` : undefined }">
      <div
        class="grab"
        @pointerdown="onDragStart"
        @pointermove="onDragMove"
        @pointerup="onDragEnd"
        @pointercancel="onDragEnd">
        <span class="handle" aria-hidden="true" />
      </div>

      <ul ref="list" class="messages">
        <li v-if="messages.length === 0">Aucun message pour l'instant.</li>
        <li
          v-for="message in messages"
          :key="message.id"
          :class="{ mine: message.user_id === userStore.me?.id }">
          <span class="author">{{ message.user }}</span>
          <p class="sketch bubble">{{ message.content }}</p>
        </li>
      </ul>
    </aside>
  </div>
</template>

<style scoped>
/* Classes posées par le <Transition name="conversation"> de ChannelView. */
.conversation-enter-active .backdrop,
.conversation-leave-active .backdrop {
  transition: opacity 0.3s ease;
}

.conversation-enter-active .panel {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.conversation-leave-active .panel {
  transition: transform 0.2s ease-in;
}

.conversation-enter-from .backdrop,
.conversation-leave-to .backdrop {
  opacity: 0;
}

.conversation-enter-from .panel,
.conversation-leave-to .panel {
  transform: translateY(100%);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgb(0 0 0 / 0.5);
}

.panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 21;
  height: 90dvh;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  border-bottom: none;
  border-radius: 1.25rem 1.25rem 0 0;
  background: var(--background-color);
  transition: transform 0.2s ease-out;
}

.panel.dragging {
  transition: none;
}

/* Zone tactile plus grande que la poignée visible. */
.grab {
  display: flex;
  justify-content: center;
  padding: 0.75rem 0;
  touch-action: none;
  cursor: grab;
}

.handle {
  align-self: center;
  width: 2.5rem;
  height: 4px;
  border-radius: 2px;
  background: var(--text-color);
  opacity: 0.4;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
}

h2 {
  margin: 0;
  font-size: 1.1rem;
}

.messages {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  margin: 0;
  padding: 1rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.messages li {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.messages li.mine {
  align-items: flex-end;
}

.author {
  padding: 0 1rem;
  font-size: 0.75rem;
  opacity: 0.6;
}

.bubble {
  --sketch-background: var(--bubble);
  --sketch-border: var(--bubble);
  max-width: 80%;
  margin: 0 0 0.75rem;
  font-family: "Montserrat", system-ui, sans-serif;
  padding: 0.9rem 1.5rem;
  border-radius: 1.75rem;
  overflow-wrap: anywhere;
}

/* Queue en triangle de bordures et pas en clip-path : clip-path couperait le contour crayonné du filtre. */
.bubble::after {
  content: "";
  position: absolute;
  top: calc(100% - 2px);
  left: 1.5rem;
  z-index: -1;
  border-top: 1rem solid var(--bubble);
  border-right: 2rem solid transparent;
  filter: url(#sketch);
}

.mine .bubble::after {
  left: auto;
  right: 1.5rem;
  border-right: none;
  border-left: 2rem solid transparent;
}
</style>
