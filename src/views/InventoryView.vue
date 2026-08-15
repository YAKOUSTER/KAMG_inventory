<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h1 class="text-h4 page-title">Inventaire</h1>
      <v-spacer />
      <v-btn variant="tonal" @click="tableView = !tableView">
        {{ tableView ? 'Cartes' : 'Tableau' }}
      </v-btn>
      <v-btn v-if="auth.can('items.create')" color="primary" to="/pieces/nouvelle" prepend-icon="mdi-plus">
        Nouvelle fiche
      </v-btn>
    </div>

    <v-card class="mb-4 pa-4" variant="outlined">
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field v-model="filters.search" prepend-inner-icon="mdi-magnify" label="Recherche (code, nom, matière, tags…)" hide-details clearable />
        </v-col>
        <v-col cols="12" md="2">
          <v-select v-model="filters.categorie" :items="categoryItems" label="Catégorie" hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-select v-model="filters.disponibilite" :items="withAll(DEFAULT_REFERENTIELS.disponibilites)" label="Disponibilité" hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-select v-model="filters.epoque" :items="withAll(DEFAULT_REFERENTIELS.epoques)" label="Époque" hide-details />
        </v-col>
        <v-col cols="12" md="2">
          <v-select v-model="filters.etat" :items="withAll(DEFAULT_REFERENTIELS.etats)" label="État" hide-details />
        </v-col>
      </v-row>
      <v-expand-transition>
        <div v-if="showMeasures" class="mt-4">
          <v-row>
            <v-col v-for="field in MEASUREMENT_FIELDS" :key="field.key" cols="12" md="6" lg="4">
              <v-range-slider
                v-model="filters[field.key]"
                :min="0"
                :max="field.max"
                :label="field.label"
                step="1"
                thumb-label
              />
            </v-col>
          </v-row>
        </div>
      </v-expand-transition>
      <div class="d-flex ga-2 mt-3">
        <v-btn variant="text" size="small" @click="showMeasures = !showMeasures">
          {{ showMeasures ? 'Masquer les mesures' : 'Filtres mesures' }}
        </v-btn>
        <v-btn variant="text" size="small" color="error" @click="resetFilters">Réinitialiser</v-btn>
        <v-spacer />
        <span class="text-body-2 text-medium-emphasis">{{ filtered.length }} fiche(s)</span>
      </div>
    </v-card>

    <v-data-table
      v-if="tableView"
      :headers="headers"
      :items="filtered"
      item-value="id"
      hover
      @click:row="(_e, { item }) => $router.push({ name: 'item-detail', params: { id: item.id } })"
    >
      <template #item.photo="{ item }">
        <v-avatar v-if="coverSrc(item)" rounded size="40">
          <v-img :src="coverSrc(item)" cover />
        </v-avatar>
        <v-icon v-else size="20" color="primary">mdi-image-off-outline</v-icon>
      </template>
      <template #item.categorie="{ item }">{{ categoryLabel(item.categorie) }}</template>
      <template #item.disponibilite="{ item }">
        <StatusChip :status="item.disponibilite" />
      </template>
    </v-data-table>

    <v-row v-else>
      <v-col v-for="item in filtered" :key="item.id" cols="12" sm="6" md="4" lg="3">
        <ItemCard :item="item" />
      </v-col>
      <v-col v-if="!filtered.length" cols="12">
        <v-alert type="info" variant="tonal">Aucune fiche ne correspond aux filtres.</v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES, DEFAULT_REFERENTIELS, MEASUREMENT_FIELDS, categoryLabel } from '@/domain/taxonomy'
import { coverSrc } from '@/domain/images'
import { filterItems } from '@/domain/filters'
import ItemCard from '@/components/ItemCard.vue'
import StatusChip from '@/components/StatusChip.vue'

const inventory = useInventoryStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const display = useDisplay()
const tableView = ref(display.mdAndUp.value)
const showMeasures = ref(false)

function defaultFilters() {
  return {
    search: '',
    categorie: route.query.categorie || 'Tout',
    disponibilite: 'Tout',
    epoque: 'Tout',
    etat: 'Tout',
    couleur: 'Tout',
    taille: 'Tout',
    type: 'Tout',
    longueur: [0, 180],
    tourTailleMin: [0, 150],
    tourTailleMax: [0, 150],
    longueurDos: [0, 100],
    longueurAvant: [0, 100],
    tourJupe: [0, 400],
    longueurEpauleEpaule: [0, 80],
    longueurManche: [0, 80],
    tourTete: [0, 80],
  }
}

const filters = reactive(defaultFilters())

watch(
  () => route.query.categorie,
  (value) => {
    filters.categorie = value || 'Tout'
  },
)

const categoryItems = [{ title: 'Tout', value: 'Tout' }, ...CATEGORIES.map((c) => ({ title: c.label, value: c.id }))]
const withAll = (list) => ['Tout', ...list]
const filtered = computed(() => filterItems(inventory.items, filters))

const headers = [
  { title: '', key: 'photo', sortable: false, width: 56 },
  { title: 'Code', key: 'code' },
  { title: 'Nom', key: 'nom' },
  { title: 'Catégorie', key: 'categorie' },
  { title: 'Type', key: 'type' },
  { title: 'Époque', key: 'epoque' },
  { title: 'État', key: 'etat' },
  { title: 'Disponibilité', key: 'disponibilite' },
]

function resetFilters() {
  Object.assign(filters, defaultFilters(), { categorie: 'Tout' })
  router.replace({ path: '/inventaire' })
}

onMounted(() => inventory.refresh().catch(() => {}))
</script>
