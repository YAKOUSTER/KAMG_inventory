<template>
  <div class="detail-row">
    <span class="detail-row__label">{{ label }}</span>
    <span class="detail-row__value"><slot>{{ value }}</slot></span>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '' },
})
</script>
