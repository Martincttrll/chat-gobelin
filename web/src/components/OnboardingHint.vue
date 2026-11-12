<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

// target : sélecteur de l'élément mis en avant (attribut data-onboarding). Sans cible trouvée,
// seul le texte s'affiche. Rien ne capte le toucher : on fait l'action à travers le calque.
const props = defineProps<{ target?: string; text: string; shape?: "circle" | "pill" }>();

const PADDING = 10; // px autour de la cible
const ARROW = 44; // px de hauteur de la flèche

const rect = ref<DOMRect | null>(null);
const screen = ref({ width: window.innerWidth, height: window.innerHeight });
// Caché pendant qu'on touche l'écran : on voit ce qu'on fait (joystick, déplacement).
const pressed = ref(false);
let frame = 0;

// La cible peut bouger (personnage, clavier qui s'ouvre) : on la remesure à chaque image.
function measure() {
  const el = props.target ? document.querySelector(`[data-onboarding="${props.target}"]`) : null;
  rect.value = el?.getBoundingClientRect() ?? null;
  screen.value = { width: window.innerWidth, height: window.innerHeight };
  frame = requestAnimationFrame(measure);
}

const ring = computed(() => {
  const r = rect.value;
  if (!r) return null;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const width = props.shape === "circle" ? Math.max(r.width, r.height) : r.width;
  const height = props.shape === "circle" ? width : r.height;
  return {
    cx,
    left: cx - width / 2 - PADDING,
    top: cy - height / 2 - PADDING,
    width: width + PADDING * 2,
    height: height + PADDING * 2,
  };
});

// Texte au-dessus de la cible avec une flèche (cible dans la moitié basse), sinon en dessous.
const above = computed(() => !ring.value || ring.value.top > screen.value.height / 2);

const align = computed(() => {
  if (!ring.value) return "center";
  const x = ring.value.cx / screen.value.width;
  return x > 0.66 ? "right" : x < 0.33 ? "left" : "center";
});

const hintStyle = computed(() => {
  const r = ring.value;
  if (!r) return { top: "60%" };
  return above.value
    ? { bottom: `${screen.value.height - r.top + 8}px` }
    : { top: `${r.top + r.height + 16}px` };
});

function press() {
  pressed.value = true;
}
function release() {
  pressed.value = false;
}

onMounted(() => {
  measure();
  window.addEventListener("pointerdown", press, true);
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
});

onUnmounted(() => {
  cancelAnimationFrame(frame);
  window.removeEventListener("pointerdown", press, true);
  window.removeEventListener("pointerup", release, true);
  window.removeEventListener("pointercancel", release, true);
});
</script>

<template>
  <Teleport to="body">
    <div class="onboarding" :class="{ hidden: pressed }">
      <div
        v-if="ring"
        class="ring"
        :style="{
          left: `${ring.left}px`,
          top: `${ring.top}px`,
          width: `${ring.width}px`,
          height: `${ring.height}px`,
        }" />
      <div v-else class="dim" />

      <div class="hint" :style="[hintStyle, { textAlign: align }]">
        <p>{{ text }}</p>
        <svg
          v-if="ring && above"
          class="arrow"
          :style="{ left: `${ring.cx - 16 - 12}px` }"
          width="24"
          :height="ARROW"
          :viewBox="`0 0 24 ${ARROW}`">
          <path :d="`M12 2 C 11 ${ARROW / 2}, 13 ${ARROW / 2}, 12 ${ARROW - 3} M4 ${ARROW - 11} L12 ${ARROW - 3} L20 ${ARROW - 11}`" />
        </svg>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.onboarding {
  position: fixed;
  inset: 0;
  z-index: 25;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.onboarding.hidden {
  opacity: 0;
}

/* Le trou dans le voile : une ombre immense autour de l'anneau assombrit tout le reste. */
.ring {
  position: absolute;
  border: 3px solid var(--purple);
  border-radius: 999px;
  box-shadow:
    0 0 1.25rem 0.25rem var(--purple),
    0 0 0 200vmax rgb(0 0 0 / 0.65);
}

.dim {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 0.65);
}

.hint {
  position: absolute;
  left: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  font-family: "Montserrat", system-ui, sans-serif;
  font-size: 0.85rem;
}

.hint p {
  margin: 0 0 0.5rem;
}

.arrow {
  position: relative;
  align-self: flex-start;
  fill: none;
  stroke: var(--text-color);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: url(#sketch);
}
</style>
