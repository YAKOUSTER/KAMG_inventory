<template>
  <div v-if="loan">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <v-btn variant="text" to="/emprunts" prepend-icon="mdi-arrow-left">Emprunts</v-btn>
    </div>

    <h1 class="text-h5 text-md-h4 page-title">{{ loan.titre }}</h1>
    <div class="text-subtitle-1 mb-2">
      <router-link v-if="loan.personId" :to="{ name: 'person-detail', params: { id: loan.personId } }">
        {{ loan.personName }}
      </router-link>
    </div>
    <v-chip class="mb-6" size="small" :color="loan.statut === 'retourne' ? 'success' : 'warning'" variant="tonal">
      {{ statusLabel(loan.statut) }}
    </v-chip>

    <v-list density="compact" class="mb-6">
      <v-list-item :title="displayDate(loan.dateEmprunt)" subtitle="Date d’emprunt" />
      <v-list-item v-if="loan.dateRetourPrevue" :title="displayDate(loan.dateRetourPrevue)" subtitle="Retour prévu" />
      <v-list-item v-if="loan.dateRetour" :title="displayDate(loan.dateRetour)" subtitle="Retour complet" />
    </v-list>

    <v-card variant="outlined">
      <v-card-title>Pièces</v-card-title>
      <v-card-text>
        <div v-for="line in loan.items" :key="line.itemId" class="piece-line">
          <v-checkbox
            v-if="auth.can('loans.write') && !line.returnedAt"
            v-model="selectedIds"
            :value="line.itemId"
            hide-details
            density="compact"
            class="flex-grow-0"
          />
          <div class="flex-grow-1">
            <router-link :to="{ name: 'item-detail', params: { id: line.itemId } }" class="text-subtitle-2">
              {{ line.code }} — {{ line.nom }}
            </router-link>
            <div class="text-body-2 text-medium-emphasis">
              {{ line.type }}
              <span v-if="line.comment"> · {{ line.comment }}</span>
            </div>
            <div class="text-caption">
              <span v-if="line.returnedAt">Retournée le {{ displayDate(line.returnedAt) }}</span>
              <span v-else>En cours</span>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="auth.can('loans.write') && hasOpen" class="mt-4" variant="outlined">
      <v-card-title>Enregistrer un retour</v-card-title>
      <v-card-text>
        <v-text-field v-model="dateRetour" label="Date de retour" type="date" />
        <v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
        <div class="d-flex flex-wrap ga-2">
          <v-btn color="warning" :disabled="!selectedIds.length" :loading="saving" @click="returnSelected">
            Retourner la sélection
          </v-btn>
          <v-btn color="primary" :loading="saving" @click="returnAll">Tout retourner</v-btn>
        </div>
        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          Chaque pièce retournée est datée (sélection ou tout d’un coup). Vous pouvez revenir plus tard pour le reste.
        </p>
      </v-card-text>
    </v-card>
  </div>
  <v-alert v-else-if="error" type="error">{{ error }}</v-alert>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { displayDate } from '@/domain/person'

const props = defineProps({ id: { type: String, required: true } })
const auth = useAuthStore()
const inventory = useInventoryStore()
const loan = ref(null)
const selectedIds = ref([])
const dateRetour = ref(new Date().toISOString().slice(0, 10))
const saving = ref(false)
const error = ref('')

const hasOpen = computed(() => loan.value?.items?.some((line) => !line.returnedAt))

function statusLabel(status) {
  return { en_cours: 'En cours', retour_partiel: 'Retour partiel', retourne: 'Retourné' }[status] || status
}

async function load() {
  error.value = ''
  try {
    loan.value = await api.loan(props.id)
    selectedIds.value = []
  } catch (err) {
    error.value = err.message
  }
}

async function returnSelected() {
  await doReturn(selectedIds.value)
}

async function returnAll() {
  await doReturn([])
}

async function doReturn(itemIds) {
  saving.value = true
  error.value = ''
  try {
    loan.value = await api.returnLoan(props.id, itemIds, dateRetour.value)
    selectedIds.value = []
    await inventory.refresh({ force: true })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

watch(() => props.id, load, { immediate: true })
</script>

<style scoped>
.piece-line {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #ecece4;
}
a {
  text-decoration: none;
  color: #53736a;
}
</style>
