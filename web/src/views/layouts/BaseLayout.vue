<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const menuOpen = ref(false);
</script>

<template>
  <header>
    <RouterLink :to="{ name: 'home' }" class="logo">Type Swap</RouterLink>

    <div class="profile">
      <button class="avatar" aria-label="Profil" @click="menuOpen = !menuOpen">
        {{ userStore.me?.username.charAt(0).toUpperCase() }}
      </button>

      <template v-if="menuOpen">
        <div class="menu-backdrop" @click="menuOpen = false" />
        <div class="menu">
          <p>{{ userStore.me?.username }}</p>
          <button @click="userStore.logout()">Se déconnecter</button>
        </div>
      </template>
    </div>
  </header>

  <main>
    <slot />
  </main>
</template>

<style scoped>
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0 1rem;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}

.profile {
  position: relative;
}

.avatar {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-radius: 50%;
  font-weight: 600;
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 31;
  min-width: 12rem;
  padding: 0.5rem;
  border: 1px solid var(--text-color);
  border-radius: 1rem;
  background: var(--background-color);
}

.menu p {
  margin: 0;
  padding: 0.5rem;
  opacity: 0.6;
}

.menu button {
  width: 100%;
  border: none;
  border-radius: 0.5rem;
  text-align: left;
  color: var(--red);
}
</style>
