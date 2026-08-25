<template>
  <div>
    <v-alert type="info" variant="tonal" class="mb-4 d-none d-md-flex">
      Créez, modifiez et supprimez les dates ici. Pour s’abonner (tout le calendrier ou certains groupes),
      utilisez le bouton « S’abonner » de l’espace membres, ou les adresses dans Paramètres.
    </v-alert>

    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Agenda</h1>
      <v-spacer />
      <v-btn
        v-if="auth.can('agenda.write')"
        variant="tonal"
        :loading="importing"
        prepend-icon="mdi-google"
        @click="importGoogle"
      >
        Importer Google
      </v-btn>
      <v-btn v-if="auth.can('agenda.write')" color="primary" to="/agenda/nouveau" prepend-icon="mdi-plus">
        Ajouter
      </v-btn>
      <v-btn
        v-if="gridEvents.length"
        variant="text"
        class="text-none"
        prepend-icon="mdi-table"
        @click="scrollToGrid"
      >
        Feuille de présences
      </v-btn>
    </div>

    <v-alert v-if="importMessage" :type="importOk ? 'success' : 'error'" variant="tonal" class="mb-4">
      {{ importMessage }}
    </v-alert>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="typeFilter" :items="typeItems" label="Type" hide-details />
      </v-col>
    </v-row>

    <AgendaCalendar
      :events="filtered"
      :can-write="auth.can('agenda.write')"
      storage-key="kamg-agenda-gestion"
      @select="openEvent"
      @create="createOnDay"
    />

    <section v-if="gridEvents.length && people.length" id="feuille-presences" class="presence-sheet">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">Feuille de présences</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Toutes les sorties à venir, une colonne par événement — y compris s’il y en a plusieurs le même jour.
        La feuille se consulte ici ; les réponses se font depuis l’espace membres ou la fiche événement.
      </p>
      <PresenceGrid
        :events="gridEvents"
        :people="people"
        :presences="presences"
        :readonly="true"
        @updated="onPresenceUpdated"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import { eventMatchesKindFilter } from '@/domain/events'
import { eventKindFilterItems } from '@/domain/eventKinds'
import { applyPresenceUpdate } from '@/domain/presence'
import { inscriptionEventsForGrid } from '@/domain/presenceGrid'
import AgendaCalendar from '@/components/AgendaCalendar.vue'
import PresenceGrid from '@/components/PresenceGrid.vue'

const auth = useAuthStore()
const router = useRouter()
const events = ref([])
const people = ref([])
const presences = ref([])
const typeFilter = ref('Tout')
const importing = ref(false)
const importMessage = ref('')
const importOk = ref(false)

const typeItems = eventKindFilterItems()

const filtered = computed(() =>
  events.value.filter((event) => eventMatchesKindFilter(event, typeFilter.value)),
)

const gridEvents = computed(() => inscriptionEventsForGrid(events.value))

onMounted(async () => {
  events.value = await api.events()
  const extras = []
  if (auth.can('people.read')) extras.push(api.people().catch(() => []))
  else extras.push(Promise.resolve([]))
  if (auth.can('agenda.read')) extras.push(api.presences().catch(() => []))
  else extras.push(Promise.resolve([]))
  const [peopleList, presenceList] = await Promise.all(extras)
  people.value = peopleList
  presences.value = presenceList
})

async function importGoogle() {
  importing.value = true
  importMessage.value = ''
  try {
    const result = await api.syncAgenda()
    events.value = await api.events()
    importOk.value = true
    importMessage.value = `${result.imported ?? result.newCount ?? 0} événement(s) importé(s) depuis Google.`
  } catch (error) {
    importOk.value = false
    importMessage.value = error.message || 'Import Google impossible.'
  } finally {
    importing.value = false
  }
}

function openEvent(event) {
  if (auth.can('agenda.write')) {
    router.push({ name: 'event-edit', params: { id: event.id } })
  }
}

function createOnDay(isoDay) {
  router.push({ name: 'event-create', query: { debut: isoDay } })
}

function scrollToGrid() {
  document.getElementById('feuille-presences')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onPresenceUpdated(record) {
  presences.value = applyPresenceUpdate(presences.value, record)
}
</script>

<style scoped>
.presence-sheet {
  margin-top: 32px;
}
</style>
