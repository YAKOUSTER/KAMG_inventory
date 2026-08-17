<template>
  <router-link class="person-link" :to="{ name: 'person-detail', params: { id: person.id } }">
    <div class="thumb" :style="{ backgroundImage: cover ? `url(${cover})` : 'none' }">
      <v-icon v-if="!cover" size="40" color="primary">mdi-account</v-icon>
    </div>
    <div class="pt-3">
      <div class="text-subtitle-1 font-weight-bold">{{ personDisplayName(person) }}</div>
      <div v-if="personRolesLabel(person)" class="text-body-2">{{ personRolesLabel(person) }}</div>
      <div v-if="person.tailleLettre" class="text-caption">Taille {{ person.tailleLettre }}</div>
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
}
.person-link:hover .text-subtitle-1 {
  color: #53736a;
}
.thumb {
  height: 140px;
  background: #edede5 center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}
</style>
