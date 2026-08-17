<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h1 class="text-h5 text-md-h4 page-title">Personnes</h1>
      <v-spacer />
      <v-btn v-if="auth.can('people.write')" color="primary" to="/personnes/nouvelle" prepend-icon="mdi-plus">
        Ajouter
      </v-btn>
    </div>

    <v-text-field v-model="search" class="mb-4" prepend-inner-icon="mdi-magnify" label="Rechercher" hide-details clearable />

    <v-row>
      <v-col v-for="person in filtered" :key="person.id" cols="12" sm="6" md="4" lg="3">
        <router-link class="person-link" :to="{ name: 'person-detail', params: { id: person.id } }">
          <div class="thumb" :style="{ backgroundImage: coverSrc(person) ? `url(${coverSrc(person)})` : 'none' }">
            <v-icon v-if="!coverSrc(person)" size="40" color="primary">mdi-account</v-icon>
          </div>
          <div class="pt-3">
            <div class="text-subtitle-1 font-weight-bold">{{ personDisplayName(person) }}</div>
            <div v-if="personRolesLabel(person)" class="text-body-2">{{ personRolesLabel(person) }}</div>
            <div v-if="person.tailleLettre" class="text-caption">Taille {{ person.tailleLettre }}</div>
          </div>
        </router-link>
      </v-col>
      <v-col v-if="!filtered.length" cols="12">
        <v-alert type="info" variant="tonal">
          {{ inventory.people.length ? 'Aucune personne ne correspond.' : 'Aucune personne enregistrée.' }}
        </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { coverSrc } from '@/domain/images'
import { personDisplayName, personRolesLabel } from '@/domain/person'

const inventory = useInventoryStore()
const auth = useAuthStore()
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return [...inventory.people]
    .sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), 'fr'))
    .filter((person) => {
      if (!q) return true
      const haystack = [
        person.prenom,
        person.nom,
        personRolesLabel(person),
        person.email,
        person.telephone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
})

onMounted(() => inventory.refresh().catch(() => {}))
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
