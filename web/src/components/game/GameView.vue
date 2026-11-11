<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from "vue";
import gsap from "gsap";
import { useUserStore } from "@/stores/user";
import { sendMessage } from "@/api/messages";
import type { Message, MessageMetadata, Mood } from "@/types/api";
import { moodColor } from "@/core/message-style/moods";
import {
  MAX_PULL,
  MIN_TENSION,
  PLAYER_RADIUS,
  ballRadius,
  clampToMap,
  pushPlayer,
  slingshotPull,
  type Point,
  type Size,
} from "@/core/game/physics";
import {
  createWorld,
  dummyThrow,
  stepWorld,
  throwBall,
  type Catch,
} from "@/core/game/world";
import GameHud from "@/components/game/GameHud.vue";
import ReceivedMessage from "@/components/game/ReceivedMessage.vue";
import Joystick from "@/components/game/Joystick.vue";
import { stickTilt } from "@/core/game/joystick";
import TrailScene from "@/core/trail/TrailScene";
import { avatarUrl } from "@/core/utils/avatars";

const props = defineProps<{ channelId: number }>();
const userStore = useUserStore();

type Phase = "move" | "aim";
// Deux schémas de contrôle à comparer (tests avec les créas).
type Controls = "drag" | "joystick";

const world = reactive(
  createWorld(userStore.me?.username ?? "Moi", userStore.profile.avatar),
);
const { me } = world;

const svg = ref<SVGSVGElement>();
const trailCanvas = ref<HTMLCanvasElement>();
const pendingBallEl = ref<SVGCircleElement>();

const size = ref<Size>({ width: 1, height: 1 });
const phase = ref<Phase>("move");
const pending = ref<{ text: string; metadata: MessageMetadata } | null>(null);
const aim = ref<{ start: Point; current: Point } | null>(null);
const followingFinger = ref(false);
const controls = ref<Controls>("joystick");
// Joystick flottant : il apparaît là où le doigt se pose (origin).
const stick = ref<{ origin: Point; tilt: Point } | null>(null);
const touching = computed(
  () => followingFinger.value || aim.value !== null || stick.value !== null,
);
const received = ref<{ message: Message; origin: Point } | null>(null);
const toast = ref("");

let toastTimer: ReturnType<typeof setTimeout> | undefined;
// Pas de ref() : Vue envelopperait les objets Three dans des proxys réactifs.
let trailScene: TrailScene | undefined;

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

function setMood(mood: Mood) {
  if (pending.value) pending.value.metadata.mood = mood;
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
    const now = new Date().toISOString();
    const message: Message = {
      id: ball.id,
      content: ball.text,
      user: thrower?.name ?? "?",
      user_id: 0,
      anonymous: false,
      creation_date: now,
      posted_at: now,
      metadata: ball.metadata,
    };
    received.value = { message, origin: { ...mePx.value } };
  } else {
    showToast(
      `${catcher.name} a attrapé ${ball.throwerId === me.id ? "ton" : "un"} message`,
    );
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

// En visée, le joystick réutilise la fronde : l'inclinaison du stick remplace le drag sur l'écran.
function moveStick(point: Point) {
  const tilt = stickTilt(stick.value!.origin, point);
  stick.value!.tilt = tilt;
  if (phase.value === "aim") {
    aim.value = {
      start: { x: 0, y: 0 },
      current: { x: tilt.x * MAX_PULL, y: tilt.y * MAX_PULL },
    };
  }
}

function onPointerDown(event: PointerEvent) {
  const point = pointerPx(event);
  if (controls.value === "joystick") {
    stick.value = { origin: point, tilt: { x: 0, y: 0 } };
    moveStick(point);
  } else if (phase.value === "move") {
    followingFinger.value = true;
    followFinger(event);
  } else {
    aim.value = { start: point, current: point };
  }
  svg.value!.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (stick.value) moveStick(pointerPx(event));
  if (followingFinger.value) followFinger(event);
  if (aim.value && !stick.value) aim.value.current = pointerPx(event);
}

function onPointerUp() {
  stick.value = null;
  if (followingFinger.value) stopFollowing();
  if (aim.value) launch();
}

function onPointerCancel() {
  stick.value = null;
  if (followingFinger.value) stopFollowing();
  aim.value = null;
}

function toggleControls() {
  onPointerCancel();
  controls.value = controls.value === "drag" ? "joystick" : "drag";
}

function tick(_time: number, deltaMs: number) {
  // Plafonné : après un changement d'onglet du navigateur, deltaMs peut valoir plusieurs secondes.
  const dt = Math.min(deltaMs / 1000, 0.05);
  if (stick.value && phase.value === "move") {
    pushPlayer(me, stick.value.tilt, dt, size.value);
  }
  stepWorld(world, dt, size.value).forEach(onCatch);
  trailScene?.update();
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
    trailScene?.resize(size.value);
  });
  resizeObserver.observe(svg.value!);
  gsap.ticker.add(tick);

  trailScene = new TrailScene(trailCanvas.value!);
  trailScene.init();
});

onUnmounted(() => {
  resizeObserver.disconnect();
  gsap.ticker.remove(tick);
  clearTimeout(toastTimer);
  trailScene?.dispose();
});
</script>

<template>
  <div class="game grid-background">
    <canvas ref="trailCanvas" class="trail" />

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
        <image
          v-if="avatarUrl(player.avatar)"
          :href="avatarUrl(player.avatar)"
          :x="player.x * size.width - PLAYER_RADIUS"
          :y="player.y * size.height - PLAYER_RADIUS"
          :width="PLAYER_RADIUS * 2"
          :height="PLAYER_RADIUS * 2" />
        <template v-else>
          <circle
            class="player"
            :cx="player.x * size.width"
            :cy="player.y * size.height"
            :r="PLAYER_RADIUS" />
          <text
            class="monogram"
            :x="player.x * size.width"
            :y="player.y * size.height">
            {{ player.name.charAt(0).toUpperCase() }}
          </text>
        </template>
        <text
          class="name"
          :x="player.x * size.width"
          :y="player.y * size.height + PLAYER_RADIUS + 14">
          {{ player.id === me.id ? "Moi" : player.name }}
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
      :mood="pending?.metadata.mood ?? 'neutral'"
      @submit="onComposerSubmit"
      @mood="setMood" />

    <Joystick v-if="stick" :origin="stick.origin" :tilt="stick.tilt" />

    <div class="debug">
      <button @click="toggleControls">
        Contrôles : {{ controls === "drag" ? "Drag" : "Joystick" }}
      </button>
      <button @click="dummyThrow(world, size)">Dummy → moi</button>
    </div>

    <p v-if="toast" class="toast">{{ toast }}</p>

    <ReceivedMessage
      v-if="received"
      :key="received.message.id"
      :message="received.message"
      :origin="received.origin"
      @close="received = null" />
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
}

.trail {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.map {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.player {
  fill: none;
  stroke: var(--text-color);
  stroke-width: 1.5;
}

.monogram {
  font-size: 18px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: central;
  fill: var(--text-color);
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
  top: 3.75rem;
  right: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
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
