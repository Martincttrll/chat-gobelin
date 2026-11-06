<script setup lang="ts">
import { onMounted, ref } from "vue";
import gsap from "gsap";
import type { Message } from "@/types/api";
import StyledMessage from "@/components/StyledMessage.vue";

defineProps<{ message: Message }>();
const emit = defineEmits<{ close: [] }>();

const card = ref<HTMLElement>();

// Animation provisoire, remplacée en phase 2 par la séquence papier (dépliage).
onMounted(() => {
  gsap.from(card.value!, { scale: 0, rotation: -120, duration: 0.5, ease: "back.out" });
});
</script>

<template>
  <div class="received" @click="emit('close')">
    <div ref="card" class="card">
      <p>
        De <strong>{{ message.user }}</strong>
      </p>
      <StyledMessage :message="message" />
      <small>Toucher pour fermer</small>
    </div>
  </div>
</template>

<style scoped>
.received {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 0.6);
}

.card {
  max-width: 90%;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid var(--text-color);
  background: var(--background-color);
}
</style>
