<template>
  <v-combobox
    :model-value="modelValue"
    :items="suggestions"
    hide-details
    multiple
    chips
    closable-chips
    :placeholder="placeholder"
    @update:model-value="onUpdate"
  />
</template>

<script setup>
defineProps({
  modelValue: { type: Array, default: () => [] },
  suggestions: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Ajouter…' },
})

const emit = defineEmits(['update:modelValue'])

function onUpdate(value) {
  const list = (Array.isArray(value) ? value : [value])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
  emit('update:modelValue', [...new Set(list)])
}
</script>
