<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import gsap from "gsap";
import { useUserStore } from "@/stores/user";
import { sendMessage } from "@/api/messages";
import type { Message, MessageMetadata } from "@/types/api";
import { moodColor } from "@/core/message-style/moods";
import {
  MIN_TENSION,
  PLAYER_RADIUS,
  ballRadius,
  clampToMap,
  slingshotPull,
  type Point,
  type Size,
} from "@/core/game/physics";
import { createWorld, dummyThrow, stepWorld, throwBall, type Catch } from "@/core/game/world";
import GameHud from "@/components/game/GameHud.vue";
import ReceivedMessage from "@/components/game/ReceivedMessage.vue";

const props = defineProps<{ channelId: number }>();
const userStore = useUserStore();

type Phase = "move" | "aim";

const world = reactive(createWorld(userStore.me?.username ?? "Moi"));
const { me } = world;

const svg = ref<SVGSVGElement>();
const pendingBallEl = ref<SVGCircleElement>();

const size = ref<Size>({ width: 1, height: 1 });
const phase = ref<Phase>("move");
const pending = ref<{ text: string; metadata: MessageMetadata } | null>(null);
const aim = ref<{ start: Point; current: Point } | null>(null);
const followingFinger = ref(false);
const touching = computed(() => followingFinger.value || aim.value !== null);
const received = ref<Message | null>(null);
const toast = ref("");

let toastTimer: number | undefined;

function toPx(point: Point): Point {
  return { x: point.x * size.value.width, y: point.y * size.value.height };
}

function pointerPx(event: PointerEvent): Point {
  const rect = svg.value!.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function showToast(text: string) {
  toast.value = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ""), 2500);
}

const pull = computed(() =>
  aim.value
    ? slingshotPull(aim.value.start, aim.value.current)
    : { offset: { x: 0, y: 0 }, tension: 0 },
);

const mePx = computed(() => toPx(me));
const pendingBallPx = computed(() => ({
  x: mePx.value.x + pull.value.offset.x,
  y: mePx.value.y + pull.value.offset.y,
}));

function onComposerSubmit(text: string, metadata: MessageMetadata) {
  pending.value = { text, metadata };
  phase.value = "aim";
}

function cancelMessage() {
  pending.value = null;
  aim.value = null;
  phase.value = "move";
}

function launch() {
  const { offset, tension } = pull.value;
  aim.value = null;
  if (!pending.value || tension < MIN_TENSION) return;

  const { text, metadata } = pending.value;
  throwBall(world, me, text, metadata, { x: -offset.x, y: -offset.y }, tension);
  sendMessage(props.channelId, text, metadata).catch(() => {
    showToast("Le message n'a pas pu être enregistré.");
  });

  pending.value = null;
  phase.value = "move";
}

function onCatch({ ball, catcher, thrower }: Catch) {
  if (catcher.id === me.id) {
    received.value = {
      content: ball.text,
      user: thrower?.name ?? "?",
      user_id: 0,
      creation_date: new Date().toISOString(),
      metadata: ball.metadata,
    };
  } else {
    showToast(`${catcher.name} a attrapé ${ball.throwerId === me.id ? "ton" : "un"} message`);
  }
}

function followFinger(event: PointerEvent) {
  const point = pointerPx(event);
  me.target = clampToMap(
    { x: point.x / size.value.width, y: point.y / size.value.height },
    PLAYER_RADIUS,
    size.value,
  );
}

function stopFollowing() {
  followingFinger.value = false;
  me.target = null;
}

function onPointerDown(event: PointerEvent) {
  if (phase.value === "move") {
    followingFinger.value = true;
    followFinger(event);
  } else {
    const point = pointerPx(event);
    aim.value = { start: point, current: point };
  }
  svg.value!.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (followingFinger.value) followFinger(event);
  if (aim.value) aim.value.current = pointerPx(event);
}

function onPointerUp() {
  if (followingFinger.value) stopFollowing();
  if (aim.value) launch();
}

function onPointerCancel() {
  if (followingFinger.value) stopFollowing();
  aim.value = null;
}

function tick(_time: number, deltaMs: number) {
  // Plafonné : après un changement d'onglet du navigateur, deltaMs peut valoir plusieurs secondes.
  const dt = Math.min(deltaMs / 1000, 0.05);
  stepWorld(world, dt, size.value).forEach(onCatch);
}

// Animation provisoire, remplacée en phase 2 par la séquence papier (froissage).
watch(phase, async (value) => {
  if (value !== "aim") return;
  await nextTick();
  gsap.from(pendingBallEl.value!, {
    attr: { r: ballRadius(pending.value!.text) * 4 },
    opacity: 0,
    duration: 0.4,
    ease: "back.out",
  });
});

let resizeObserver: ResizeObserver;

onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => {
    size.value = {
      width: entry!.contentRect.width,
      height: entry!.contentRect.height,
    };
  });
  resizeObserver.observe(svg.value!);
  gsap.ticker.add(tick);
});

onUnmounted(() => {
  resizeObserver.disconnect();
  gsap.ticker.remove(tick);
  clearTimeout(toastTimer);
});
</script>

<template>
  <div class="game">
    <svg
      ref="svg"
      class="map"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel">
      <circle
        v-if="me.target"
        class="target"
        :cx="me.target.x * size.width"
        :cy="me.target.y * size.height"
        r="4" />

      <g v-for="player in world.players" :key="player.id">
        <circle
          class="player"
          :class="{ me: player.id === me.id }"
          :cx="player.x * size.width"
          :cy="player.y * size.height"
          :r="PLAYER_RADIUS" />
        <text
          class="name"
          :x="player.x * size.width"
          :y="player.y * size.height + PLAYER_RADIUS + 14">
          {{ player.name }}
        </text>
      </g>

      <circle
        v-for="ball in world.balls"
        :key="ball.id"
        class="ball"
        :class="{ ground: ball.onGround }"
        :cx="ball.x * size.width"
        :cy="ball.y * size.height"
        :r="ballRadius(ball.text)"
        :style="{ fill: moodColor(ball.metadata) }" />

      <template v-if="phase === 'aim' && pending">
        <template v-if="aim">
          <line
            class="direction"
            :x1="mePx.x"
            :y1="mePx.y"
            :x2="mePx.x - pull.offset.x * 2"
            :y2="mePx.y - pull.offset.y * 2" />
          <line
            class="elastic"
            :x1="mePx.x"
            :y1="mePx.y"
            :x2="pendingBallPx.x"
            :y2="pendingBallPx.y" />
        </template>
        <circle
          ref="pendingBallEl"
          class="ball"
          :cx="pendingBallPx.x"
          :cy="pendingBallPx.y"
          :r="ballRadius(pending.text)"
          :style="{ fill: moodColor(pending.metadata) }" />
      </template>
    </svg>

    <GameHud
      :aiming="phase === 'aim'"
      :touching="touching"
      @submit="onComposerSubmit"
      @cancel="cancelMessage" />

    <button class="debug" @click="dummyThrow(world, size)">Dummy → moi</button>

    <p v-if="toast" class="toast">{{ toast }}</p>

    <ReceivedMessage v-if="received" :message="received" @close="received = null" />
  </div>
</template>

<style scoped>
.game {
  position: fixed;
  inset: 0;
  height: 100dvh;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
  user-select: none;
  -webkit-user-select: none;
  background: var(--background-color);
}

.map {
  display: block;
  width: 100%;
  height: 100%;
}

.player {
  fill: none;
  stroke: var(--text-color);
  stroke-width: 1.5;
}

.player.me {
  stroke: var(--primary-color);
  stroke-width: 3;
}

.name {
  font-size: 11px;
  text-anchor: middle;
  fill: var(--text-color);
  opacity: 0.7;
}

.target {
  fill: var(--primary-color);
}

.ball {
  stroke: var(--text-color);
}

.ball.ground {
  opacity: 0.6;
}

.elastic {
  stroke: var(--text-color);
  stroke-width: 2;
}

.direction {
  stroke: var(--text-color);
  opacity: 0.5;
  stroke-dasharray: 4 6;
}

.debug {
  position: absolute;
  right: 0.75rem;
  bottom: calc(4.5rem + env(safe-area-inset-bottom));
  opacity: 0.6;
}

.toast {
  position: absolute;
  top: 4rem;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  background: var(--text-color);
  color: var(--background-color);
  white-space: nowrap;
}
</style>
