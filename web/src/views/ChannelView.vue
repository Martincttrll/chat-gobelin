<script>
import { ref } from "vue";
import { useUserStore } from "@/stores/user";
import { useRoute } from "vue-router";
import { useChannelStore } from "@/stores/channel";
</script>

<template>
  <main>
    <header>
      <p>
        Connecté en tant que <strong>{{ userStore.me?.username }}</strong>
      </p>
      <button @click="userStore.logout()">Se déconnecter</button>
    </header>

    <h2>Channel: {{ channelStore.currentChannel?.name }}</h2>
    <ul>
      <li
        v-for="message in channelStore.currentChannel?.messages"
        :key="message.id">
        <strong>{{ message.user.username }}:</strong> {{ message.content }}
      </li>
    </ul>
  </main>
</template>
