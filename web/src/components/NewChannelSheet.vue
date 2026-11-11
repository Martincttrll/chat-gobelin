<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "@/stores/user";
import { createChannel, enterChannel } from "@/api/channels";

const emit = defineEmits<{ close: [] }>();

const userStore = useUserStore();

const channelName = ref("");
const error = ref("");

async function submit(action: "create" | "join") {
  error.value = "";
  const name = channelName.value.trim();

  // L'API ajoute le channel en double si on le rejoint alors qu'on en est déjà membre.
  if (
    action === "join" &&
    userStore.me?.channels.some((c) => c.name === name)
  ) {
    error.value = "Tu fais déjà partie de ce channel.";
    return;
  }

  try {
    if (action === "create") await createChannel(name);
    else await enterChannel(name);
    await userStore.fetchMe();
    emit("close");
  } catch {
    error.value =
      action === "create"
        ? "Impossible de créer le channel."
        : "Ce channel n'existe pas.";
  }
}
</script>

<template>
  <div class="sheet-root">
    <div class="backdrop" @click="emit('close')" />

    <form class="sheet" @submit.prevent="submit('join')">
      <h2>Nouvelle discussion</h2>
      <span class="field">
        <input v-model="channelName" placeholder="Nom du channel" required />
      </span>
      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button type="submit" class="filled">Rejoindre</button>
        <button
          type="button"
          :disabled="!channelName.trim()"
          @click="submit('create')">
          Créer
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Classes posées par le <Transition name="sheet"> de HomeView. */
.sheet-enter-active .backdrop,
.sheet-leave-active .backdrop {
  transition: opacity 0.3s ease;
}

.sheet-enter-active .sheet {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet-leave-active .sheet {
  transition: transform 0.2s ease-in;
}

.sheet-enter-from .backdrop,
.sheet-leave-to .backdrop {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgb(0 0 0 / 0.5);
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 21;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 480px;
  margin: 0 auto;
  padding: 1.25rem 1rem;
  padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
  border-radius: 1.25rem 1.25rem 0 0;
  background: var(--background-color);
}

h2 {
  margin: 0;
  font-size: 1.1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.actions button {
  flex: 1;
}

.error {
  margin: 0;
  color: var(--red);
}
</style>
