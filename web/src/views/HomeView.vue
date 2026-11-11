<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useUserStore } from "@/stores/user";
import { getMessages } from "@/api/messages";
import type { Message } from "@/types/api";
import BaseLayout from "@/layouts/BaseLayout.vue";
import ChannelItem from "@/components/ChannelItem.vue";
import NewChannelSheet from "@/components/NewChannelSheet.vue";
import ProfilePicture from "@/components/ProfilePicture.vue";

const userStore = useUserStore();

const sheetOpen = ref(false);
const messagesByChannel = ref<Record<number, Message[]>>({});

async function loadMessages() {
  const channels = userStore.me?.channels ?? [];
  // allSettled : un channel en erreur (ex. « general » quand l'horloge du back écrit des metadata
  // invalides) ne doit pas vider la liste des autres.
  const results = await Promise.allSettled(channels.map((channel) => getMessages(channel.id)));
  messagesByChannel.value = Object.fromEntries(
    channels.map((channel, i) => {
      const result = results[i]!;
      const previous = messagesByChannel.value[channel.id] ?? [];
      return [channel.id, result.status === "fulfilled" ? result.value : previous];
    }),
  );
}

// /me est chargé de façon asynchrone : la liste des channels peut arriver après le montage.
watch(() => userStore.me?.channels.length, loadMessages, { immediate: true });

// Pas encore de WebSocket côté API : on recharge les messages toutes les 3 s.
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  timer = setInterval(loadMessages, 3000);
});
onUnmounted(() => {
  clearInterval(timer);
});
</script>

<template>
  <BaseLayout title="Discussions">
    <template #actions>
      <RouterLink :to="{ name: 'settings' }" class="profile" aria-label="Personnalisation">
        <ProfilePicture :avatar="userStore.profile.avatar" :username="userStore.me?.username" />
        <img class="edit-badge" src="@/assets/img/pencil.svg" alt="" />
      </RouterLink>
    </template>

    <p v-if="userStore.me?.channels.length === 0" class="empty">
      Tu n'as encore rejoint aucun channel.<br />
      Touche le bouton en bas à droite pour en créer ou en rejoindre un.
    </p>

    <ul class="channels">
      <li v-for="channel in userStore.me?.channels" :key="channel.id">
        <ChannelItem :channel="channel" :messages="messagesByChannel[channel.id] ?? []" />
      </li>
    </ul>

    <button class="plain new-conv" aria-label="Créer ou rejoindre un channel" @click="sheetOpen = true">
      <img src="@/assets/img/new-conv.svg" alt="" />
    </button>

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
  padding: 0 0.5rem 6.5rem;
}

/* Séparateur dessiné à la main : trait de 1px au milieu d'une boîte plus haute, pour que le filtre ne le coupe pas. */
.channels li + li::before {
  content: "";
  display: block;
  height: 0.5rem;
  background: linear-gradient(
      color-mix(in srgb, var(--text-color) 30%, transparent),
      color-mix(in srgb, var(--text-color) 30%, transparent)
    )
    center / 100% 1px no-repeat;
  filter: url(#sketch-strong);
}

.empty {
  margin-top: 30vh;
  text-align: center;
  opacity: 0.6;
}

.profile {
  position: relative;
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.1rem;
  text-decoration: none;
}

.edit-badge {
  position: absolute;
  right: -0.25rem;
  bottom: -0.25rem;
  width: 1rem;
  height: 1rem;
}

.new-conv {
  position: fixed;
  right: 1.25rem;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  z-index: 10;
}

.new-conv img {
  display: block;
  width: 4.5rem;
  height: 4.5rem;
}
</style>
