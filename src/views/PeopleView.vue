<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Personnes</h1>
      <v-spacer />
      <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary" class="mr-2">
        <v-btn value="liste" size="small">Liste</v-btn>
        <v-btn value="promotions" size="small">Promotions</v-btn>
      </v-btn-toggle>
      <v-btn v-if="auth.can('people.write')" color="primary" to="/personnes/nouvelle" prepend-icon="mdi-plus">
        Ajouter
      </v-btn>
    </div>

    <v-alert
      v-if="auth.can('people.write') && inventory.stats?.pendingMembers"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      {{ inventory.stats.pendingMembers }} inscription(s) en attente de rangement.
      <router-link to="/a-ranger">Ouvrir la file</router-link>
    </v-alert>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="filters.search"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select v-model="filters.annee" :items="yearItems" label="Année" hide-details />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filters.role" :items="roleItems" label="Groupe / rôle" hide-details />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filters.tri" :items="sortItems" label="Tri" hide-details />
      </v-col>
    </v-row>

    <div class="d-flex align-center ga-2 mb-4">
      <span class="text-body-2 text-medium-emphasis">{{ sortedPeople.length }} personne(s)</span>
      <v-spacer />
      <v-btn v-if="hasActiveFilters" variant="text" size="small" color="error" @click="resetFilters">
        Réinitialiser
      </v-btn>
    </div>

    <template v-if="viewMode === 'liste'">
      <v-row>
        <v-col v-for="person in sortedPeople" :key="person.id" cols="12" sm="6" md="4" lg="3">
          <PersonCard :person="person" />
        </v-col>
        <v-col v-if="!sortedPeople.length" cols="12">
          <v-alert type="info" variant="tonal">
            {{ inventory.people.length ? 'Aucune personne ne correspond.' : 'Aucune personne enregistrée.' }}
          </v-alert>
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <p v-if="!promotionSections.length" class="text-medium-emphasis">
        Aucune personne à afficher pour ces filtres.
      </p>
      <div v-for="section in promotionSections" :key="section.year" class="promotion-year page-block">
        <h2 class="section-label">{{ section.year }}</h2>
        <div v-for="group in section.groups" :key="`${section.year}-${group.role}`" class="promotion-group">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            {{ group.label }}
            <span class="text-medium-emphasis font-weight-regular">({{ group.people.length }})</span>
          </div>
          <v-row>
            <v-col v-for="person in group.people" :key="person.id" cols="12" sm="6" md="4" lg="3">
              <PersonCard :person="person" />
            </v-col>
          </v-row>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import {
  PERSON_ROLES,
  availablePersonYears,
  filterPeople,
  groupPeopleByPromotion,
  sortPeople,
} from '@/domain/person'
import PersonCard from '@/components/PersonCard.vue'

const inventory = useInventoryStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const viewMode = computed({
  get: () => (route.query.vue === 'promotions' ? 'promotions' : 'liste'),
  set: (value) => updateQuery({ vue: value === 'promotions' ? 'promotions' : undefined }),
})

function defaultFilters() {
  return {
    search: '',
    annee: route.query.annee || 'Toutes',
    role: route.query.role || 'Tous',
    tri: route.query.tri || 'nom',
  }
}

const filters = reactive(defaultFilters())

watch(
  () => route.query,
  () => {
    filters.annee = route.query.annee || 'Toutes'
    filters.role = route.query.role || 'Tous'
    filters.tri = route.query.tri || 'nom'
  },
)

watch(
  () => [filters.annee, filters.role, filters.tri],
  () => {
    updateQuery({
      annee: filters.annee !== 'Toutes' ? filters.annee : undefined,
      role: filters.role !== 'Tous' ? filters.role : undefined,
      tri: filters.tri !== 'nom' ? filters.tri : undefined,
    })
  },
)

function updateQuery(patch) {
  const query = { ...route.query }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query[key] = value
    else delete query[key]
  }
  router.replace({ query })
}

const yearItems = computed(() => [
  { title: 'Toutes les années', value: 'Toutes' },
  ...availablePersonYears(inventory.people).map((year) => ({ title: year, value: year })),
])

const roleItems = computed(() => [
  { title: 'Tous les groupes', value: 'Tous' },
  ...PERSON_ROLES.map((role) => ({ title: role.label, value: role.id })),
])

const sortItems = [
  { title: 'Nom', value: 'nom' },
  { title: 'Année', value: 'annee' },
  { title: 'Groupe', value: 'groupe' },
]

const filteredPeople = computed(() => filterPeople(inventory.people, filters))

const sortedPeople = computed(() => sortPeople(filteredPeople.value, filters.tri))

const promotionSections = computed(() =>
  groupPeopleByPromotion(filteredPeople.value, { annee: filters.annee }),
)

const hasActiveFilters = computed(
  () =>
    Boolean(filters.search.trim()) ||
    filters.annee !== 'Toutes' ||
    filters.role !== 'Tous' ||
    filters.tri !== 'nom',
)

function resetFilters() {
  filters.search = ''
  filters.annee = 'Toutes'
  filters.role = 'Tous'
  filters.tri = 'nom'
  router.replace({ query: { vue: viewMode.value === 'promotions' ? 'promotions' : undefined } })
}

onMounted(() => inventory.refresh().catch(() => {}))
</script>

<style scoped>
.promotion-year + .promotion-year {
  margin-top: 2rem;
}
.promotion-group + .promotion-group {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(44, 51, 74, 0.08);
}
</style>
