<template>
  <div>
    <v-alert type="info" variant="tonal" class="mb-4 d-none d-md-flex">
      Créez, modifiez et supprimez les dates ici. Pour s’abonner (tout le calendrier ou certains groupes),
      utilisez le bouton « S’abonner » de l’espace membres, ou les adresses dans Paramètres.
    </v-alert>

    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Gestion des événements</h1>
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
      <v-btn
        v-if="canWriteEvents"
        color="primary"
        to="/agenda/nouveau"
        prepend-icon="mdi-plus"
      >
        Ajouter
      </v-btn>
    </div>

    <CalendrierSubnav />

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
      :can-write="canWriteEvents"
      mark-past
      storage-key="kamg-agenda-gestion"
      @select="openEvent"
      @create="createOnDay"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import { eventMatchesKindFilter, eventIsHorsCercle } from '@/domain/events'
import { eventKindFilterItems } from '@/domain/eventKinds'
import { canWriteLibreEvents } from '@/domain/auth'
import AgendaCalendar from '@/components/AgendaCalendar.vue'
import CalendrierSubnav from '@/components/CalendrierSubnav.vue'

const auth = useAuthStore()
const router = useRouter()
const events = ref([])
const typeFilter = ref('Tout')
const importing = ref(false)
const importMessage = ref('')
const importOk = ref(false)

const typeItems = eventKindFilterItems()
const canWriteEvents = computed(() => canWriteLibreEvents(auth.user))

const filtered = computed(() =>
  events.value.filter((event) => eventMatchesKindFilter(event, typeFilter.value)),
)

onMounted(async () => {
  events.value = await api.events()
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
  if (auth.can('agenda.write') || (auth.can('agenda.libre') && eventIsHorsCercle(event))) {
    router.push({ name: 'event-edit', params: { id: event.id } })
  }
}

function createOnDay(isoDay) {
  router.push({ name: 'event-create', query: { debut: isoDay } })
}
</script>
