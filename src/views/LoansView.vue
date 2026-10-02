<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h1 class="text-h5 text-md-h4 page-title">Emprunts</h1>
      <v-spacer />
      <v-btn v-if="auth.can('loans.write')" color="primary" to="/panier" prepend-icon="mdi-cart-outline">
        Nouveau
      </v-btn>
    </div>
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
      :items-per-page="25"
      no-data-text="Aucun emprunt"
      items-per-page-text="Lignes par page"
      @click:row="(_e, { item }) => go(item)"
    >
      <template #item.dateEmprunt="{ item }">{{ displayDate(item.dateEmprunt) }}</template>
      <template #item.statut="{ item }">
        <v-chip size="small" :color="chipColor(item)" variant="tonal">
          {{ chipLabel(item) }}
        </v-chip>
      </template>
      <template #item.pieces="{ item }">{{ loanPiecesLabel(item) }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" :to="{ name: 'loan-detail', params: { id: item.id } }">Ouvrir</v-btn>
      </template>
    </v-data-table>

    <v-row v-else class="mt-2">
      <v-col v-for="loan in filtered" :key="loan.id" cols="12">
        <router-link class="loan-link stack-item d-block" :to="{ name: 'loan-detail', params: { id: loan.id } }">
          <div class="d-flex align-center ga-2 mb-1">
            <div class="text-subtitle-1 font-weight-bold flex-grow-1">{{ loan.titre }}</div>
            <v-chip size="small" :color="chipColor(loan)" variant="tonal">
              {{ chipLabel(loan) }}
            </v-chip>
          </div>
          <div class="text-body-2">{{ loan.personName }} · {{ displayDate(loan.dateEmprunt) }}</div>
          <div class="text-caption text-medium-emphasis mt-1">{{ loanPiecesLabel(loan) }}</div>
        </router-link>
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
import { useAuthStore } from '@/stores/auth'
import { displayDate } from '@/domain/dates'
import { isOverdue, loanPiecesLabel, loanStatusColor, loanStatusLabel } from '@/domain/loans'
import { personDisplayName } from '@/domain/person'

const inventory = useInventoryStore()
const auth = useAuthStore()
const router = useRouter()
const display = useDisplay()
const personId = ref('Tout')
const status = ref('actifs')

const peopleItems = computed(() => [
  { title: 'Tout', value: 'Tout' },
  ...[...inventory.people]
    .sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), 'fr'))
    .map((p) => ({ title: personDisplayName(p), value: p.id })),
])

const statusItems = [
  { title: 'En cours (y compris partiels)', value: 'actifs' },
  { title: 'En retard', value: 'retard' },
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
    if (status.value === 'retard') return matchPerson && isOverdue(loan)
    const matchStatus =
      status.value === 'tous' ||
      (status.value === 'actifs' ? loan.statut !== 'retourne' : loan.statut === status.value)
    return matchPerson && matchStatus
  }),
)

function chipLabel(loan) {
  return isOverdue(loan) ? 'En retard' : loanStatusLabel(loan.statut)
}

function chipColor(loan) {
  return isOverdue(loan) ? 'error' : loanStatusColor(loan.statut)
}

function go(loan) {
  router.push({ name: 'loan-detail', params: { id: loan.id } })
}

onMounted(() => inventory.refresh().catch(() => {}))
</script>

<style scoped>
.loan-link {
  color: inherit;
  text-decoration: none;
}
.loan-link:hover .text-subtitle-1 {
  color: #53736a;
}
</style>
