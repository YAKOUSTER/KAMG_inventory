<template>
  <div>
    <h1 class="text-h5 text-md-h4 page-title mb-6">{{ isEdit ? 'Modifier l’événement' : 'Nouvel événement' }}</h1>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="!ready && !error" indeterminate color="primary" class="mb-4" />

    <v-form v-if="ready" @submit.prevent="submit">
      <div class="form-fields-grid form-fields-grid--2">
        <FieldRow label="Type" hint="Plusieurs choix possibles" class="form-fields-grid__span-2">
          <v-select
            v-model="form.kinds"
            :items="kindItems"
            multiple
            chips
            closable-chips
            hide-details="auto"
            :rules="isEdit ? [] : [requiredKinds]"
          />
        </FieldRow>
        <FieldRow label="Titre" class="form-fields-grid__span-2">
          <div class="event-title-field">
            <span v-if="titlePrefix" class="event-title-field__prefix">{{ titlePrefix }}</span>
            <v-text-field
              v-model="form.titleRest"
              hide-details="auto"
              :rules="[requiredTitle]"
              :placeholder="titlePrefix ? 'Nom de la sortie' : 'Titre'"
            />
          </div>
          <p class="text-caption text-medium-emphasis mt-1">Titre enregistré : {{ fullTitle }}</p>
        </FieldRow>
        <FieldRow label="Début">
          <v-text-field
            v-model="form.debut"
            type="datetime-local"
            hide-details="auto"
            :rules="[required]"
          />
        </FieldRow>
        <FieldRow label="Fin">
          <v-text-field v-model="form.fin" type="datetime-local" hide-details="auto" />
        </FieldRow>
        <FieldRow label="Lieu" class="form-fields-grid__span-2">
          <v-text-field v-model="form.lieu" hide-details />
        </FieldRow>
        <FieldRow label="Description" align-top class="form-fields-grid__span-2">
          <v-textarea v-model="form.description" hide-details rows="4" />
        </FieldRow>
        <FieldRow label="Publication">
          <v-checkbox v-model="form.publie" label="Visible dans l’espace membres" hide-details />
        </FieldRow>
        <FieldRow label="Inscriptions">
          <v-checkbox
            v-model="form.inscriptionsOuvertes"
            label="Les membres peuvent indiquer leur présence (1 / 0 / ?)"
            hide-details
          />
        </FieldRow>
      </div>

      <section v-if="isSortie" class="mt-8">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">Fiche sortie</h2>
        <SortieFiche
          :titre="fullTitle"
          :debut="fromLocalInput(form.debut)"
          :lieu="form.lieu"
          :sortie="form.sortie"
          :dancer-count="dancerCount"
          :people="people"
          editable
        />
      </section>

      <div v-if="isEdit && form.inscriptionsOuvertes" class="mt-6">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">Présences</h2>
        <EventPresencePanel
          :event="{ id: props.id, ...form, titre: fullTitle }"
          :people="people"
          :presences="presences"
          @updated="onPresenceUpdated"
        />
      </div>

      <div class="d-flex ga-3 mt-6">
        <v-btn type="submit" color="primary" :loading="saving">Enregistrer</v-btn>
        <v-btn variant="text" :to="{ name: 'agenda' }">Annuler</v-btn>
        <v-spacer />
        <v-btn
          v-if="isEdit && auth.can('agenda.write')"
          color="error"
          variant="text"
          :loading="deleting"
          @click="remove"
        >
          Supprimer
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FieldRow from '@/components/FieldRow.vue'
import EventPresencePanel from '@/components/EventPresencePanel.vue'
import SortieFiche from '@/components/SortieFiche.vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { applyPresenceUpdate, summarizePresences } from '@/domain/presence'
import {
  applyEventTitlePrefix,
  eventKindSelectItems,
  eventTitlePrefix,
  eventTitleRest,
  primaryTypeFromKinds,
} from '@/domain/eventKinds'
import { emptySortie, normalizeSortie } from '@/domain/sortie'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const ready = ref(false)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const people = ref([])
const presences = ref([])
const originalType = ref('autre')
const isEdit = computed(() => Boolean(props.id))
const kindItems = eventKindSelectItems()

const form = reactive({
  kinds: [],
  titleRest: '',
  debut: '',
  fin: '',
  lieu: '',
  description: '',
  publie: true,
  inscriptionsOuvertes: false,
  sortie: emptySortie(),
})

const titlePrefix = computed(() => eventTitlePrefix(form.kinds))
const fullTitle = computed(() => applyEventTitlePrefix(form.titleRest, form.kinds))
const isSortie = computed(() => form.kinds.includes('sortie'))
const dancerCount = computed(() => summarizePresences(presences.value, props.id).present)
const required = (value) => Boolean(String(value || '').trim()) || 'Champ requis'
const requiredKinds = (value) => (Array.isArray(value) && value.length > 0) || 'Choisissez au moins un type'
const requiredTitle = () => Boolean(String(fullTitle.value || '').trim()) || 'Champ requis'

watch(
  () => form.kinds.join(','),
  () => {
    if (!isEdit.value) {
      form.inscriptionsOuvertes = form.kinds.includes('sortie') || form.kinds.includes('concours')
    }
  },
)

function kindsFromEvent(event) {
  if (Array.isArray(event.kinds) && event.kinds.length) return [...event.kinds]
  if (event.type === 'sortie') return ['sortie']
  if (event.type === 'concours') return ['concours']
  if (event.type === 'stage') return ['stage']
  return []
}

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

onMounted(async () => {
  try {
    people.value = await api.people().catch(() => [])
    if (props.id) {
      const event = await api.event(props.id)
      originalType.value = event.type || 'autre'
      Object.assign(form, {
        kinds: kindsFromEvent(event),
        titleRest: eventTitleRest(event.titre),
        debut: toLocalInput(event.debut),
        fin: toLocalInput(event.fin),
        lieu: event.lieu || '',
        description: event.description || '',
        publie: event.publie !== false,
        inscriptionsOuvertes: event.inscriptionsOuvertes === true,
        sortie: normalizeSortie(event.sortie),
      })
      presences.value = await api.eventPresences(props.id).catch(() => [])
    } else {
      const debut = String(route.query.debut || '')
      if (/^\d{4}-\d{2}-\d{2}$/.test(debut)) {
        form.debut = `${debut}T18:00`
      }
    }
    ready.value = true
  } catch (err) {
    error.value = err.message || 'Impossible de charger l’événement.'
  }
})

async function submit() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      kinds: form.kinds,
      type: primaryTypeFromKinds(form.kinds, originalType.value),
      titre: form.titleRest,
      debut: fromLocalInput(form.debut),
      fin: fromLocalInput(form.fin),
      lieu: form.lieu,
      description: form.description,
      publie: form.publie,
      inscriptionsOuvertes: form.inscriptionsOuvertes,
      sortie: isSortie.value ? form.sortie : null,
    }
    const saved = props.id ? await api.updateEvent(props.id, payload) : await api.createEvent(payload)
    await router.push({ name: 'event-edit', params: { id: saved.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

function onPresenceUpdated(record) {
  presences.value = applyPresenceUpdate(presences.value, record)
}

async function remove() {
  if (!confirm('Supprimer cet événement ?')) return
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
</script>

<style scoped>
.event-title-field {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}

.event-title-field__prefix {
  flex: 0 1 auto;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(83, 115, 106, 0.16);
  font-size: 0.82rem;
  font-weight: 700;
}

.event-title-field .v-text-field {
  flex: 1;
}
</style>
