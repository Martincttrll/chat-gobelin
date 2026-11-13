<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from "vue";
import gsap from "gsap";
import type { Message } from "@/types/api";
import type { Point } from "@/core/game/physics";
import { MOODS } from "@/core/message-style/moods";
import { openingFrames } from "@/core/paper/openingFrames";
import MessageMarquee from "@/components/game/MessageMarquee.vue";

// passTo : le message est adressé à quelqu'un d'autre (écran « Oups » au lieu du contenu).
const props = defineProps<{ message: Message; origin: Point; passTo?: string }>();
const emit = defineEmits<{ close: []; resend: [] }>();

// Durée d'affichage de chaque image : ~8 images/s pour l'effet stop motion.
const FRAME_DURATION = 0.12; // s

const frames = openingFrames(props.origin, {
  width: window.innerWidth,
  height: window.innerHeight,
});
// -1 : rien d'affiché ; frames.length : plein écran.
const anim = reactive({ frame: -1 });
const opened = computed(() => anim.frame === frames.length);
const mood = props.message.metadata?.mood ?? "neutral";
const color = MOODS[mood].color ?? "var(--paper)";
const ink = mood === "neutral" || mood === "joy" ? "var(--background-color)" : "#fff";

const sentAt = new Date(props.message.posted_at).toLocaleTimeString("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

let resend = false;
// tl.set et pas tl.call : en lecture inverse, GSAP restaure la valeur précédente de frame.
const timeline = gsap.timeline({
  paused: true,
  onReverseComplete: () => (resend ? emit("resend") : emit("close")),
});
for (let i = 0; i <= frames.length; i++) {
  timeline.set(anim, { frame: i }, i * FRAME_DURATION);
}

onMounted(() => timeline.play());
onUnmounted(() => timeline.kill());

function close(andResend = false) {
  if (!opened.value || timeline.reversed()) return;
  resend = andResend;
  timeline.reverse();
}
</script>

<template>
  <!-- Dans body : .game est en position fixed (contexte d'empilement), la barre du haut passerait devant. -->
  <Teleport to="body">
    <div class="received" :style="{ '--color': color, color: ink }" @click="close()">
      <div class="glow">
        <div
          v-if="anim.frame >= 0"
          class="sheet"
          :style="{ clipPath: opened ? 'none' : frames[anim.frame] }" />
      </div>

      <p v-if="opened && !passTo" class="meta">{{ sentAt }} • {{ message.user }}</p>

      <div v-if="opened && passTo" class="wrong-target">
        <p>
          Oups, ce message n'était pas pour toi, fais une passe à
          <strong>@{{ passTo }}</strong> pour lui envoyer.
        </p>
        <button type="button" class="filled resend" @click.stop="close(true)">
          <img class="sketch-icon" src="@/assets/img/slingshot.svg" alt="" draggable="false" />
          Renvoyer
        </button>
      </div>
      <MessageMarquee v-else-if="opened" :message="message" />
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

.meta {
  position: absolute;
  top: calc(2rem + env(safe-area-inset-top));
  left: 2rem;
  z-index: 1;
  margin: 0;
  font-family: "Montserrat", system-ui, sans-serif;
  font-size: 0.9rem;
}

.wrong-target {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
}

.wrong-target p {
  margin: 0;
  font-size: 1.6rem;
  line-height: 1.35;
}

.resend {
  position: absolute;
  left: 50%;
  bottom: calc(3rem + env(safe-area-inset-bottom));
  translate: -50% 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.resend img {
  height: 1.5rem;
}

.sheet {
  position: absolute;
  inset: 0;
  background: var(--color);
}
</style>
