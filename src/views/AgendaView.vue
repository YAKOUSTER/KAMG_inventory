<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Agenda</h1>
      <v-spacer />
      <v-btn v-if="auth.can('agenda.write')" color="primary" to="/agenda/nouveau" prepend-icon="mdi-plus">
        Ajouter
      </v-btn>
    </div>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="typeFilter" :items="typeItems" label="Type" hide-details />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="periodFilter" :items="periodItems" label="Période" hide-details />
      </v-col>
    </v-row>

    <v-data-table
      v-if="display.mdAndUp"
      :headers="headers"
      :items="filtered"
      item-value="id"
      :items-per-page="25"
      no-data-text="Aucun événement"
      @click:row="(_e, { item }) => openEvent(item)"
    >
      <template #item.debut="{ item }">{{ displayDateTime(item.debut) }}</template>
      <template #item.type="{ item }">
        <v-chip size="small" :color="eventTypeMeta(item.type).color" variant="tonal">
          {{ eventTypeLabel(item.type) }}
        </v-chip>
      </template>
      <template #item.publie="{ item }">
        <v-chip size="small" :color="item.publie ? 'success' : 'warning'" variant="tonal">
          {{ item.publie ? 'Publié' : 'Brouillon' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" :to="{ name: 'event-edit', params: { id: item.id } }">Modifier</v-btn>
      </template>
    </v-data-table>

    <div v-else class="member-stack">
      <article
        v-for="event in filtered"
        :key="event.id"
        class="stack-item"
        @click="openEvent(event)"
      >
        <div class="d-flex align-center ga-2 mb-1">
          <v-chip size="small" :color="eventTypeMeta(event.type).color" variant="tonal">
            {{ eventTypeLabel(event.type) }}
          </v-chip>
          <v-spacer />
          <span class="text-caption">{{ displayDateTime(event.debut) }}</span>
        </div>
        <div class="text-subtitle-1 font-weight-bold">{{ event.titre }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ event.lieu || 'Lieu à préciser' }}</div>
      </article>
      <v-alert v-if="!filtered.length" type="info" variant="tonal">Aucun événement.</v-alert>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import { displayDateTime } from '@/domain/dates'
import { EVENT_TYPES, eventTypeLabel, eventTypeMeta } from '@/domain/events'

const auth = useAuthStore()
const router = useRouter()
const display = useDisplay()
const events = ref([])
const typeFilter = ref('Tout')
const periodFilter = ref('avenir')

const typeItems = [{ title: 'Tout', value: 'Tout' }, ...EVENT_TYPES.map((type) => ({ title: type.label, value: type.id }))]
const periodItems = [
  { title: 'À venir', value: 'avenir' },
  { title: 'Passés', value: 'passes' },
  { title: 'Tous', value: 'tous' },
]

const headers = [
  { title: 'Date', key: 'debut' },
  { title: 'Type', key: 'type' },
  { title: 'Titre', key: 'titre' },
  { title: 'Lieu', key: 'lieu' },
  { title: 'Statut', key: 'publie' },
  { title: '', key: 'actions', sortable: false },
]

const filtered = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return events.value.filter((event) => {
    if (typeFilter.value !== 'Tout' && event.type !== typeFilter.value) return false
    const day = (event.debut || '').slice(0, 10)
    if (periodFilter.value === 'avenir') return day >= today
    if (periodFilter.value === 'passes') return day < today
    return true
  })
})

onMounted(async () => {
  events.value = await api.events()
})

function openEvent(event) {
  if (auth.can('agenda.write')) {
    router.push({ name: 'event-edit', params: { id: event.id } })
  }
}
</script>

<style scoped>
.member-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
