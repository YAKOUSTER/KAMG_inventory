<template>
  <v-chip :size="size" :color="statusColor(status)" :variant="variant">
    {{ status || '—' }}
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'
import { statusColor } from '@/domain/taxonomy'

const props = defineProps({
  status: { type: String, default: '' },
  size: { type: String, default: 'small' },
})

const variant = computed(() => (props.size === 'x-small' ? 'flat' : 'tonal'))
</script>
