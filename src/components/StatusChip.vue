<template>
  <v-chip size="small" :color="statusColor(status)" variant="tonal">
    {{ status || '—' }}
  </v-chip>
</template>

<script setup>
import { statusColor } from '@/domain/taxonomy'

defineProps({
  status: { type: String, default: '' },
})
</script>
