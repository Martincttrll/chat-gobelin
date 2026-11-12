<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { Channel, Message } from "@/types/api";
import { useUserStore } from "@/stores/user";
import { moodColor, moodSecondaryColor } from "@/core/message-style/moods";
import { isVisible } from "@/api/messages";

const props = defineProps<{ channel: Channel; messages: Message[] }>();

const MAX_BALLS = 4;

const userStore = useUserStore();

const visible = computed(() => props.messages.filter(isVisible));
const lastMessage = computed(() => visible.value.at(-1));

// Messages des autres encore au sol (pas encore ramassés).
const unread = computed(() =>
  visible.value.filter(
    (message) => message.user_id !== userStore.me?.id && message.metadata?.pickedUp === false,
  ),
);

// Le plus récent devant (à gauche), les plus anciens derrière, de plus en plus flous.
const balls = computed(() => unread.value.slice(-MAX_BALLS).reverse());
const countLabel = computed(() => (unread.value.length > 9 ? "9+" : String(unread.value.length)));

const lastTime = computed(() => {
  if (!lastMessage.value) return "";
  const date = new Date(lastMessage.value.creation_date);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
});
</script>

<template>
  <RouterLink class="item" :to="{ name: 'channel', params: { name: channel.name } }">
    <span class="avatar sketch">{{ channel.name.charAt(0).toUpperCase() }}</span>

    <div class="info">
      <span class="name">{{ channel.name }}</span>
      <span v-if="lastMessage" class="last">
        <span class="sender-ball" :style="{ backgroundColor: moodColor(lastMessage.metadata) }" />
        {{ lastMessage.user }} · {{ lastTime }}
      </span>
      <span v-else class="last">Aucun message</span>
    </div>

    <div v-if="balls.length" class="unread">
      <span
        v-for="(message, i) in balls"
        :key="message.id"
        class="ball"
        :style="{
          '--color': moodColor(message.metadata),
          '--glow': moodSecondaryColor(message.metadata),
          '--i': i,
          zIndex: balls.length - i,
        }">
        <template v-if="i === 0 && unread.length > 1">{{ countLabel }}</template>
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  color: inherit;
  text-decoration: none;
}

.avatar {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name {
  overflow: hidden;
  font-size: 1.2rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  font-size: 0.8rem;
  opacity: 0.5;
  white-space: nowrap;
}

.sender-ball {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.unread {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.ball {
  position: relative;
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  background: var(--color);
  box-shadow: 0 0 0.8rem var(--glow);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  text-shadow: 0 0 3px rgb(0 0 0 / 0.5);
}

.ball + .ball {
  margin-left: -1.1rem;
}

/* --i = rang de la boule (0 devant) : chaque boule est un cran plus sombre que la précédente
   (brightness plutôt qu'opacity, pour ne pas voir à travers). */
.ball {
  --brightness-step: 0.15;
  filter: brightness(calc(1 - var(--i) * var(--brightness-step)));
}

/* Figma : layer blur 1.8 sur les boules de derrière ; le blur CSS vaut environ la moitié de la valeur Figma. */
.ball + .ball {
  filter: blur(0.9px) brightness(calc(1 - var(--i) * var(--brightness-step)));
}
</style>
