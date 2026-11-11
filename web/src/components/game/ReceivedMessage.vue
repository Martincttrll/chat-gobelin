<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from "vue";
import gsap from "gsap";
import type { Message } from "@/types/api";
import type { Point } from "@/core/game/physics";
import { MOODS } from "@/core/message-style/moods";
import { openingFrames } from "@/core/paper/openingFrames";
import StyledMessage from "@/components/StyledMessage.vue";

const props = defineProps<{ message: Message; origin: Point }>();
const emit = defineEmits<{ close: [] }>();

// Durée d'affichage de chaque image : ~8 images/s pour l'effet stop motion.
const FRAME_DURATION = 0.12; // s

const frames = openingFrames(props.origin, {
  width: window.innerWidth,
  height: window.innerHeight,
});
// -1 : rien d'affiché ; frames.length : plein écran.
const anim = reactive({ frame: -1 });
const opened = computed(() => anim.frame === frames.length);
const color = computed(
  () => MOODS[props.message.metadata?.mood ?? "neutral"].color ?? "var(--paper)",
);

// tl.set et pas tl.call : en lecture inverse, GSAP restaure la valeur précédente de frame.
const timeline = gsap.timeline({ paused: true, onReverseComplete: () => emit("close") });
for (let i = 0; i <= frames.length; i++) {
  timeline.set(anim, { frame: i }, i * FRAME_DURATION);
}

onMounted(() => timeline.play());
onUnmounted(() => timeline.kill());

function close() {
  if (!opened.value || timeline.reversed()) return;
  timeline.reverse();
}
</script>

<template>
  <!-- Dans body : .game est en position fixed (contexte d'empilement), la barre du haut passerait devant. -->
  <Teleport to="body">
    <div class="received" :style="{ '--color': color }" @click="close">
      <div class="glow">
        <div
          v-if="anim.frame >= 0"
          class="sheet"
          :style="{ clipPath: opened ? 'none' : frames[anim.frame] }" />
      </div>

      <div v-if="opened" class="content">
        <p>De <strong>{{ message.user }}</strong></p>
        <StyledMessage :message="message" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.received {
  position: fixed;
  inset: 0;
  z-index: 30;
}

/* Le filtre est sur le parent : sur l'élément clippé, clip-path couperait aussi la lueur. */
.glow {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 0 1.5rem var(--color));
}

.sheet {
  position: absolute;
  inset: 0;
  background: var(--color);
}

.content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--background-color);
}
</style>
