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
import { Flip } from "gsap/Flip";
import { useUserStore } from "@/stores/user";
import { sendMessage } from "@/api/messages";
import type { Message, MessageMetadata } from "@/types/api";
import { moodColor } from "@/message-style/moods";
import StyledMessage from "@/components/StyledMessage.vue";
import MessageComposer from "@/components/game/MessageComposer.vue";
import {
  MAX_PULL,
  PLAYER_RADIUS,
  ballRadius,
  clampToMap,
  launchVelocity,
  movePlayer,
  stepBall,
  touches,
  type Ball,
  type Player,
  type Point,
  type Size,
} from "@/game/physics";
import { randomDummyMessage, randomPoint } from "@/game/dummy";

const props = defineProps<{ channelId: number }>();
const userStore = useUserStore();

type Phase = "move" | "aim";

const DUMMY_SPEED = 120; // px/s
const MIN_TENSION = 0.15; // en dessous, le lâcher est ignoré
const DUMMY_TENSION = 0.8;

const svg = ref<SVGSVGElement>();
const pendingBallEl = ref<SVGCircleElement>();
const hudEl = ref<HTMLElement>();
const receivedCard = ref<HTMLElement>();

const size = ref<Size>({ width: 1, height: 1 });
const phase = ref<Phase>("move");
const pending = ref<{ text: string; metadata: MessageMetadata } | null>(null);
const aim = ref<{ start: Point; current: Point } | null>(null);
const followingFinger = ref(false);
const touching = computed(() => followingFinger.value || aim.value !== null);
const hudCollapsed = ref(false);

// Délai avant le repli : un simple tap sur la map ne doit pas lancer l'animation.
const HUD_COLLAPSE_DELAY = 300; // ms
let collapseTimer: number;

watch(touching, (value) => {
  clearTimeout(collapseTimer);
  if (value) {
    collapseTimer = setTimeout(
      () => (hudCollapsed.value = true),
      HUD_COLLAPSE_DELAY,
    );
  } else {
    hudCollapsed.value = false;
  }
});

gsap.registerPlugin(Flip);

// flush: "pre" : on mesure le HUD avant que Vue change sa classe et son contenu.
watch(
  hudCollapsed,
  async () => {
    const state = Flip.getState(hudEl.value!);
    await nextTick();
    Flip.from(state, {
      duration: 0.35,
      ease: "power3.inOut",
      props: "backgroundColor,borderColor",
    });
    gsap.fromTo(
      hudEl.value!.children,
      { opacity: 0 },
      { opacity: 1, duration: 0.2, delay: 0.15 },
    );
  },
  { flush: "pre" },
);
const balls = ref<Ball[]>([]);
const received = ref<Message | null>(null);
const toast = ref("");

const me = reactive<Player>({
  id: "me",
  name: userStore.me?.username ?? "Moi",
  ...randomPoint(),
  target: null,
});
const dummy = reactive<Player>({
  id: "dummy",
  name: "Dummy",
  ...randomPoint(),
  target: null,
});
const players = [me, dummy];

let nextBallId = 0;
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

// Fronde : la boule est tirée dans le sens du drag (plafonné à MAX_PULL), et part dans le sens opposé.
const pull = computed(() => {
  if (!aim.value) return { offset: { x: 0, y: 0 }, tension: 0 };

  const dx = aim.value.current.x - aim.value.start.x;
  const dy = aim.value.current.y - aim.value.start.y;
  const length = Math.hypot(dx, dy);
  const clamped = Math.min(length, MAX_PULL);
  const ratio = length > 0 ? clamped / length : 0;

  return {
    offset: { x: dx * ratio, y: dy * ratio },
    tension: clamped / MAX_PULL,
  };
});

const mePx = computed(() => toPx(me));
const pendingBallPx = computed(() => ({
  x: mePx.value.x + pull.value.offset.x,
  y: mePx.value.y + pull.value.offset.y,
}));

function throwBall(
  thrower: Player,
  text: string,
  metadata: MessageMetadata,
  direction: Point,
  tension: number,
) {
  balls.value.push({
    id: nextBallId++,
    x: thrower.x,
    y: thrower.y,
    ...launchVelocity(direction, tension, metadata.typingSpeed),
    throwerId: thrower.id,
    armed: false,
    onGround: false,
    text,
    metadata,
  });
}

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
  throwBall(me, text, metadata, { x: -offset.x, y: -offset.y }, tension);
  sendMessage(props.channelId, text, metadata).catch(() => {
    showToast("Le message n'a pas pu être enregistré.");
  });

  pending.value = null;
  phase.value = "move";
}

function dummyThrow() {
  const { text, metadata } = randomDummyMessage();
  const direction = {
    x: mePx.value.x - toPx(dummy).x,
    y: mePx.value.y - toPx(dummy).y,
  };
  throwBall(dummy, text, metadata, direction, DUMMY_TENSION);
}

function catchBall(ball: Ball, catcher: Player) {
  balls.value = balls.value.filter((b) => b.id !== ball.id);
  const thrower = players.find((p) => p.id === ball.throwerId);

  if (catcher.id === me.id) {
    received.value = {
      content: ball.text,
      user: thrower?.name ?? "?",
      user_id: 0,
      creation_date: new Date().toISOString(),
      metadata: ball.metadata,
    };
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

function onPointerDown(event: PointerEvent) {
  if (phase.value === "move") {
    followingFinger.value = true;
    followFinger(event);
  } else if (phase.value === "aim") {
    const point = pointerPx(event);
    aim.value = { start: point, current: point };
  } else {
    return;
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
  const s = size.value;

  movePlayer(me, dt, s);
  movePlayer(dummy, dt, s, DUMMY_SPEED);
  if (!dummy.target && Math.random() < dt / 2) {
    dummy.target = randomPoint();
  }

  for (const ball of balls.value) {
    stepBall(ball, dt, s);

    const thrower = players.find((p) => p.id === ball.throwerId);
    if (!ball.armed && (!thrower || !touches(ball, thrower, s))) {
      ball.armed = true;
    }

    const catcher = players.find(
      (p) => (p.id !== ball.throwerId || ball.armed) && touches(ball, p, s),
    );
    if (catcher) catchBall(ball, catcher);
  }
}

// Animations provisoires, remplacées en phase 2 par la séquence papier (froissage / dépliage).
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

watch(received, async (value) => {
  if (!value) return;
  await nextTick();
  gsap.from(receivedCard.value!, {
    scale: 0,
    rotation: -120,
    duration: 0.5,
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
  clearTimeout(collapseTimer);
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

      <g v-for="player in players" :key="player.id">
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
        v-for="ball in balls"
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

    <div ref="hudEl" class="hud" :class="{ collapsed: hudCollapsed }">
      <span v-show="hudCollapsed" aria-hidden="true">•••</span>

      <!-- v-show et pas v-if : le texte en cours de saisie survit au repli du HUD. -->
      <MessageComposer
        v-if="phase === 'move'"
        v-show="!hudCollapsed"
        class="composer"
        @submit="onComposerSubmit" />

      <div v-else v-show="!hudCollapsed" class="aim-hint">
        <p class="hint">Tire en arrière puis lâche pour lancer</p>
        <button @click="cancelMessage">Annuler</button>
      </div>
    </div>

    <button class="debug" @click="dummyThrow">Dummy → moi</button>

    <p v-if="toast" class="toast">{{ toast }}</p>

    <div v-if="received" class="received" @click="received = null">
      <div ref="receivedCard" class="card">
        <p>
          De <strong>{{ received.user }}</strong>
        </p>
        <StyledMessage :message="received" />
        <small>Toucher pour fermer</small>
      </div>
    </div>
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
