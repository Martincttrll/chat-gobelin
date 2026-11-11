<script setup lang="ts">
import { computed } from "vue";
import { avatarUrl } from "@/core/utils/avatars";

const props = defineProps<{ avatar?: string; username?: string }>();

const url = computed(() => avatarUrl(props.avatar));
const initial = computed(() => props.username?.charAt(0).toUpperCase() ?? "?");
</script>

<template>
  <img v-if="url" class="picture" :src="url" alt="" />
  <span v-else class="picture monogram" aria-hidden="true">{{ initial }}</span>
</template>

<style scoped>
.picture {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.monogram {
  border: 1px solid var(--text-color);
  border-radius: 50%;
  font-weight: 600;
}
</style>
