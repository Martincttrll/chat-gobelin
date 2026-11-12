<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";
import BlobBackground from "@/components/BlobBackground.vue";

withDefaults(defineProps<{ title?: string; back?: RouteLocationRaw }>(), {
  title: "Check up",
});
</script>

<template>
  <BlobBackground />

  <header>
    <div class="title">
      <RouterLink v-if="back" :to="back" class="back" aria-label="Retour">
        <img class="sketch-icon" src="@/assets/img/back-arrow.svg" alt="" />
      </RouterLink>
      <h1>{{ title }}</h1>
    </div>
    <slot name="actions" />
  </header>

  <main>
    <slot />
  </main>
</template>

<style scoped>
header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 0.5rem 1.5rem;
}

.title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back {
  display: flex;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

/* La page ne scrolle pas : c'est le contenu qui scrolle, sous l'en-tête. */
main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
