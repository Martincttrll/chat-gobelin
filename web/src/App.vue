<script setup lang="ts">
import { watch } from "vue";
import { RouterView, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { preloadEmotions } from "@/core/emotions/emotionClient";

const router = useRouter();
const userStore = useUserStore();

// Sans attendre : tant que le modèle n'est pas prêt, les messages partent en Neutre.
preloadEmotions();

watch(
  () => userStore.token,
  (token) => {
    if (!token) {
      router.push({ name: "login" });
    }
  },
);
</script>

<template>
  <svg class="filters" aria-hidden="true">
    <filter id="sketch" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.04"
        numOctaves="3"
        seed="2"
        result="noise" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="3"
        xChannelSelector="R"
        yChannelSelector="G" />
    </filter>

    <filter id="sketch-strong" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.06"
        numOctaves="3"
        seed="2"
        result="noise" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="5"
        xChannelSelector="R"
        yChannelSelector="G" />
    </filter>
  </svg>

  <RouterView />
</template>

<style scoped>
.filters {
  position: absolute;
  width: 0;
  height: 0;
}
</style>
