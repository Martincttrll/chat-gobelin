<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
import { applyMessageEvent, getMessages, isVisible } from "@/api/messages";
import { listenChannels } from "@/api/socket";
import type { Message } from "@/types/api";
import BaseLayout from "@/layouts/BaseLayout.vue";
import GameView from "@/components/game/GameView.vue";
import ConversationPanel from "@/components/ConversationPanel.vue";

const route = useRoute();
const userStore = useUserStore();

const conversationOpen = ref(false);
const messages = ref<Message[]>([]);
// Messages du channel technique (ws-checkup) : présence des joueurs de tous les channels.
const systemMessages = ref<Message[]>([]);
const loaded = ref(false);

const channel = computed(() =>
  userStore.channels.find((c) => c.name === route.params.name),
);

async function loadMessages() {
  if (!channel.value) return;
  const systemId = userStore.systemChannel?.id;
  const [channelMessages, presence] = await Promise.all([
    getMessages(channel.value.id),
    systemId ? getMessages(systemId) : [],
  ]);
  messages.value = channelMessages;
  systemMessages.value = presence;
  loaded.value = true;
}

let stopListening: (() => void) | undefined;

// /me est chargé de façon asynchrone au démarrage : le channel peut arriver après le montage.
watch(
  () => channel.value?.id,
  (id) => {
    stopListening?.();
    if (!id) return;
    loadMessages();
    const systemId = userStore.systemChannel?.id;
    stopListening = listenChannels(
      systemId ? [id, systemId] : [id],
      (event) => {
        if (event.channel_id === systemId) {
          systemMessages.value = applyMessageEvent(systemMessages.value, event);
        } else {
          messages.value = applyMessageEvent(messages.value, event);
        }
      },
      loadMessages,
    );
  },
  { immediate: true },
);

onUnmounted(() => stopListening?.());
</script>

<template>
  <template v-if="channel">
    <!-- Monté après le premier chargement : les messages déjà là ne sont pas pris pour de nouveaux lancers. -->
    <GameView
      v-if="loaded"
      :key="channel.id"
      :channel-id="channel.id"
      :messages="messages"
      :presence-messages="systemMessages" />

    <nav class="topbar">
      <RouterLink :to="{ name: 'home' }">
        <img
          class="sketch-icon"
          src="@/assets/img/back-arrow.svg"
          alt="Retour à l'accueil" />
      </RouterLink>
      <img
        class="chat-icon"
        @click="conversationOpen = true"
        src="@/assets/img/chat2.svg"
        alt="Ouvrir la discussion" />
    </nav>

    <Transition name="conversation" :duration="{ enter: 300, leave: 200 }">
      <ConversationPanel
        v-if="conversationOpen"
        :messages="messages.filter(isVisible)"
        @close="conversationOpen = false" />
    </Transition>
  </template>

  <BaseLayout v-else>
    <p v-if="!userStore.me">Chargement…</p>
    <p v-else>Tu ne fais pas partie de ce channel.</p>
  </BaseLayout>
</template>

<style scoped>
.topbar {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}

.topbar > * {
  pointer-events: auto;
  padding: 0.4rem 0.9rem;
  --sketch-background: var(--background-color);
  text-decoration: none;
}

/* Le filtre Figma du fichier est retiré (pixelisé dans un <img> sur Safari) : on applique le nôtre. */
.chat-icon {
  filter: url(#sketch);
}
</style>
