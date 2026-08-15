<template>
  <div>
    <h1 class="text-h5 text-md-h4 page-title mb-4">Emprunts</h1>
    <v-row class="mb-2">
      <v-col cols="12" sm="6" md="4">
        <v-select v-model="personId" :items="peopleItems" label="Personne" hide-details />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-select v-model="status" :items="statusItems" label="Statut" hide-details />
      </v-col>
    </v-row>

    <v-data-table
      v-if="display.mdAndUp"
      class="mt-4"
      :headers="headers"
      :items="filtered"
      item-value="id"
      hover
      @click:row="(_e, { item }) => go(item)"
    >
      <template #item.statut="{ item }">
        <v-chip size="small" :color="statusColor(item.statut)" variant="tonal">
          {{ statusLabel(item.statut) }}
        </v-chip>
      </template>
      <template #item.pieces="{ item }">
        {{ (item.items || []).map((i) => i.code || i.nom).join(', ') }}
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" :to="{ name: 'loan-detail', params: { id: item.id } }">Ouvrir</v-btn>
      </template>
    </v-data-table>

    <v-row v-else class="mt-2">
      <v-col v-for="loan in filtered" :key="loan.id" cols="12">
        <v-card :to="{ name: 'loan-detail', params: { id: loan.id } }" variant="outlined">
          <v-card-text>
            <div class="d-flex align-center ga-2 mb-1">
              <div class="text-subtitle-1 font-weight-bold flex-grow-1">{{ loan.titre }}</div>
              <v-chip size="small" :color="statusColor(loan.statut)" variant="tonal">
                {{ statusLabel(loan.statut) }}
              </v-chip>
            </div>
            <div class="text-body-2">{{ loan.personName }} · {{ displayDate(loan.dateEmprunt) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ (loan.items || []).map((i) => i.code || i.nom).join(', ') }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-if="!filtered.length" cols="12">
        <v-alert type="info" variant="tonal">Aucun emprunt pour ces filtres.</v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useInventoryStore } from '@/stores/inventory'
import { displayDate } from '@/domain/person'

const inventory = useInventoryStore()
const router = useRouter()
const display = useDisplay()
const personId = ref('Tout')
const status = ref('actifs')

const peopleItems = computed(() => [
  { title: 'Tout', value: 'Tout' },
  ...inventory.people.map((p) => ({ title: p.nom, value: p.id })),
])

const statusItems = [
  { title: 'En cours (y compris partiels)', value: 'actifs' },
  { title: 'En cours', value: 'en_cours' },
  { title: 'Retour partiel', value: 'retour_partiel' },
  { title: 'Retourné', value: 'retourne' },
  { title: 'Tous', value: 'tous' },
]

const headers = [
  { title: 'Titre', key: 'titre' },
  { title: 'Personne', key: 'personName' },
  { title: 'Date', key: 'dateEmprunt' },
  { title: 'Pièces', key: 'pieces' },
  { title: 'Statut', key: 'statut' },
  { title: '', key: 'actions', sortable: false },
]

const filtered = computed(() =>
  inventory.loans.filter((loan) => {
    const matchPerson = personId.value === 'Tout' || loan.personId === personId.value
    const matchStatus =
      status.value === 'tous' ||
      (status.value === 'actifs' ? loan.statut !== 'retourne' : loan.statut === status.value)
    return matchPerson && matchStatus
  }),
)

function statusLabel(value) {
  return { en_cours: 'En cours', retour_partiel: 'Retour partiel', retourne: 'Retourné' }[value] || value
}

function statusColor(value) {
  return { en_cours: 'warning', retour_partiel: 'info', retourne: 'success' }[value] || 'secondary'
}

function go(loan) {
  router.push({ name: 'loan-detail', params: { id: loan.id } })
}

onMounted(() => inventory.refresh().catch(() => {}))
</script>
