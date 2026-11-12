<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { editMyMetadata } from "@/api/users";
import { AVATARS } from "@/core/utils/avatars";
import BaseLayout from "@/layouts/BaseLayout.vue";

const router = useRouter();
const userStore = useUserStore();

const selected = ref(userStore.profile.avatar);
const saving = ref(false);
const error = ref("");

const changed = computed(() => selected.value !== userStore.profile.avatar);

async function apply() {
  error.value = "";
  saving.value = true;
  try {
    // PUT /user remplace tout notre namespace : on renvoie les autres champs tels quels.
    await editMyMetadata({ ...userStore.profile, avatar: selected.value });
    await userStore.fetchMe();
    router.push({ name: "home" });
  } catch {
    error.value = "Impossible d'enregistrer les changements.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseLayout title="Personnalisation" :back="{ name: 'home' }">
    <div class="settings">
      <section>
        <h2>Avatar</h2>
        <div class="avatars">
          <button
            v-for="avatar in AVATARS"
            :key="avatar.id"
            type="button"
            class="plain avatar"
            :class="{ selected: avatar.id === selected }"
            :aria-pressed="avatar.id === selected"
            @click="selected = avatar.id">
            <img :src="avatar.url" alt="" />
          </button>
        </div>
      </section>

      <hr class="sketch-line" />

      <p v-if="error" class="error">{{ error }}</p>

      <button :disabled="!changed || saving" @click="apply">Appliquer les changements</button>
      <button class="plain logout" @click="userStore.logout()">Se déconnecter</button>
    </div>
  </BaseLayout>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0 0.5rem 2rem;
}

h2 {
  margin: 0 0 1rem;
  font-size: 1.3rem;
  font-weight: 400;
}

.avatars {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}

.avatar {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  transition: scale 0.15s ease-out;
}

.avatar img {
  width: 100%;
  height: 100%;
}

.avatar.selected {
  scale: 1.15;
  box-shadow: 0 0 0 2px var(--background-color), 0 0 0 4px var(--text-color);
}

.logout {
  align-self: center;
  color: var(--red);
}

.error {
  margin: 0;
  color: var(--red);
}
</style>
