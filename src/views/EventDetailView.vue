<template>
  <div v-if="event">
    <v-alert v-if="success" type="success" class="mb-4" closable @click:close="success = ''">
      {{ success }}
    </v-alert>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <v-btn variant="text" :to="{ name: 'agenda' }" prepend-icon="mdi-arrow-left">Agenda</v-btn>
      <v-spacer />
      <v-btn
        v-if="canEdit"
        variant="tonal"
        :to="{ name: 'event-edit', params: { id: event.id } }"
        prepend-icon="mdi-pencil"
      >
        Modifier
      </v-btn>
      <v-btn v-if="canEdit" variant="text" color="error" :loading="deleting" @click="remove">
        Supprimer
      </v-btn>
    </div>

    <article class="kamg-fiche event-detail-fiche">
      <header class="kamg-fiche__header">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="kamg-fiche__logo" />
        <div class="kamg-title-box">
          <h1 class="kamg-title-box__title">{{ event.titre }}</h1>
          <p class="kamg-title-box__meta">
            {{ isSortie ? 'Fiche sortie' : 'Événement du cercle' }}
            <span v-if="isPast"> · Passé</span>
          </p>
        </div>
      </header>

      <v-alert v-if="isPast" type="info" variant="tonal" class="mb-4" density="compact">
        Cet événement est passé.
      </v-alert>

      <div class="d-flex flex-wrap ga-2 mb-4">
        <EventKindChips :event="event" size="small" />
        <v-chip
          v-for="group in event.groupes || []"
          :key="group"
          size="small"
          variant="outlined"
        >
          {{ eventGroupLabel(group) }}
        </v-chip>
        <v-chip v-if="event.horsCercle" size="small" color="warning" variant="tonal">
          Hors cercle
        </v-chip>
        <v-chip v-if="event.publie === false" size="small" color="secondary" variant="tonal">
          Non publié
        </v-chip>
      </div>

      <div class="detail-rows mb-4">
        <DetailRow label="Début" :value="displayDateTime(event.debut) || '—'" />
        <DetailRow v-if="event.fin && event.fin !== event.debut" label="Fin" :value="displayDateTime(event.fin)" />
        <DetailRow v-if="event.lieu" label="Lieu" :value="event.lieu" />
        <DetailRow label="Publication" :value="event.publie === false ? 'Masqué de l’espace membres' : 'Visible dans l’espace membres'" />
        <DetailRow
          label="Sondage"
          :value="eventAcceptsInscriptions(event) ? presenceLabel : 'Pas de sondage'"
        />
      </div>

      <section v-if="event.description" class="page-block">
        <h2 class="section-label">Description</h2>
        <p class="text-multiline text-body-1">{{ event.description }}</p>
      </section>

      <AddToCalendarButton :event="event" />

      <SortieFiche
        v-if="isSortie"
        class="mt-4"
        embedded
        :titre="event.titre"
        :debut="event.debut"
        :lieu="event.lieu"
        :sortie="event.sortie || emptySortie()"
        :dancer-count="dancerCount"
      />
    </article>
  </div>
  <v-skeleton-loader v-else-if="loading" type="article, list-item-two-line" />
  <v-alert v-else-if="error" type="error">{{ error }}</v-alert>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'
import { displayDateTime } from '@/domain/dates'
import {
  canMutateEvent,
  eventAcceptsInscriptions,
  eventIsPast,
  eventIsSortie,
} from '@/domain/events'
import { eventGroupLabel } from '@/domain/eventGroups'
import { emptySortie } from '@/domain/sortie'
import { summarizePresences } from '@/domain/presence'
import DetailRow from '@/components/DetailRow.vue'
import EventKindChips from '@/components/EventKindChips.vue'
import SortieFiche from '@/components/SortieFiche.vue'
import AddToCalendarButton from '@/components/AddToCalendarButton.vue'

const props = defineProps({ id: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const event = ref(null)
const error = ref('')
const loading = ref(false)
const deleting = ref(false)
const presences = ref([])
const success = ref('')

const canEdit = computed(() => canMutateEvent(auth.user, event.value))
const isSortie = computed(() => eventIsSortie(event.value))
const isPast = computed(() => eventIsPast(event.value))
const dancerCount = computed(() => summarizePresences(presences.value, props.id).present)
const presenceSummary = computed(() => summarizePresences(presences.value, props.id))
const presenceLabel = computed(() => {
  const summary = presenceSummary.value
  if (!summary.total) return 'Ouvert'
  return `Ouvert · ${summary.present} présent${summary.present === 1 ? '' : 's'}, ${summary.maybe} peut-être, ${summary.absent} absent${summary.absent === 1 ? '' : 's'}`
})

function successFromQuery() {
  const createdCount = Number(route.query.created || 0)
  if (createdCount > 1) return `${createdCount} dates créées. Chaque date peut être modifiée séparément.`
  if (createdCount === 1 || route.query.saved === '1') return 'Événement enregistré.'
  return ''
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    event.value = await api.event(props.id)
    presences.value = await api.eventPresences(props.id).catch(() => [])
    if (!success.value) success.value = successFromQuery()
  } catch (err) {
    event.value = null
    error.value = err.message || 'Impossible de charger l’événement.'
  } finally {
    loading.value = false
  }
}

async function remove() {
  if (!event.value || !confirm('Supprimer cet événement ?')) return
  deleting.value = true
  error.value = ''
  try {
    await api.deleteEvent(props.id)
    router.push({ name: 'agenda' })
  } catch (err) {
    error.value = err.message
  } finally {
    deleting.value = false
  }
}

watch(() => props.id, load, { immediate: true })
</script>
