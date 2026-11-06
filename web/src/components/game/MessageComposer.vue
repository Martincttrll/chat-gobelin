<script setup lang="ts">
import { ref } from "vue";
import type { MessageMetadata, Mood } from "@/types/api";
import { MOODS } from "@/message-style/moods";
import { createTypingTracker } from "@/message-style/typingSpeed";

const emit = defineEmits<{
  submit: [text: string, metadata: MessageMetadata];
}>();

const content = ref("");
const mood = ref<Mood>("neutral");
const typingTracker = createTypingTracker();

function submit() {
  emit("submit", content.value, { mood: mood.value, ...typingTracker.getResult() });
}
</script>

<template>
  <form class="composer" @submit.prevent="submit">
    <select v-model="mood">
      <option v-for="(style, key) in MOODS" :key="key" :value="key">{{ style.label }}</option>
    </select>
    <input
      v-model="content"
      placeholder="Écrire un message"
      required
      @input="typingTracker.onInput"
    />
    <button type="submit">Valider</button>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  gap: 0.5rem;
}

.composer input {
  flex: 1;
  min-width: 0;
}
</style>
