<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
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
  <div ref="root" class="wheel grid-background">
    <div
      v-for="item in items"
      :key="item.mood"
      class="item"
      :class="{ active: item.mood === hovered }"
      :style="{
        left: `${item.x - offset.x}px`,
        top: `${item.y - offset.y}px`,
        '--color': MOODS[item.mood].color ?? 'var(--background-color)',
      }">
      <span class="dot" />
      <span v-if="item.mood === hovered" class="label">{{
        MOODS[item.mood].label
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.wheel {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
}

/* .item est animé par GSAP, qui écrit transform et scale en inline : le grossissement au survol
   est donc sur .dot, un enfant que GSAP ne touche pas. margin plutôt que translate(-50%) pour la même raison. */
.item {
  position: absolute;
  width: 48px;
  height: 48px;
  margin: -24px 0 0 -24px;
}

.dot {
  display: block;
  width: 100%;
  height: 100%;
  border: 1.5px solid var(--text-color);
  border-radius: 50%;
  background: var(--color);
  transition: scale 0.15s ease-out;
}

.active .dot {
  scale: 1.3;
}

.label {
  position: absolute;
  bottom: calc(100% + 0.4rem);
  left: 50%;
  translate: -50% 0;
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
