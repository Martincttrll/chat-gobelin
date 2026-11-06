<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useUserStore } from "@/stores/user";
import { getMessages } from "@/api/messages";
import type { Message } from "@/types/api";
import BaseLayout from "@/layouts/BaseLayout.vue";
import ChannelItem from "@/components/ChannelItem.vue";
import NewChannelSheet from "@/components/NewChannelSheet.vue";

const userStore = useUserStore();

const sheetOpen = ref(false);
const messagesByChannel = ref<Record<number, Message[]>>({});

async function loadMessages() {
  const channels = userStore.me?.channels ?? [];
  const lists = await Promise.all(channels.map((channel) => getMessages(channel.id)));
  messagesByChannel.value = Object.fromEntries(
    channels.map((channel, i) => [channel.id, lists[i]!]),
  );
}

// /me est chargé de façon asynchrone : la liste des channels peut arriver après le montage.
watch(() => userStore.me?.channels.length, loadMessages, { immediate: true });

// Pas encore de WebSocket côté API : on recharge les messages toutes les 3 s.
let timer: number;
onMounted(() => {
  timer = setInterval(loadMessages, 3000);
});
onUnmounted(() => {
  clearInterval(timer);
});
</script>

<template>
  <BaseLayout>
    <p v-if="userStore.me?.channels.length === 0" class="empty">
      Tu n'as encore rejoint aucun channel.<br />
      Appuie sur + pour en créer ou en rejoindre un.
    </p>

    <ul class="channels">
      <li v-for="channel in userStore.me?.channels" :key="channel.id">
        <ChannelItem :channel="channel" :messages="messagesByChannel[channel.id] ?? []" />
      </li>
    </ul>

    <button class="fab" aria-label="Nouveau channel" @click="sheetOpen = true">+</button>

    <!-- :duration car les transitions sont sur les enfants (fond, panneau), pas sur la racine. -->
    <Transition name="sheet" :duration="{ enter: 300, leave: 200 }">
      <NewChannelSheet v-if="sheetOpen" @close="sheetOpen = false" />
    </Transition>
  </BaseLayout>
</template>

<style scoped>
.channels {
  list-style: none;
  margin: 0;
  padding: 0 0 6rem;
}

.empty {
  margin-top: 30vh;
  text-align: center;
  opacity: 0.6;
}

.fab {
  position: fixed;
  right: 1.25rem;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  z-index: 10;
  width: 3.5rem;
  height: 3.5rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--background-color);
  font-size: 2rem;
  line-height: 1;
}
</style>
