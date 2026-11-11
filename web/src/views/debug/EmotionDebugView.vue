<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Mood } from "@/types/api";
import { MOODS } from "@/core/message-style/moods";
import { detectEmotions, preloadEmotions, type Detection } from "@/core/emotions/emotionClient";
import { EMOTION_TO_MOOD, toMood } from "@/core/emotions/moodMapping";

const text = ref("");
const progress = ref(0);
const loadStart = performance.now();
const loadTime = ref<number | null>(null);
const analysing = ref(false);
const detection = ref<Detection | null>(null);
const error = ref("");

const result = computed(() => (detection.value ? toMood(detection.value.emotions) : null));
const moodScores = computed(() =>
  result.value
    ? (Object.entries(result.value.scores) as [Mood, number][]).sort((a, b) => b[1] - a[1])
    : [],
);

let stopProgress: () => void;

onMounted(() => {
  stopProgress = preloadEmotions((value) => {
    progress.value = value;
    if (value >= 100 && loadTime.value === null) loadTime.value = performance.now() - loadStart;
  });
});
onUnmounted(() => stopProgress());

async function analyse() {
  if (!text.value.trim()) return;
  error.value = "";
  analysing.value = true;
  try {
    detection.value = await detectEmotions(text.value);
  } catch (e) {
    error.value = String(e);
  } finally {
    analysing.value = false;
  }
}

function percent(score: number) {
  return `${(score * 100).toFixed(1)} %`;
}
</script>

<template>
  <main class="debug">
    <RouterLink :to="{ name: 'home' }">←</RouterLink>
    <h1>Détection d'émotions</h1>

    <p v-if="progress < 100" class="status">
      Chargement du modèle : {{ progress.toFixed(0) }} %
      <progress :value="progress" max="100" />
    </p>
    <p v-else class="status">
      Modèle prêt<template v-if="loadTime !== null"> ({{ (loadTime / 1000).toFixed(1) }} s)</template>
    </p>

    <form @submit.prevent="analyse">
      <span class="field">
        <input v-model="text" placeholder="Écris un message…" />
      </span>
      <button type="submit" class="filled" :disabled="analysing">Analyser</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="result && detection">
      <section class="mood" :style="{ '--color': MOODS[result.mood].color ?? 'var(--text-color)' }">
        <span class="dot" />
        <strong>{{ MOODS[result.mood].label }}</strong>
        <small>inférence {{ detection.duration.toFixed(0) }} ms</small>
      </section>

      <h2>Par humeur (meilleure émotion du groupe)</h2>
      <ul class="bars">
        <li v-for="[mood, score] in moodScores" :key="mood">
          <span class="label">{{ MOODS[mood].label }}</span>
          <span class="bar"
            ><span
              :style="{ width: percent(score), background: MOODS[mood].color ?? 'var(--text-color)' }"
          /></span>
          <span class="value">{{ percent(score) }}</span>
        </li>
      </ul>

      <h2>Résultat brut du modèle (28 émotions)</h2>
      <ul class="bars raw">
        <li v-for="emotion in detection.emotions" :key="emotion.label">
          <span class="label">
            {{ emotion.label }}
            <small>→ {{ MOODS[EMOTION_TO_MOOD[emotion.label] ?? "neutral"].label }}</small>
          </span>
          <span class="bar"><span :style="{ width: percent(emotion.score) }" /></span>
          <span class="value">{{ percent(emotion.score) }}</span>
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped>
.debug {
  max-width: 560px;
  margin: 0 auto;
  padding: 1rem 0.5rem 3rem;
  height: 100%;
  overflow-y: auto;
}

h1 {
  margin: 0.5rem 0 1rem;
  font-size: 1.4rem;
}

h2 {
  margin: 1.5rem 0 0.5rem;
  font-size: 1rem;
  opacity: 0.7;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  opacity: 0.8;
}

form {
  display: flex;
  gap: 0.5rem;
}

form .field {
  flex: 1;
  min-width: 0;
}

.mood {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  font-size: 1.4rem;
}

.mood .dot {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color);
  box-shadow: 0 0 1rem var(--color);
}

.mood small {
  margin-left: auto;
  font-size: 0.8rem;
  opacity: 0.6;
}

.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.bars li {
  display: grid;
  grid-template-columns: 9rem 1fr 4.5rem;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.label small {
  opacity: 0.5;
}

.bar {
  height: 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-color) 10%, transparent);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: var(--text-color);
}

.value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.error {
  color: var(--red);
}
</style>
