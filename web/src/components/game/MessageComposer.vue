<script setup lang="ts">
import { ref } from "vue";
import type { MessageMetadata } from "@/types/api";
import { createTypingTracker } from "@/core/message-style/typingSpeed";
import { detectMood } from "@/core/emotions/emotionClient";

defineProps<{ collapsed: boolean }>();
const emit = defineEmits<{
  submit: [text: string, metadata: MessageMetadata];
}>();

const content = ref("");
const analysing = ref(false);
const typingTracker = createTypingTracker();

async function submit() {
  if (analysing.value) return;
  analysing.value = true;
  const mood = await detectMood(content.value);
  analysing.value = false;

  emit("submit", content.value, {
    mood,
    ...typingTracker.getResult(),
  });
}
</script>

<template>
  <form class="composer" :class="{ collapsed }" @submit.prevent="submit">
    <span class="field message" :inert="collapsed">
      <input
        v-model="content"
        placeholder="Écrire un message"
        required
        @input="typingTracker.onInput" />
    </span>
    <button type="submit" :disabled="analysing" @mousedown.prevent>
      <img src="@/assets/img/slingshot-white.svg" alt="Envoyer le message" draggable="false" />
    </button>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  transition: gap 0.35s ease;
}

/* overflow: hidden pour que le padding de l'input ne l'empêche pas de se réduire à 0. */
.message {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  transition:
    flex-grow 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.2s ease 0.15s;
}

.composer.collapsed {
  gap: 0;
}

.collapsed .message {
  flex-grow: 0;
  opacity: 0;
  transition:
    flex-grow 0.35s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.2s ease;
}

button[type="submit"] {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  aspect-ratio: 1;
  user-select: none;
}

button[type="submit"]:disabled {
  opacity: 0.5;
}
</style>
