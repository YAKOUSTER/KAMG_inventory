<template>
  <div>
    <v-row>
      <v-col v-if="showSearch" cols="12" md="4">
        <v-text-field
          v-model="filters.search"
          prepend-inner-icon="mdi-magnify"
          label="Recherche (code, nom, matière, tags…)"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select v-model="filters.categorie" :items="categoryItems" label="Catégorie" hide-details />
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          v-model="filters.disponibilite"
          :items="withAll(referentiels.disponibilites)"
          label="Disponibilité"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select v-model="filters.epoque" :items="withAll(referentiels.epoques)" label="Époque" hide-details />
      </v-col>
      <v-col cols="12" md="2">
        <v-select v-model="filters.etat" :items="withAll(referentiels.etats)" label="État" hide-details />
      </v-col>
      <v-col cols="12" md="2">
        <v-select v-model="filters.local" :items="localItems" label="Local" hide-details />
      </v-col>
      <v-col cols="12" md="2">
        <v-checkbox v-model="filters.stockBas" label="Stock bas / rupture" hide-details density="compact" />
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

    <div class="d-flex ga-2 mt-3 align-center">
      <v-btn variant="text" size="small" @click="showMeasures = !showMeasures">
        {{ showMeasures ? 'Masquer les mesures' : 'Filtres mesures' }}
      </v-btn>
      <v-btn variant="text" size="small" color="error" @click="$emit('reset')">Réinitialiser</v-btn>
      <v-spacer />
      <span class="text-body-2 text-medium-emphasis">{{ resultCount }} fiche(s)</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MEASUREMENT_FIELDS, STORAGE_LOCALS } from '@/domain/taxonomy'

defineProps({
  filters: { type: Object, required: true },
  categoryItems: { type: Array, required: true },
  referentiels: { type: Object, required: true },
  resultCount: { type: Number, default: 0 },
  showSearch: { type: Boolean, default: true },
})

defineEmits(['reset'])

const showMeasures = defineModel('showMeasures', { type: Boolean, default: false })

const withAll = (list) => ['Tout', ...list]
const localItems = computed(() => [
  { title: 'Tout', value: 'Tout' },
  ...STORAGE_LOCALS.map((entry) => ({ title: entry.label, value: entry.id })),
])
</script>
