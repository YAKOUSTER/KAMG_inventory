<template>
  <div class="field-row" :class="{ 'field-row--top': alignTop }">
    <div class="field-row__label">
      <span>{{ label }}</span>
      <span v-if="hint" class="field-row__hint">{{ hint }}</span>
    </div>
    <div class="field-row__control">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  alignTop: { type: Boolean, default: false },
})
</script>
