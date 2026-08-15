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
    <v-chip class="mb-6" size="small" :color="chipColor" variant="tonal">{{ chipLabel }}</v-chip>

    <v-list density="compact" class="mb-6">
      <v-list-item :title="displayDate(loan.dateEmprunt)" subtitle="Date d’emprunt" />
      <v-list-item v-if="loan.dateRetourPrevue" :title="displayDate(loan.dateRetourPrevue)" subtitle="Retour prévu" />
      <v-list-item v-if="loan.dateRetour" :title="displayDate(loan.dateRetour)" subtitle="Retour complet" />
    </v-list>

    <section class="page-block">
      <h2 class="section-label">Pièces</h2>
      <div
        v-for="line in loan.items"
        :key="line.itemId"
        class="stack-item d-flex ga-2 align-start"
        @click="toggle(line)"
      >
        <v-checkbox
          v-if="auth.can('loans.write') && !line.returnedAt"
          v-model="selectedIds"
          :value="line.itemId"
          hide-details
          density="compact"
          class="flex-grow-0"
          @click.stop
        />
        <div class="flex-grow-1">
          <router-link :to="{ name: 'item-detail', params: { id: line.itemId } }" class="text-subtitle-2" @click.stop>
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
    </section>

    <section v-if="auth.can('loans.write') && hasOpen" class="page-block">
      <h2 class="section-label">Enregistrer un retour</h2>
      <v-text-field v-model="dateRetour" label="Date de retour" type="date" />
      <v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
      <div class="d-flex flex-wrap ga-2">
        <v-btn color="warning" :disabled="!selectedIds.length" :loading="saving" @click="returnSelected">
          Retourner la sélection
        </v-btn>
        <v-btn color="primary" :loading="saving" @click="returnAll">Tout retourner</v-btn>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Chaque pièce retournée est datée. Vous pouvez revenir plus tard pour le reste.
      </p>
    </section>
  </div>
  <v-progress-linear v-else-if="loading" color="primary" indeterminate />
  <v-alert v-else-if="error" type="error">{{ error }}</v-alert>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { useUiStore } from '@/stores/ui'
import { displayDate, todayLocal } from '@/domain/dates'
import { isOverdue, loanStatusColor, loanStatusLabel } from '@/domain/loans'

const props = defineProps({ id: { type: String, required: true } })
const auth = useAuthStore()
const inventory = useInventoryStore()
const ui = useUiStore()
const remoteLoan = ref(null)
const selectedIds = ref([])
const dateRetour = ref(todayLocal())
const saving = ref(false)
const loading = ref(false)
const error = ref('')

const loan = computed(() => inventory.loanById(props.id) || remoteLoan.value)

const hasOpen = computed(() => loan.value?.items?.some((line) => !line.returnedAt))
const overdue = computed(() => isOverdue(loan.value))
const chipLabel = computed(() => (overdue.value ? 'En retard' : loanStatusLabel(loan.value?.statut)))
const chipColor = computed(() => (overdue.value ? 'error' : loanStatusColor(loan.value?.statut)))

function toggle(line) {
  if (!auth.can('loans.write') || line.returnedAt) return
  const id = line.itemId
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

async function load() {
  error.value = ''
  selectedIds.value = []
  if (remoteLoan.value?.id !== props.id) remoteLoan.value = null
  if (inventory.loanById(props.id)) return
  loading.value = true
  try {
    if (!inventory.loaded) await inventory.refresh()
    if (inventory.loanById(props.id)) return
    remoteLoan.value = await api.loan(props.id)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function returnSelected() {
  await doReturn(selectedIds.value)
}

async function returnAll() {
  if (!confirm('Retourner toutes les pièces encore en cours à la date indiquée ?')) return
  await doReturn([])
}

async function doReturn(itemIds) {
  saving.value = true
  error.value = ''
  try {
    const updated = await api.returnLoan(props.id, itemIds, dateRetour.value)
    selectedIds.value = []
    inventory.patchLoan(updated)
    remoteLoan.value = updated
    ui.notify(updated.statut === 'retourne' ? 'Emprunt clôturé' : 'Retour enregistré')
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

watch(() => props.id, load, { immediate: true })
</script>

<style scoped>
.stack-item {
  cursor: pointer;
}
a {
  text-decoration: none;
  color: #53736a;
}
</style>
