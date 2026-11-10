<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { Message } from "@/types/api";
import StyledMessage from "@/components/StyledMessage.vue";

const props = defineProps<{ messages: Message[] }>();
const emit = defineEmits<{ close: [] }>();

const list = ref<HTMLElement>();

// Marge en px : on considère qu'on est « en bas » même à quelques pixels près.
const BOTTOM_THRESHOLD = 40;

function isAtBottom() {
  const el = list.value!;
  return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
}

function scrollToBottom() {
  list.value!.scrollTop = list.value!.scrollHeight;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

    <aside class="panel">
      <span class="handle" aria-hidden="true" />
      <header>
        <h2>Discussion</h2>
        <button class="plain" @click="emit('close')">✕</button>
      </header>

      <ul ref="list" class="messages">
        <li v-if="messages.length === 0">Aucun message pour l'instant.</li>
        <li v-for="message in messages" :key="message.id">
          <small>{{ formatTime(message.creation_date) }}</small>
          <strong>{{ message.user }}</strong>
          <StyledMessage :message="message" />
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
  border: 1px solid var(--text-color);
  border-bottom: none;
  border-radius: 1.25rem 1.25rem 0 0;
  background: var(--background-color);
}

.handle {
  align-self: center;
  width: 2.5rem;
  height: 4px;
  margin-top: 0.5rem;
  border-radius: 2px;
  background: var(--text-color);
  opacity: 0.4;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--text-color);
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
  gap: 0.75rem;
}

.messages li {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.messages small {
  opacity: 0.6;
}
</style>
