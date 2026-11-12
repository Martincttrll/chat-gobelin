<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import gsap from "gsap";
import type { Mood } from "@/types/api";
import type { Point } from "@/core/game/physics";
import { MOODS } from "@/core/message-style/moods";
import type { WheelItem } from "@/core/message-style/moodWheel";

const props = defineProps<{
  origin: Point;
  items: WheelItem[];
  hovered: Mood | null;
}>();

const root = ref<HTMLElement>();
// Clavier ouvert sur mobile, le repère des éléments fixed ne coïncide plus avec celui de
// getBoundingClientRect (où sont mesurés le bouton et le doigt) : on mesure l'écart sur la roue.
const offset = ref<Point>({ x: 0, y: 0 });

// Le nom de l'humeur survolée : fixe, centré au-dessus de la plus haute pastille.
const LABEL_GAP = 60; // px au-dessus du centre de la plus haute pastille
const labelPosition = computed(() => ({
  left: `${props.origin.x - offset.value.x}px`,
  top: `${Math.min(...props.items.map((item) => item.y)) - offset.value.y - LABEL_GAP}px`,
}));

// Les humeurs sortent du bouton pour aller à leur place.
onMounted(async () => {
  const rect = root.value!.getBoundingClientRect();
  offset.value = { x: rect.left, y: rect.top };
  await nextTick();

  gsap.from(root.value!.querySelectorAll(".item"), {
    x: (i: number) => props.origin.x - props.items[i]!.x,
    y: (i: number) => props.origin.y - props.items[i]!.y,
    scale: 0,
    duration: 0.25,
    ease: "back.out(1.7)",
    stagger: 0.05,
  });
});
</script>

<template>
  <div ref="root" class="wheel">
    <div
      v-for="item in items"
      :key="item.mood"
      class="item"
      :class="{ active: item.mood === hovered }"
      :style="{
        left: `${item.x - offset.x}px`,
        top: `${item.y - offset.y}px`,
        '--color': MOODS[item.mood].color ?? 'var(--text-color)',
      }">
      <span class="dot" />
    </div>

    <span
      v-if="hovered"
      class="label"
      :style="{
        ...labelPosition,
        color: MOODS[hovered].color ?? 'var(--text-color)',
      }"
      >{{ MOODS[hovered].label }}</span
    >
  </div>
</template>

<style scoped>
.wheel {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  background: color-mix(in srgb, var(--background-color) 70%, transparent);
}

/* .item est animé par GSAP, qui écrit transform et scale en inline : le grossissement au survol
   est donc sur .dot, un enfant que GSAP ne touche pas. margin plutôt que translate(-50%) pour la même raison. */
.item {
  position: absolute;
  width: 36px;
  height: 36px;
  margin: -18px 0 0 -18px;
}

.dot {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--color);
  filter: url(#sketch-strong);
  transition: scale 0.15s ease-out;
}

.active .dot {
  scale: 2;
}

.label {
  position: absolute;
  translate: -50% -100%;
  font-size: 1.4rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
