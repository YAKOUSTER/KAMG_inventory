<template>
  <v-card class="h-100 hover-card" :to="{ name: 'item-detail', params: { id: item.id } }" variant="outlined">
    <div class="thumb" :style="{ backgroundImage: cover ? `url(${cover})` : 'none' }">
      <v-icon v-if="!cover" size="40" color="primary">{{ categoryIcon(item.categorie) }}</v-icon>
    </div>
    <v-card-text>
      <div class="text-caption text-medium-emphasis">{{ item.code }} · {{ categoryLabel(item.categorie) }}</div>
      <div class="text-subtitle-1 font-weight-bold">{{ item.nom }}</div>
      <div class="text-body-2 mt-1">{{ item.type }}</div>
      <StatusChip class="mt-2" :status="item.disponibilite" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { categoryIcon, categoryLabel } from '@/domain/taxonomy'
import { coverSrc } from '@/domain/images'
import StatusChip from './StatusChip.vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const cover = computed(() => coverSrc(props.item))
</script>

<style scoped>
.hover-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  text-decoration: none;
}
.hover-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(83, 115, 106, 0.12);
}
.thumb {
  height: 140px;
  background: #edede5 center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
