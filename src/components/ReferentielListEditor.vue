<template>
  <div class="referentiel-list">
    <div class="text-subtitle-2 mb-1">{{ label }}</div>
    <p v-if="hint" class="text-caption text-medium-emphasis mb-2">{{ hint }}</p>
    <v-combobox
      v-model="local"
      multiple
      chips
      closable-chips
      hide-selected
      density="compact"
      :placeholder="placeholder"
      hide-details
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: 'Ajouter une valeur puis Entrée' },
})

const emit = defineEmits(['update:modelValue'])

const local = computed({
  get: () => [...(props.modelValue || [])],
  set: (value) => {
    const next = (Array.isArray(value) ? value : [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
    emit('update:modelValue', next)
  },
})
</script>

<style scoped>
.referentiel-list + .referentiel-list {
  margin-top: 1.25rem;
}
</style>
