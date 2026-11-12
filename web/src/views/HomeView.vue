<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useUserStore } from "@/stores/user";
import { applyMessageEvent, getMessages } from "@/api/messages";
import { listenChannels } from "@/api/socket";
import type { Message } from "@/types/api";
import BaseLayout from "@/layouts/BaseLayout.vue";
import ChannelItem from "@/components/ChannelItem.vue";
import NewChannelSheet from "@/components/NewChannelSheet.vue";
import ProfilePicture from "@/components/ProfilePicture.vue";
import OnboardingHint from "@/components/OnboardingHint.vue";
import { isOnboardingDone, markOnboardingDone } from "@/core/onboarding/onboarding";

const userStore = useUserStore();

const sheetOpen = ref(false);
const messagesByChannel = ref<Record<number, Message[]>>({});
const search = ref("");
const onboarding = ref(!isOnboardingDone("home"));

function openSheet() {
  sheetOpen.value = true;
  if (!onboarding.value) return;
  onboarding.value = false;
  markOnboardingDone("home");
}

// Sans casse ni accents : « eleve » trouve « Élève ».
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const visibleChannels = computed(() => {
  const query = normalize(search.value.trim());
  return userStore.channels.filter((channel) => normalize(channel.name).includes(query));
});

async function loadMessages() {
  const channels = userStore.channels;
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

let stopListening: (() => void) | undefined;

// /me est chargé de façon asynchrone : la liste des channels peut arriver après le montage.
watch(
  () => userStore.channels.length,
  () => {
    stopListening?.();
    loadMessages();
    const ids = userStore.channels.map((channel) => channel.id);
    if (ids.length === 0) return;
    stopListening = listenChannels(
      ids,
      (event) => {
        const id = event.channel_id as number | undefined;
        if (id === undefined || !messagesByChannel.value[id]) return;
        messagesByChannel.value[id] = applyMessageEvent(messagesByChannel.value[id], event);
      },
      loadMessages,
    );
  },
  { immediate: true },
);

onUnmounted(() => stopListening?.());
</script>

<template>
  <BaseLayout title="Discussions">
    <template #actions>
      <RouterLink :to="{ name: 'settings' }" class="profile" aria-label="Personnalisation">
        <ProfilePicture :avatar="userStore.profile.avatar" :username="userStore.me?.username" />
        <img class="edit-badge sketch-icon" src="@/assets/img/pencil.svg" alt="" />
      </RouterLink>
    </template>

    <p v-if="userStore.me && userStore.channels.length === 0" class="empty">
      Tu n'as encore rejoint aucun channel.<br />
      Touche le bouton en bas à droite pour en créer ou en rejoindre un.
    </p>

    <span v-if="userStore.channels.length" class="field search">
      <input v-model="search" type="search" placeholder="Rechercher une discussion" />
    </span>

    <p v-if="search.trim() && visibleChannels.length === 0" class="empty">
      Aucune discussion ne correspond.
    </p>

    <ul class="channels">
      <li v-for="channel in visibleChannels" :key="channel.id">
        <ChannelItem :channel="channel" :messages="messagesByChannel[channel.id] ?? []" />
      </li>
    </ul>

    <button
      class="plain new-conv"
      data-onboarding="new-conv"
      aria-label="Créer ou rejoindre un channel"
      @click="openSheet">
      <img class="sketch-icon" src="@/assets/img/new-conv.svg" alt="" />
    </button>

    <OnboardingHint
      v-if="onboarding"
      target="new-conv"
      shape="circle"
      text="Clique ici pour rejoindre une discussion" />

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

.search {
  margin: 0 0.5rem 0.75rem;
}

.search input {
  padding: 0.5rem 1.25rem;
}

.search + .empty {
  margin-top: 3rem;
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
