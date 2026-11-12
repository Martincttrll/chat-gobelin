<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useUserStore } from "@/stores/user";
import { createChannel, enterChannel } from "@/api/channels";
import {
  MAX_MEMBERS,
  addToRoster,
  createRoster,
  estimateMembers,
  findRoster,
  isFull,
} from "@/api/roster";

const emit = defineEmits<{ close: [] }>();

const userStore = useUserStore();

const action = ref<"create" | "join">();
const channelName = ref("");
const error = ref("");
const input = ref<HTMLInputElement>();

watch(action, () => nextTick(() => input.value?.focus()));

async function submit() {
  error.value = "";
  const name = channelName.value.trim();

  // L'API ajoute le channel en double si on le rejoint alors qu'on en est déjà membre.
  if (
    action.value === "join" &&
    userStore.me?.channels.some((c) => c.name === name)
  ) {
    error.value = "Tu fais déjà partie de ce channel.";
    return;
  }

  const myId = userStore.me!.id;
  try {
    if (action.value === "create") {
      await createChannel(name);
      await createRoster(name, [myId]).catch(() => {});
    } else {
      // Vérifié avant de rejoindre : le back n'a pas de route pour quitter un channel.
      const roster = await findRoster(name);
      if (isFull(roster, myId)) {
        error.value = `Ce groupe est complet (${MAX_MEMBERS} personnes max).`;
        return;
      }
      const channel = await enterChannel(name);
      await (roster
        ? addToRoster(roster, myId)
        : estimateMembers(channel.id).then((ids) => createRoster(name, [...new Set([...ids, myId])]))
      ).catch(() => {});
    }
    await userStore.fetchMe();
    emit("close");
  } catch {
    error.value =
      action.value === "create"
        ? "Impossible de créer le channel."
        : "Ce channel n'existe pas.";
  }
}
</script>

<template>
  <div class="sheet-root">
    <div class="backdrop" @click="emit('close')" />

    <div v-if="!action" class="sheet">
      <h2>Nouvelle discussion</h2>
      <div class="actions">
        <button type="button" class="filled" @click="action = 'join'">Rejoindre</button>
        <button type="button" @click="action = 'create'">Créer</button>
      </div>
    </div>

    <form v-else class="sheet" @submit.prevent="submit">
      <h2>{{ action === "join" ? "Rejoindre un channel" : "Créer un channel" }}</h2>
      <div class="actions">
        <span class="field">
          <input v-model="channelName" placeholder="Nom du channel" required ref="input" />
        </span>
        <button type="submit" class="filled ok" :disabled="!channelName.trim()">OK</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
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

.actions > * {
  flex: 1;
}

.actions > .ok {
  flex: none;
}

.error {
  margin: 0;
  color: var(--red);
}
</style>
