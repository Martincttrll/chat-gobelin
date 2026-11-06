<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { Channel, Message } from "@/types/api";
import { useUserStore } from "@/stores/user";
import { moodColor } from "@/message-style/moods";
import { getLastSeen } from "@/utils/lastSeen";

const props = defineProps<{ channel: Channel; messages: Message[] }>();

const MAX_DOTS = 3;

const userStore = useUserStore();

const lastMessage = computed(() => props.messages.at(-1));

const unread = computed(() => {
  const lastSeen = getLastSeen(props.channel.id);
  return props.messages.filter(
    (message) =>
      message.user_id !== userStore.me?.id && new Date(message.creation_date) > lastSeen,
  );
});

const dots = computed(() => unread.value.slice(-MAX_DOTS));
const extraCount = computed(() => unread.value.length - dots.value.length);

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
    <span class="avatar">{{ channel.name.charAt(0).toUpperCase() }}</span>

    <div class="info">
      <div class="row">
        <strong class="name">{{ channel.name }}</strong>
        <small class="time" :class="{ fresh: dots.length }">{{ lastTime }}</small>
      </div>

      <div class="row">
        <span v-if="lastMessage" class="last">
          <span class="ball" :style="{ backgroundColor: moodColor(lastMessage.metadata) }" />
          {{ lastMessage.user }}
        </span>
        <span v-else class="last">Aucun message</span>

        <div v-if="dots.length" class="unread">
          <span
            v-for="message in dots"
            :key="message.creation_date"
            class="dot"
            :style="{ backgroundColor: moodColor(message.metadata) }"
          />
          <small v-if="extraCount > 0" class="extra">+{{ extraCount }}</small>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  color: inherit;
  text-decoration: none;
}

.avatar {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 50%;
  border: 1px solid var(--text-color);
  font-size: 1.25rem;
  font-weight: 600;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  flex-shrink: 0;
  opacity: 0.5;
}

.time.fresh {
  opacity: 1;
}

.last {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  opacity: 0.6;
  white-space: nowrap;
}

.ball {
  flex-shrink: 0;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
}

.unread {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.dot {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  border: 2px solid var(--background-color);
}

/* Les dots se chevauchent : le plus récent est à droite, par-dessus. */
.dot + .dot {
  margin-left: -0.55rem;
}

.extra {
  margin-left: 0.3rem;
}
</style>
