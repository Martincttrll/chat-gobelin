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
import { editMessage, sendMessage } from "@/api/messages";
import type { Message, MessageMetadata, Mood } from "@/types/api";
import { moodColor, moodSecondaryColor } from "@/core/message-style/moods";
import {
  MAX_PULL,
  MIN_TENSION,
  PLAYER_RADIUS,
  ballRadius,
  clampToMap,
  pushPlayer,
  slingshotPull,
  type Ball,
  type Point,
  type Size,
} from "@/core/game/physics";
import {
  createWorld,
  dropBall,
  dummyThrow,
  placeAwayFromBalls,
  remoteThrow,
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
import { usePresence } from "@/core/game/usePresence";
import { TRAIL_FADE, updateTrails, type Trail } from "@/core/game/trails";
import type { Member } from "@/core/mentions/mentions";
import OnboardingHint from "@/components/OnboardingHint.vue";
import { isOnboardingDone, markOnboardingDone } from "@/core/onboarding/onboarding";

const props = defineProps<{
  channelId: number;
  messages: Message[];
  presenceMessages: Message[];
}>();
const userStore = useUserStore();
const myUserId = userStore.me!.id;

type Phase = "move" | "aim";
// Deux schémas de contrôle à comparer (tests avec les créas).
type Controls = "drag" | "joystick";

// #debug dans l'URL (lu au chargement du jeu) : boutons de test et joueur Dummy.
const debug = window.location.hash === "#debug";

const world = reactive(
  createWorld(userStore.me?.username ?? "Moi", userStore.profile.avatar, debug),
);
const { me } = world;
usePresence(world, props.channelId, () => props.presenceMessages);

const svg = ref<SVGSVGElement>();
const trailCanvas = ref<HTMLCanvasElement>();
const pendingBallEl = ref<SVGCircleElement>();

const size = ref<Size>({ width: 1, height: 1 });
const phase = ref<Phase>("move");
// messageId : passe d'un message déjà envoyé (adressé à quelqu'un d'autre), on le relance au lieu d'en poster un.
const pending = ref<{ text: string; metadata: MessageMetadata; messageId?: number } | null>(null);
const aim = ref<{ start: Point; current: Point } | null>(null);
const followingFinger = ref(false);
const controls = ref<Controls>("joystick");
// Joystick flottant : il apparaît là où le doigt se pose (origin).
const stick = ref<{ origin: Point; tilt: Point } | null>(null);
const touching = computed(
  () => followingFinger.value || aim.value !== null || stick.value !== null,
);
const trails = ref<Trail[]>([]);
const trailTime = ref(0);

// Segment par segment : chacun s'efface et s'amincit avec l'âge de son point, et sa couleur
// oscille entre la couleur de l'humeur et sa variante secondaire (effet de pigment irrégulier).
function trailSegments(trail: Trail) {
  const color = moodColor(trail.metadata);
  const secondary = moodSecondaryColor(trail.metadata);
  return trail.points.slice(1).map((point, i) => {
    const previous = trail.points[i]!;
    const age = (trailTime.value - point.time) / TRAIL_FADE;
    const mix = Math.round(50 + 50 * Math.sin(i * 0.25));
    return {
      key: point.time,
      x1: previous.x * size.value.width,
      y1: previous.y * size.value.height,
      x2: point.x * size.value.width,
      y2: point.y * size.value.height,
      width: trail.width * (1 - age * 0.6),
      opacity: 0.6 * (1 - age),
      color: `color-mix(in srgb, ${color} ${mix}%, ${secondary})`,
    };
  });
}

const received = ref<{ message: Message; origin: Point; passTo?: string } | null>(null);
const toast = ref("");

// Onboarding de la première partie : chaque étape passe à la suivante quand on fait l'action.
type OnboardingStep = "move" | "write" | "send" | "mood" | "aim";
const ONBOARDING: Record<OnboardingStep, { text: string; target?: string; shape?: "circle" | "pill" }> = {
  move: { text: "Clique n'importe où sur l'écran pour te déplacer", target: "me", shape: "circle" },
  write: { text: "Écris ton message", target: "input", shape: "pill" },
  send: { text: "Maintenant, clique ici pour envoyer ton message", target: "send", shape: "circle" },
  mood: { text: "Maintiens ton doigt appuyé pour modifier les humeurs", target: "mood", shape: "pill" },
  aim: { text: "Maintenant vise et envoie ton message 😉" },
};
const onboardingStep = ref<OnboardingStep | null>(isOnboardingDone("game") ? null : "move");

function advanceOnboarding(from: OnboardingStep[], to: OnboardingStep | null) {
  if (!onboardingStep.value || !from.includes(onboardingStep.value)) return;
  onboardingStep.value = to;
  if (!to) markOnboardingDone("game");
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
// Ids de messages dont on a déjà enregistré l'arrêt au sol / le ramassage (le polling peut avoir du retard).
const landed = new Set<number>();
const picked = new Set<number>();
// Dernier lancer vu pour chaque message : une passe change le lancer d'un message existant.
const launches = new Map<number, string>();
// Boule attrapée alors qu'elle était adressée à un autre : on la tient jusqu'à la passe ou au dépôt.
let holding: Ball | null = null;
// Pas de ref() : Vue envelopperait les objets Three dans des proxys réactifs.
let trailScene: TrailScene | undefined;

function playerId(userId: number) {
  return userId === myUserId ? me.id : `user-${userId}`;
}

// Destinataires possibles d'une mention : l'API n'expose pas les membres d'un channel,
// on prend les auteurs de messages et les joueurs déjà venus sur la map.
const members = computed<Member[]>(() => {
  const names = new Map<number, string>();
  for (const message of props.messages) names.set(message.user_id, message.user);
  for (const message of props.presenceMessages) {
    const presence = message.metadata?.presence;
    if (presence?.channelId === props.channelId) names.set(presence.userId, presence.name);
  }
  names.delete(myUserId);
  return [...names].map(([userId, name]) => ({ userId, name }));
});

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
  advanceOnboarding(["write", "send"], "mood");
}

function setMood(mood: Mood) {
  if (pending.value) pending.value.metadata.mood = mood;
  advanceOnboarding(["mood"], "aim");
}

function launch() {
  const { offset, tension } = pull.value;
  aim.value = null;
  if (!pending.value || tension < MIN_TENSION) return;

  const { text, messageId } = pending.value;
  const metadata: MessageMetadata = { ...pending.value.metadata, pickedUp: false };
  if (messageId !== undefined) {
    Object.assign(metadata, { ground: undefined, heldBy: undefined, passerId: myUserId });
  }
  const ball = throwBall(world, me, text, metadata, { x: -offset.x, y: -offset.y }, tension);
  // Les autres clients rejouent le lancer : vitesse en fraction de map/s, leur écran n'a pas la même taille.
  metadata.launch = {
    x: ball.x,
    y: ball.y,
    vx: ball.vx / size.value.width,
    vy: ball.vy / size.value.height,
  };

  pending.value = null;
  phase.value = "move";
  advanceOnboarding(["mood", "aim"], null);

  if (messageId !== undefined) {
    ball.messageId = messageId;
    ball.authorId = holding!.authorId;
    ball.throwerName = holding!.throwerName;
    holding = null;
    landed.delete(messageId);
    editMessage(messageId, "", metadata).catch(() => showToast("La passe n'a pas pu être enregistrée."));
    return;
  }

  sendMessage(props.channelId, text, metadata)
    .then((message) => {
      ball.messageId = message.id;
      // Attrapée avant la fin du POST : on n'avait pas encore l'id pour l'enregistrer.
      if (!world.balls.some((b) => b.id === ball.id)) savePickup(ball);
    })
    .catch(() => {
      showToast("Le message n'a pas pu être enregistré.");
    });
}

function saveLanding(ball: Ball) {
  if (ball.messageId === undefined || landed.has(ball.messageId)) return;
  landed.add(ball.messageId);
  ball.metadata = { ...ball.metadata, ground: { x: ball.x, y: ball.y } };
  editMessage(ball.messageId, "", ball.metadata).catch(() => landed.delete(ball.messageId!));
}

function hold(ball: Ball) {
  holding = ball;
  if (ball.messageId === undefined) return;
  // ground : là où on l'a attrapée, si on quitte l'app sans la reposer ni la passer.
  ball.metadata = { ...ball.metadata, heldBy: myUserId, ground: { x: me.x, y: me.y } };
  editMessage(ball.messageId, "", ball.metadata).catch(() => {});
}

// Fermé sans passe : la boule retombe à nos pieds, et on ne peut pas la reprendre.
function dropHeld() {
  const ball = holding!;
  holding = null;
  Object.assign(ball, { x: me.x, y: me.y, vx: 0, vy: 0, onGround: true, throwerId: me.id });
  ball.metadata = {
    ...ball.metadata,
    ground: { x: me.x, y: me.y },
    heldBy: undefined,
    passerId: myUserId,
  };
  world.balls.push(ball);
  if (ball.messageId === undefined) return;
  landed.add(ball.messageId);
  editMessage(ball.messageId, "", ball.metadata).catch(() => {
    showToast("La boule n'a pas pu être reposée.");
  });
}

function closeReceived() {
  received.value = null;
  if (holding) dropHeld();
}

function startPass() {
  received.value = null;
  const { text, metadata, messageId } = holding!;
  pending.value = { text, metadata, messageId };
  phase.value = "aim";
}

function savePickup(ball: Ball) {
  if (ball.messageId === undefined) return;
  picked.add(ball.messageId);
  // ground: undefined disparaît à la sérialisation JSON.
  editMessage(ball.messageId, "", { ...ball.metadata, pickedUp: true, ground: undefined }).catch(() => {
    showToast("Le ramassage n'a pas pu être enregistré.");
  });
}

// Synchronise les boules avec l'API : lancers et passes des autres, boules au sol, tenues ou ramassées ailleurs.
watch(
  () => props.messages,
  (messages, previous) => {
    for (const message of messages) {
      const { pickedUp, ground, launch, heldBy, passerId } = message.metadata ?? {};
      const launchKey = launch ? `${launch.x},${launch.y},${launch.vx},${launch.vy}` : "";
      const newLaunch = launchKey !== "" && launches.get(message.id) !== launchKey;
      launches.set(message.id, launchKey);

      const onMap = world.balls.some((ball) => ball.messageId === message.id);
      const removeFromMap = () => {
        world.balls = world.balls.filter((ball) => ball.messageId !== message.id);
      };
      const throwerUserId = passerId ?? message.user_id;
      const drop = () => {
        if (onMap || picked.has(message.id)) return;
        dropBall(world, message, playerId(throwerUserId), playerId(message.user_id));
        landed.add(message.id);
      };

      if (pickedUp !== false) {
        if (onMap) removeFromMap();
      } else if (!previous) {
        // Premier passage : les lancers en cours sont déjà finis. Une boule tenue (son joueur a pu
        // quitter l'app sans la reposer) est posée là où elle a été attrapée.
        if (ground) drop();
      } else if (heldBy !== undefined) {
        if (heldBy !== myUserId) removeFromMap();
      } else if (newLaunch && !ground && throwerUserId !== myUserId) {
        removeFromMap();
        remoteThrow(world, message, playerId(throwerUserId), playerId(message.user_id), size.value);
      } else if (ground) {
        drop();
      }
    }
  },
  { immediate: true },
);
// Après le premier passage du watch : les boules au sol sont posées.
placeAwayFromBalls(world);

function onCatch({ ball, catcher, thrower }: Catch) {
  // Un message déjà ouvert ou une boule déjà en main : on ne ramasse rien d'autre.
  if (catcher.id === me.id && (received.value || holding)) {
    world.balls.push(ball);
    return;
  }

  const to = ball.metadata.to;
  const wrongTarget = catcher.id === me.id && to !== undefined && to.userId !== myUserId;
  if (wrongTarget) hold(ball);
  else savePickup(ball);

  if (catcher.id === me.id) {
    // Le message de l'API donne le vrai auteur (pas celui qui a fait la passe) et l'heure d'envoi.
    const sent = props.messages.find((m) => m.id === ball.messageId);
    const now = new Date().toISOString();
    const message: Message = {
      id: ball.id,
      channel_id: props.channelId,
      content: ball.text,
      user: sent?.user ?? thrower?.name ?? ball.throwerName ?? "?",
      user_id: sent?.user_id ?? 0,
      anonymous: false,
      creation_date: sent?.creation_date ?? now,
      posted_at: sent?.posted_at ?? now,
      metadata: ball.metadata,
    };
    received.value = { message, origin: { ...mePx.value }, passTo: wrongTarget ? to.name : undefined };
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
  if (phase.value === "aim") advanceOnboarding(["mood"], "aim");
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
  if (phase.value === "move") advanceOnboarding(["move"], "write");
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

function tick(time: number, deltaMs: number) {
  // Plafonné : après un changement d'onglet du navigateur, deltaMs peut valoir plusieurs secondes.
  const dt = Math.min(deltaMs / 1000, 0.05);
  if (stick.value && phase.value === "move") {
    pushPlayer(me, stick.value.tilt, dt, size.value);
  }
  stepWorld(world, dt, size.value).forEach(onCatch);
  trailTime.value = time;
  trails.value = updateTrails(trails.value, world.balls, time);
  for (const ball of world.balls) {
    if (ball.onGround && ball.throwerId === me.id) saveLanding(ball);
  }
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
  // Taille réelle avant la première frame : avec la taille par défaut (1×1 px), toutes les boules
  // au sol « touchent » le joueur et sont ramassées d'un coup à l'arrivée.
  const rect = svg.value!.getBoundingClientRect();
  size.value = { width: rect.width, height: rect.height };

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
  if (holding) dropHeld();
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
          :data-onboarding="player.id === me.id ? 'me' : undefined"
          filter="url(#sketch-avatar)"
          :href="avatarUrl(player.avatar)"
          :x="player.x * size.width - PLAYER_RADIUS"
          :y="player.y * size.height - PLAYER_RADIUS"
          :width="PLAYER_RADIUS * 2"
          :height="PLAYER_RADIUS * 2" />
        <template v-else>
          <circle
            class="player"
            filter="url(#sketch)"
            :data-onboarding="player.id === me.id ? 'me' : undefined"
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

      <defs>
        <!-- Bords irréguliers et légèrement fondus : un premier pas vers l'aquarelle. -->
        <!-- userSpaceOnUse : en objectBoundingBox, la zone du filtre suit la géométrie des lignes sans
             leur épaisseur ; une traînée presque droite a une hauteur nulle et disparaît. -->
        <filter
          id="trail-paint"
          filterUnits="userSpaceOnUse"
          x="0"
          y="0"
          :width="size.width"
          :height="size.height">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      <g class="trails" filter="url(#trail-paint)">
        <template v-for="trail in trails" :key="trail.ballId">
          <line
            v-for="segment in trailSegments(trail)"
            :key="segment.key"
            :x1="segment.x1"
            :y1="segment.y1"
            :x2="segment.x2"
            :y2="segment.y2"
            :stroke-width="segment.width"
            :style="{ stroke: segment.color, strokeOpacity: segment.opacity }" />
        </template>
      </g>

      <circle
        v-for="ball in world.balls"
        :key="ball.id"
        class="ball"
        :cx="ball.x * size.width"
        :cy="ball.y * size.height"
        :r="ballRadius(ball.text)"
        :style="{ fill: moodColor(ball.metadata), '--glow': moodSecondaryColor(ball.metadata) }" />

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
          :style="{
            fill: moodColor(pending.metadata),
            '--glow': moodSecondaryColor(pending.metadata),
          }" />
      </template>
    </svg>

    <!-- @input : événement natif de l'input du composer, qui remonte jusqu'à la racine de GameHud. -->
    <GameHud
      :aiming="phase === 'aim'"
      :passing="pending?.messageId !== undefined"
      :members="members"
      :touching="touching"
      :mood="pending?.metadata.mood ?? 'neutral'"
      @submit="onComposerSubmit"
      @mood="setMood"
      @input="advanceOnboarding(['write'], 'send')" />

    <OnboardingHint
      v-if="onboardingStep"
      :key="onboardingStep"
      :text="ONBOARDING[onboardingStep].text"
      :target="ONBOARDING[onboardingStep].target"
      :shape="ONBOARDING[onboardingStep].shape" />

    <Joystick v-if="stick" :origin="stick.origin" :tilt="stick.tilt" />

    <div v-if="debug" class="debug">
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
      :pass-to="received.passTo"
      @close="closeReceived"
      @resend="startPass" />
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

/* Même rendu que les boules de notification de l'accueil : rond crayonné, lueur secondaire. */
.ball {
  filter: url(#sketch) drop-shadow(0 0 0.3rem var(--glow));
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
