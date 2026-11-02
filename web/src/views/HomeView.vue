<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { createChannel } from '@/api/channels'

const userStore = useUserStore()

const channelName = ref('')
const error = ref('')

async function submitChannel() {
  error.value = ''

  try {
    await createChannel(channelName.value)
    await userStore.fetchMe()
    channelName.value = ''
  } catch {
    error.value = 'Impossible de créer le channel.'
  }
}
</script>

<template>
  <main>
    <header>
      <p>Connecté en tant que <strong>{{ userStore.me?.username }}</strong></p>
      <button @click="userStore.logout()">Se déconnecter</button>
    </header>

    <h2>Mes channels</h2>
    <ul>
      <li v-for="channel in userStore.me?.channels" :key="channel.id">#{{ channel.name }}</li>
    </ul>

    <form @submit.prevent="submitChannel">
      <input v-model="channelName" placeholder="Nom du channel" required />
      <button type="submit">Créer</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>

<style scoped>
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

form {
  display: flex;
  gap: 0.5rem;
}

.error {
  color: crimson;
}
</style>
