<template>
  <div v-if="loan">
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <v-btn variant="text" to="/emprunts" prepend-icon="mdi-arrow-left">Emprunts</v-btn>
    </div>

    <h1 class="text-h5 text-md-h4 page-title">{{ loan.titre }}</h1>
    <div class="text-subtitle-1 mb-2">
      <router-link v-if="loan.personId" :to="{ name: 'person-detail', params: { id: loan.personId } }">
        {{ loan.personName }}
      </router-link>
    </div>
    <v-chip class="mb-6" size="small" :color="chipColor" variant="tonal">{{ chipLabel }}</v-chip>

    <div class="detail-rows mb-6">
      <DetailRow label="Date d’emprunt" :value="displayDate(loan.dateEmprunt)" />
      <DetailRow v-if="loan.dateRetourPrevue" label="Retour prévu" :value="displayDate(loan.dateRetourPrevue)" />
      <DetailRow v-if="loan.dateRetour" label="Retour complet" :value="displayDate(loan.dateRetour)" />
    </div>

    <section v-if="auth.can('loans.manage')" class="page-block">
      <div class="d-flex flex-wrap align-center ga-2 mb-3">
        <h2 class="section-label mb-0">Gestion de l’emprunt</h2>
        <v-spacer />
        <v-btn
          v-if="!showEditForm"
          variant="tonal"
          size="small"
          prepend-icon="mdi-pencil"
          @click="showEditForm = true"
        >
          Modifier l’emprunt
        </v-btn>
      </div>

      <v-expand-transition>
        <div v-if="showEditForm" class="form-fields">
          <FieldRow label="Titre">
            <v-text-field v-model="editForm.titre" hide-details />
          </FieldRow>
          <FieldRow label="Emprunteur">
            <v-autocomplete
              v-model="editForm.personId"
              :items="peopleItems"
              item-title="title"
              item-value="id"
              hide-details
              :custom-filter="filterPerson"
            />
          </FieldRow>
          <FieldRow label="Date d’emprunt">
            <v-text-field v-model="editForm.dateEmprunt" hide-details type="date" />
          </FieldRow>
          <FieldRow label="Retour prévu">
            <v-text-field v-model="editForm.dateRetourPrevue" hide-details type="date" clearable />
          </FieldRow>
          <FieldRow label="Retour effectué" hint="Renseigner pour clôturer rétroactivement">
            <v-text-field v-model="editForm.dateRetour" hide-details type="date" clearable />
          </FieldRow>
          <v-alert v-if="manageError" type="error" class="mb-3">{{ manageError }}</v-alert>
          <div class="d-flex flex-wrap ga-2">
            <v-btn color="primary" :loading="savingEdit" @click="saveLoanEdits">Enregistrer</v-btn>
            <v-btn variant="text" @click="showEditForm = false">Fermer</v-btn>
            <v-btn
              v-if="canCancelLoan"
              color="error"
              variant="tonal"
              :loading="cancelling"
              @click="cancelLoan"
            >
              Annuler l’emprunt
            </v-btn>
          </div>
        </div>
      </v-expand-transition>
    </section>

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
          <div class="text-body-2 text-medium-emphasis">{{ line.type }}</div>
          <p v-if="line.comment" class="text-multiline text-body-2 text-medium-emphasis mb-0 mt-1">{{ line.comment }}</p>
          <div class="text-caption">
            <span v-if="line.returnedAt">Retournée le {{ displayDate(line.returnedAt) }}</span>
            <span v-else>En cours</span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="auth.can('loans.write') && hasOpen" class="page-block">
      <h2 class="section-label">Enregistrer un retour</h2>
      <FieldRow label="Date de retour">
        <v-text-field v-model="dateRetour" hide-details type="date" />
      </FieldRow>

      <div v-if="openLines.length" class="mt-4">
        <div class="text-body-2 text-medium-emphasis mb-3">
          Renseignez l’état de chaque pièce (la fiche sera mise à jour au retour).
        </div>
        <ReturnItemForm
          v-for="line in openLines"
          :key="line.itemId"
          :ref="(el) => setReturnFormRef(line.itemId, el)"
          :line="enrichedLine(line)"
          :etats="referentiels.etats"
          :people="inventory.people"
          :default-person-id="loan.personId"
        />
      </div>

      <v-alert v-if="error" type="error" class="mb-3 mt-4">{{ error }}</v-alert>
      <div class="d-flex flex-wrap ga-2 mt-4">
        <v-btn color="warning" :disabled="!selectedIds.length" :loading="saving" @click="returnSelected">
          Retourner la sélection
        </v-btn>
        <v-btn color="primary" :loading="saving" @click="returnAll">Tout retourner</v-btn>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Chaque pièce retournée est datée. Les actions à faire apparaissent sur l’accueil.
      </p>
    </section>
  </div>
  <v-progress-linear v-else-if="loading" color="primary" indeterminate />
  <v-alert v-else-if="error" type="error">{{ error }}</v-alert>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { useUiStore } from '@/stores/ui'
import { displayDate, formatDate, todayLocal } from '@/domain/dates'
import { isOverdue, loanStatusColor, loanStatusLabel } from '@/domain/loans'
import { matchesSearch, personDisplayName } from '@/domain/person'
import DetailRow from '@/components/DetailRow.vue'
import FieldRow from '@/components/FieldRow.vue'
import ReturnItemForm from '@/components/ReturnItemForm.vue'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const auth = useAuthStore()
const inventory = useInventoryStore()
const ui = useUiStore()
const referentiels = computed(() => inventory.resolvedReferentiels)
const remoteLoan = ref(null)
const selectedIds = ref([])
const returnFormRefs = ref({})
const dateRetour = ref(todayLocal())
const saving = ref(false)
const savingEdit = ref(false)
const cancelling = ref(false)
const loading = ref(false)
const error = ref('')
const manageError = ref('')
const showEditForm = ref(false)
const editForm = ref({
  titre: '',
  personId: '',
  dateEmprunt: '',
  dateRetourPrevue: '',
  dateRetour: '',
})

const loan = computed(() => inventory.loanById(props.id) || remoteLoan.value)

const peopleItems = computed(() =>
  [...inventory.people]
    .sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), 'fr'))
    .map((person) => ({ id: person.id, title: personDisplayName(person) })),
)

const canCancelLoan = computed(() => loan.value?.items?.every((line) => !line.returnedAt))

function filterPerson(_value, query, item) {
  return matchesSearch(item.raw.title, query)
}

function syncEditForm() {
  if (!loan.value) return
  editForm.value = {
    titre: loan.value.titre || '',
    personId: loan.value.personId || '',
    dateEmprunt: formatDate(loan.value.dateEmprunt),
    dateRetourPrevue: formatDate(loan.value.dateRetourPrevue),
    dateRetour: formatDate(loan.value.dateRetour),
  }
}

const openLines = computed(() => (loan.value?.items || []).filter((line) => !line.returnedAt))

function enrichedLine(line) {
  const item = inventory.itemById(line.itemId)
  return {
    ...line,
    etat: line.etat ?? item?.etat ?? '',
    propre: line.propre ?? item?.propre ?? null,
  }
}

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

function setReturnFormRef(itemId, el) {
  if (el) returnFormRefs.value[itemId] = el
  else delete returnFormRefs.value[itemId]
}

function buildUpdates(itemIds) {
  const updates = {}
  for (const itemId of itemIds) {
    const form = returnFormRefs.value[itemId]
    if (form?.payload) updates[itemId] = form.payload()
  }
  return updates
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
    const openIds = (loan.value?.items || []).filter((line) => !line.returnedAt).map((line) => line.itemId)
    const targets = itemIds.length ? itemIds : openIds
    const updated = await api.returnLoan(props.id, {
      itemIds,
      dateRetour: dateRetour.value,
      updates: buildUpdates(targets),
    })
    selectedIds.value = []
    returnFormRefs.value = {}
    inventory.patchLoan(updated)
    await inventory.refresh({ force: true })
    remoteLoan.value = updated
    ui.notify(updated.statut === 'retourne' ? 'Emprunt clôturé' : 'Retour enregistré')
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function saveLoanEdits() {
  savingEdit.value = true
  manageError.value = ''
  try {
    const updated = await api.updateLoan(props.id, {
      titre: editForm.value.titre,
      personId: editForm.value.personId,
      dateEmprunt: editForm.value.dateEmprunt,
      dateRetourPrevue: editForm.value.dateRetourPrevue,
      dateRetour: editForm.value.dateRetour,
    })
    inventory.patchLoan(updated)
    remoteLoan.value = updated
    await inventory.refresh({ force: true })
    syncEditForm()
    ui.notify('Emprunt mis à jour')
  } catch (err) {
    manageError.value = err.message
  } finally {
    savingEdit.value = false
  }
}

async function cancelLoan() {
  if (!confirm('Annuler cet emprunt et remettre les pièces disponibles ?')) return
  cancelling.value = true
  manageError.value = ''
  try {
    await api.cancelLoan(props.id)
    inventory.removeLoan(props.id)
    await inventory.refresh({ force: true })
    ui.notify('Emprunt annulé')
    router.push({ name: 'loans' })
  } catch (err) {
    manageError.value = err.message
  } finally {
    cancelling.value = false
  }
}

watch(() => props.id, load, { immediate: true })
watch(loan, syncEditForm, { immediate: true })
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
