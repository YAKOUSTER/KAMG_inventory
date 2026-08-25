<template>
  <router-link class="person-link kamg-card" :to="{ name: 'person-detail', params: { id: person.id } }">
    <div class="thumb" :style="{ backgroundImage: cover ? `url(${cover})` : 'none' }">
      <v-icon v-if="!cover" size="40" color="primary">mdi-account</v-icon>
    </div>
    <div class="person-link__body">
      <div class="text-subtitle-1 font-weight-bold">{{ personDisplayName(person) }}</div>
      <div v-if="personRolesLabel(person)" class="text-body-2 text-medium-emphasis">{{ personRolesLabel(person) }}</div>
      <div v-if="person.tailleLettre" class="text-caption text-medium-emphasis">Taille {{ person.tailleLettre }}</div>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import { coverSrc } from '@/domain/images'
import { personDisplayName, personRolesLabel } from '@/domain/person'

const props = defineProps({
  person: { type: Object, required: true },
})

const cover = computed(() => coverSrc(props.person))
</script>

<style scoped>
.person-link {
  display: block;
  color: inherit;
  text-decoration: none;
  padding: 10px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.person-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--kamg-shadow-hover);
}
.person-link__body {
  padding-top: 10px;
}
.thumb {
  height: 140px;
  background: var(--kamg-linen) center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
}
</style>
