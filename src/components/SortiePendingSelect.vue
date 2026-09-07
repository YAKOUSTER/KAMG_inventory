<template>
  <v-select
    :model-value="modelValue"
    :items="selectItems(options)"
    hide-details
    density="compact"
    variant="solo"
    bg-color="#ececec"
    rounded="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #selection="{ item }">
      <SortieReadValue :pending="item.raw?.pending" :label="item.title" />
    </template>
    <template #item="{ item, props: itemProps }">
      <v-list-item v-bind="itemProps">
        <template v-if="item.raw?.pending" #prepend>
          <v-icon size="16" color="#c9a227">mdi-timer-sand</v-icon>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script setup>
import { selectItems } from '@/domain/sortie'
import SortieReadValue from '@/components/SortieReadValue.vue'

defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, required: true },
})

const emit = defineEmits(['update:modelValue'])
</script>
