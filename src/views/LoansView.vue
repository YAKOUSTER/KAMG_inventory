<template>
  <div>
    <h1 class="text-h4 page-title mb-6">Emprunts</h1>
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="personId" :items="peopleItems" label="Filtrer par personne" />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field v-model="date" label="Date d'emprunt" type="date" clearable />
      </v-col>
    </v-row>

    <v-data-table :headers="headers" :items="filtered" item-value="id">
      <template #item.statut="{ item }">
        <v-chip size="small" :color="item.statut === 'retourne' ? 'success' : 'warning'" variant="tonal">
          {{ statusLabel(item.statut) }}
        </v-chip>
      </template>
      <template #item.pieces="{ item }">
        {{ (item.items || []).map((i) => i.code || i.nom).join(', ') }}
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="open(item)">Détail</v-btn>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="720">
      <v-card v-if="selected">
        <v-card-title>{{ selected.titre }}</v-card-title>
        <v-card-subtitle>{{ selected.personName }} · {{ selected.dateEmprunt }}</v-card-subtitle>
        <v-card-text>
          <v-list>
            <v-list-item v-for="line in selected.items" :key="line.itemId">
              <v-checkbox
                v-model="selectedIds"
                :value="line.itemId"
                :disabled="Boolean(line.returnedAt)"
                :label="`${line.code} — ${line.nom}`"
                hide-details
              />
              <v-list-item-subtitle>
                {{ line.returnedAt ? 'Retourné' : line.disponibilite }}
                <span v-if="line.comment"> · {{ line.comment }}</span>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Fermer</v-btn>
          <v-btn color="warning" :disabled="!selectedIds.length" @click="returnSelected">Retourner la sélection</v-btn>
          <v-btn color="primary" @click="returnAll">Tout retourner</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { api } from '@/services/api'

const inventory = useInventoryStore()
const personId = ref('Tout')
const date = ref('')
const dialog = ref(false)
const selected = ref(null)
const selectedIds = ref([])

const peopleItems = computed(() => [
  { title: 'Tout', value: 'Tout' },
  ...inventory.people.map((p) => ({ title: p.nom, value: p.id })),
])

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
    const matchDate = !date.value || loan.dateEmprunt === date.value
    return matchPerson && matchDate
  }),
)

function statusLabel(status) {
  return { en_cours: 'En cours', retour_partiel: 'Retour partiel', retourne: 'Retourné' }[status] || status
}

function open(loan) {
  selected.value = loan
  selectedIds.value = []
  dialog.value = true
}

async function returnSelected() {
  selected.value = await api.returnLoan(selected.value.id, selectedIds.value)
  selectedIds.value = []
  await inventory.refresh()
}

async function returnAll() {
  selected.value = await api.returnLoan(selected.value.id, [])
  await inventory.refresh()
  dialog.value = false
}

onMounted(() => inventory.refresh().catch(() => {}))
</script>
