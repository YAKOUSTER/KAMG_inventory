<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Liste des présences</h1>
      <v-spacer />
      <v-btn
        variant="tonal"
        class="text-none"
        prepend-icon="mdi-file-pdf-box"
        :disabled="!canExport"
        @click="exportPdf"
      >
        Exporter PDF
      </v-btn>
    </div>
    <CalendrierSubnav />
    <p class="text-body-2 text-medium-emphasis mb-4">
      Toutes les sorties à venir, une colonne par événement — y compris s’il y en a plusieurs le même jour.
      Les réponses se font depuis l’espace membres. Choisissez « Enregistrer au format PDF » dans la fenêtre
      d’impression.
    </p>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <PresenceGrid
      v-if="!loading"
      ref="grid"
      :events="events"
      :people="people"
      :presences="presences"
      :readonly="true"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, unref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import { GROUP_NAME } from '@/domain/brand'
import { personDisplayName } from '@/domain/person'
import {
  PRESENCE_GROUP_FILTERS,
  filterPeopleForPresence,
} from '@/domain/presence'
import {
  buildPresenceSheetPrintHtml,
  cellShortLabel,
  inscriptionEventsForGrid,
  openPresenceSheetPrint,
  presenceCellKey,
  presenceColumnMeta,
} from '@/domain/presenceGrid'
import PresenceGrid from '@/components/PresenceGrid.vue'
import CalendrierSubnav from '@/components/CalendrierSubnav.vue'

const auth = useAuthStore()
const loading = ref(true)
const error = ref('')
const events = ref([])
const people = ref([])
const presences = ref([])
const grid = ref(null)

const canExport = computed(() => events.value.length > 0 && people.value.length > 0)

onMounted(async () => {
  try {
    events.value = await api.events()
    people.value = auth.can('people.read') ? await api.people().catch(() => []) : []
    presences.value = auth.can('agenda.read') || auth.can('agenda.write')
      ? await api.presences().catch(() => [])
      : []
  } catch (err) {
    error.value = err.message || 'Impossible de charger la feuille de présences.'
  } finally {
    loading.value = false
  }
})

function exportPdf() {
  const groupId = unref(grid.value?.groupFilter) || 'tous'
  const groupLabel = PRESENCE_GROUP_FILTERS.find((group) => group.id === groupId)?.label || 'Tous'
  const columns = inscriptionEventsForGrid(events.value).map(presenceColumnMeta)
  const rows = filterPeopleForPresence(people.value, groupId).map((person) => ({
    id: person.id,
    name: personDisplayName(person),
  }))
  const cells = {}
  for (const person of rows) {
    for (const column of columns) {
      const entry = presences.value.find(
        (item) => item.eventId === column.id && item.personId === person.id,
      )
      cells[presenceCellKey(column.id, person.id)] = cellShortLabel(entry?.statut)
    }
  }
  const today = new Date()
  const generatedAt = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  openPresenceSheetPrint(
    buildPresenceSheetPrintHtml({
      title: `Feuille de présences · ${GROUP_NAME}`,
      groupLabel,
      generatedAt,
      columns,
      rows,
      cells,
    }),
  )
}
</script>
