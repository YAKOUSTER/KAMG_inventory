<template>
  <span class="sortie-read">
    <v-icon v-if="isPending" size="16" color="#c9a227">mdi-timer-sand</v-icon>
    {{ text }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { optionIsPending, optionLabel } from '@/domain/sortie'

const props = defineProps({
  options: { type: Array, default: null },
  id: { type: String, default: '' },
  pending: { type: Boolean, default: false },
  label: { type: String, default: '' },
})

const text = computed(() => props.label || optionLabel(props.options || [], props.id) || '—')
const isPending = computed(() =>
  props.label ? props.pending : optionIsPending(props.options || [], props.id),
)
</script>

<style scoped>
.sortie-read {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
