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
  <RouterView />
</template>
