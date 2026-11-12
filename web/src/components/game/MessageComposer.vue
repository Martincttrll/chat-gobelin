<script setup lang="ts">
import { computed, ref } from "vue";
import type { MessageMetadata } from "@/types/api";
import { createTypingTracker } from "@/core/message-style/typingSpeed";
import { detectMood } from "@/core/emotions/emotionClient";
import {
  completeMention,
  findRecipient,
  mentionQuery,
  stripMentions,
  suggestMembers,
  type Member,
} from "@/core/mentions/mentions";

const props = defineProps<{ collapsed: boolean; members: Member[] }>();
const emit = defineEmits<{
  submit: [text: string, metadata: MessageMetadata];
}>();

const content = ref("");
const analysing = ref(false);
const typingTracker = createTypingTracker();
const input = ref<HTMLInputElement>();

const suggestions = computed(() => {
  const query = mentionQuery(content.value);
  return query === null ? [] : suggestMembers(props.members, query);
});

function pickMember(member: Member) {
  content.value = completeMention(content.value, member.name);
  input.value?.focus();
}

async function submit() {
  if (analysing.value) return;
  analysing.value = true;
  const text = stripMentions(content.value);
  const mood = text ? await detectMood(text) : "neutral";
  analysing.value = false;

  const recipient = findRecipient(content.value, props.members);
  emit("submit", content.value, {
    mood,
    ...typingTracker.getResult(),
    ...(recipient && { to: recipient }),
  });
}
</script>

<template>
  <form class="composer" :class="{ collapsed }" @submit.prevent="submit">
    <ul v-if="suggestions.length && !collapsed" class="suggestions">
      <li v-for="member in suggestions" :key="member.userId">
        <!-- mousedown.prevent : l'input garde le focus, le clavier mobile ne se ferme pas. -->
        <button
          type="button"
          class="plain"
          @mousedown.prevent
          @click="pickMember(member)">
          @{{ member.name }}
        </button>
      </li>
    </ul>

    <span class="field message" data-onboarding="input" :inert="collapsed">
      <input
        ref="input"
        v-model="content"
        placeholder="Écrire un message"
        required
        @input="typingTracker.onInput" />
    </span>
    <button type="submit" data-onboarding="send" :disabled="analysing" @mousedown.prevent>
      <img
        class="sketch-icon"
        src="@/assets/img/slingshot-white.svg"
        alt="Envoyer le message"
        draggable="false" />
    </button>
  </form>
</template>

<style scoped>
.composer {
  position: relative;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  transition: gap 0.35s ease;
}

.message,
button[type="submit"] {
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
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

.message input {
  font-family: "Montserrat", system-ui, sans-serif;
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

.suggestions {
  position: absolute;
  left: 0;
  bottom: calc(100% + 0.5rem);
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.suggestions button {
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  background: var(--bubble);
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
