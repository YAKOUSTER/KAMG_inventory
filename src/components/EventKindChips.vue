<template>
  <div class="event-kind-chips d-flex flex-wrap ga-1 align-center">
    <v-chip
      v-for="chip in chips"
      :key="chip.id"
      :size="size"
      :color="chip.color"
      variant="tonal"
    >
      {{ chip.label }}
    </v-chip>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { eventDisplayChips } from '@/domain/events'

const props = defineProps({
  event: { type: Object, default: null },
  size: { type: String, default: 'x-small' },
})

const chips = computed(() => eventDisplayChips(props.event))
</script>
