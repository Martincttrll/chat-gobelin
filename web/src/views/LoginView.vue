<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { createUser } from '@/api/users'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit(mode: 'login' | 'signup') {
  error.value = ''
  loading.value = true

  const credentials = { username: username.value, password: password.value }

  try {
    if (mode === 'signup') {
      await createUser(credentials)
    }
    await userStore.login(credentials)
    router.push({ name: 'home' })
  } catch {
    error.value =
      mode === 'signup' ? 'Impossible de créer le compte.' : 'Identifiants incorrects.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login">
    <h1>Chat Gobelin</h1>

    <form @submit.prevent="submit('login')">
      <label>
        Pseudo
        <input v-model="username" required autocomplete="username" />
      </label>

      <label>
        Mot de passe
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="loading">Se connecter</button>
      <button type="button" :disabled="loading" @click="submit('signup')">Créer un compte</button>
    </form>
  </main>
</template>

<style scoped>
.login {
  max-width: 320px;
  margin: 10vh auto;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error {
  color: crimson;
}
</style>
