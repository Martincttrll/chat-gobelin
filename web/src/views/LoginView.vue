<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { createUser } from "@/api/users";
import BlobBackground from "@/components/BlobBackground.vue";

type Mode = "login" | "signup";

const router = useRouter();
const userStore = useUserStore();

const mode = ref<Mode | null>(null);
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const loading = ref(false);

function open(next: Mode | null) {
  mode.value = next;
  error.value = "";
  password.value = "";
  confirmPassword.value = "";
}

async function submit() {
  error.value = "";

  if (mode.value === "signup" && password.value !== confirmPassword.value) {
    error.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  loading.value = true;
  const credentials = { username: username.value, password: password.value };

  try {
    if (mode.value === "signup") {
      await createUser(credentials);
    }
    await userStore.login(credentials);
    router.push({ name: "home" });
  } catch {
    error.value =
      mode.value === "signup"
        ? "Impossible de créer le compte."
        : "Identifiants incorrects.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <BlobBackground placement="center" />
  <main class="login">
    <h1>
      <img class="sketch-icon" src="@/assets/img/logo.svg" alt="Logo Catchup" />
    </h1>

    <div class="form-wrapper">
      <div v-if="!mode" class="choice">
        <button class="filled" @click="open('login')">Me connecter</button>
        <div class="separator">
          <span class="line" />
          OU
          <span class="line" />
        </div>
        <button @click="open('signup')">Créer un compte</button>
      </div>

      <form v-else :key="mode" @submit.prevent="submit">
        <button type="button" class="plain back" @click="open(null)">←</button>

        <label>
          Identifiant
          <span class="field">
            <input v-model="username" required autocomplete="username" />
          </span>
        </label>

        <label>
          Mot de passe
          <span class="field">
            <input
              v-model="password"
              type="password"
              required
              :autocomplete="
                mode === 'signup' ? 'new-password' : 'current-password'
              " />
          </span>
        </label>

        <label v-if="mode === 'signup'">
          Confirmez votre mot de passe
          <span class="field">
            <input
              v-model="confirmPassword"
              type="password"
              required
              autocomplete="new-password" />
          </span>
        </label>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" class="filled" :disabled="loading">
          {{ mode === "signup" ? "Créer un compte" : "Me connecter" }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.login {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

h1 {
  position: absolute;
  top: 6rem;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  font-size: 40px;
}

.choice,
form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.separator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.line {
  flex: 1;
  height: 1px;
  background: white;
  filter: url(#sketch);
}

.back {
  align-self: flex-start;
  font-size: 1.5rem;
  filter: url(#sketch);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

button[type="submit"] {
  position: absolute;
  bottom: 75px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
}

.error {
  margin: 0;
  color: var(--red);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
