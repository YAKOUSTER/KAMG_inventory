<template>
  <img
    v-if="currentSrc"
    :src="currentSrc"
    :alt="alt"
    :loading="loading"
    class="cover-image"
    @error="nextFallback"
  />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { driveImageFallbackUrls } from '@/domain/mediaUrls'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  loading: { type: String, default: 'lazy' },
})

const index = ref(0)
const urls = computed(() => driveImageFallbackUrls(props.src))
const currentSrc = computed(() => urls.value[index.value] || '')

watch(
  () => props.src,
  () => {
    index.value = 0
  },
)

function nextFallback() {
  if (index.value < urls.value.length - 1) index.value += 1
}
</script>

<style scoped>
.cover-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
