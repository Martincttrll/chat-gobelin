<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

watch(
  () => userStore.token,
  (token) => {
    if (!token) {
      router.push({ name: 'login' })
    }
  },
)
</script>

<template>
  <svg class="filters" aria-hidden="true">
    <filter id="sketch" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="2" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
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
