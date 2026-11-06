<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from "vue";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import type { MessageMetadata } from "@/types/api";
import MessageComposer from "@/components/game/MessageComposer.vue";

gsap.registerPlugin(Flip);

const props = defineProps<{ aiming: boolean; touching: boolean }>();
const emit = defineEmits<{
  submit: [text: string, metadata: MessageMetadata];
  cancel: [];
}>();

// Délai avant le repli : un simple tap sur la map ne doit pas lancer l'animation.
const COLLAPSE_DELAY = 300; // ms

const hudEl = ref<HTMLElement>();
const collapsed = ref(false);
let collapseTimer: number;

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

// flush: "pre" : on mesure le HUD avant que Vue change sa classe et son contenu.
watch(
  collapsed,
  async () => {
    const state = Flip.getState(hudEl.value!);
    await nextTick();
    Flip.from(state, {
      duration: 0.35,
      ease: "power3.inOut",
      props: "backgroundColor,borderColor",
    });
    gsap.fromTo(hudEl.value!.children, { opacity: 0 }, { opacity: 1, duration: 0.2, delay: 0.15 });
  },
  { flush: "pre" },
);

onUnmounted(() => {
  clearTimeout(collapseTimer);
});
</script>

<template>
  <div ref="hudEl" class="hud" :class="{ collapsed }">
    <span v-show="collapsed" aria-hidden="true">•••</span>

    <!-- v-show et pas v-if : le texte en cours de saisie survit au repli du HUD. -->
    <MessageComposer
      v-if="!aiming"
      v-show="!collapsed"
      class="composer"
      @submit="(text, metadata) => emit('submit', text, metadata)" />

    <div v-else v-show="!collapsed" class="aim-hint">
      <p class="hint">Tire en arrière puis lâche pour lancer</p>
      <button @click="emit('cancel')">Annuler</button>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: calc(0.75rem + env(safe-area-inset-bottom));
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid transparent;
  border-radius: 2rem;
  background: transparent;
}

.hud.collapsed {
  left: auto;
  padding: 0.25rem 0.75rem;
  border-color: var(--text-color);
  background: var(--background-color);
  pointer-events: none;
}

.composer {
  flex: 1;
}

.hint {
  margin: 0;
  opacity: 0.7;
}

.aim-hint {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
