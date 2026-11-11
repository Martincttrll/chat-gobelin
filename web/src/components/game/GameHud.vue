<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import type { MessageMetadata, Mood } from "@/types/api";
import MessageComposer from "@/components/game/MessageComposer.vue";
import MoodPicker from "@/components/game/MoodPicker.vue";

const props = defineProps<{ aiming: boolean; touching: boolean; mood: Mood }>();
const emit = defineEmits<{
  submit: [text: string, metadata: MessageMetadata];
  mood: [mood: Mood];
}>();

// Délai avant le repli : un simple tap sur la map ne doit pas lancer l'animation.
const COLLAPSE_DELAY = 300; // ms

const collapsed = ref(false);
let collapseTimer: ReturnType<typeof setTimeout>;

watch(
  () => props.touching,
  (touching) => {
    clearTimeout(collapseTimer);
    if (touching) {
      collapseTimer = setTimeout(() => (collapsed.value = true), COLLAPSE_DELAY);
    } else {
      collapsed.value = false;
    }
  },
);

onUnmounted(() => {
  clearTimeout(collapseTimer);
});
</script>

<template>
  <div class="hud" :class="{ collapsed }">
    <MessageComposer
      v-if="!aiming"
      class="composer"
      :collapsed="collapsed"
      @submit="(text, metadata) => emit('submit', text, metadata)" />

    <MoodPicker v-else :mood="mood" :compact="collapsed" @pick="emit('mood', $event)" />
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: calc(0.75rem + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
}

.hud.collapsed {
  pointer-events: none;
}

.composer {
  flex: 1;
}
</style>
