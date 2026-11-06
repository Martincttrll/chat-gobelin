<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import gsap from "gsap";
import type { Message, MessageMetadata } from "@/types/api";
import { MOODS } from "@/core/message-style/moods";
import { getLetterStyle, getMessageStyle, pauseToGap } from "@/core/message-style/messageStyle";

const props = defineProps<{ message: Message }>();

const DEFAULT_METADATA: MessageMetadata = { mood: "neutral", typingSpeed: 0, pauses: [] };

const metadata = computed(() => props.message.metadata ?? DEFAULT_METADATA);
const mood = computed(() => MOODS[metadata.value.mood] ?? MOODS.neutral);

const words = computed(() => {
  let index = 0;
  return props.message.content
    .split(" ")
    .filter(Boolean)
    .map((word, i) => ({
      gap: pauseToGap(metadata.value.pauses[i]),
      letters: [...word].map((char) => ({ char, index: index++ })),
    }));
});

const letterCount = computed(() =>
  words.value.reduce((total, word) => total + word.letters.length, 0),
);

const root = ref<HTMLElement>();
let animation: gsap.Context | undefined;

onMounted(() => {
  if (mood.value.animation === "dance") {
    animation = gsap.context(() => {
      gsap.to(".letter", {
        y: -4,
        duration: 0.3,
        ease: "sine.inOut",
        stagger: { each: 0.06, repeat: -1, yoyo: true },
      });
    }, root.value);
  }
});

onUnmounted(() => {
  animation?.revert();
});
</script>

<template>
  <div ref="root" class="bubble" :style="{ backgroundColor: mood.color ?? undefined }">
    <p :style="getMessageStyle(metadata.mood, metadata.typingSpeed)">
      <template v-for="(word, w) in words" :key="w">
        <span class="word" :style="{ marginRight: word.gap }">
          <span
            v-for="letter in word.letters"
            :key="letter.index"
            class="letter"
            :style="getLetterStyle(metadata.mood, letter.index, letterCount)"
            >{{ letter.char }}</span
          >
        </span>
        {{ " " }}
      </template>
    </p>
  </div>
</template>

<style scoped>
.bubble {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  border-radius: 1rem;
  border: 1px solid var(--text-color);
}

p {
  margin: 0;
}

.word,
.letter {
  display: inline-block;
}
</style>
