<template>
  <div>
    <v-alert v-if="success" type="success" class="mb-4" closable @click:close="success = ''">
      {{ success }}
    </v-alert>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="!ready && !error" indeterminate color="primary" class="mb-4" />

    <v-form v-if="ready" class="kamg-fiche event-edit-fiche" @submit.prevent="submit">
      <header class="kamg-fiche__header">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="kamg-fiche__logo" />
        <div class="kamg-title-box">
          <h1 class="kamg-title-box__title">{{ fullTitle || (isEdit ? 'Modifier l’événement' : 'Nouvel événement') }}</h1>
          <p class="kamg-title-box__meta">{{ isSortie ? 'Fiche sortie' : 'Événement du cercle' }}</p>
        </div>
      </header>

      <h2 class="kamg-banner">Informations générales</h2>
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
        <FieldRow label="Groupes concernés" hint="Qui peut répondre au sondage" class="form-fields-grid__span-2">
          <v-select
            v-model="form.groupes"
            :items="groupItems"
            multiple
            chips
            closable-chips
            hide-details="auto"
            @update:model-value="groupesTouched = true"
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
        <template v-if="showRecurrence">
          <FieldRow label="Récurrence" class="form-fields-grid__span-2">
            <v-select
              v-model="form.recurrenceFreq"
              :items="recurrenceItems"
              hide-details="auto"
            />
            <p v-if="form.recurrenceFreq && recurrenceCaption" class="text-caption text-medium-emphasis mt-1">
              {{ recurrenceCaption }}. Chaque date pourra être modifiée séparément.
            </p>
          </FieldRow>
          <FieldRow v-if="form.recurrenceFreq" label="Jusqu’au">
            <v-text-field v-model="form.recurrenceUntil" type="date" hide-details="auto" />
          </FieldRow>
        </template>
        <FieldRow label="Lieu" class="form-fields-grid__span-2">
          <v-text-field v-model="form.lieu" hide-details />
        </FieldRow>
        <FieldRow label="Description" align-top class="form-fields-grid__span-2">
          <v-textarea v-model="form.description" hide-details rows="4" />
        </FieldRow>
        <FieldRow label="Publication">
          <v-checkbox v-model="form.publie" label="Visible dans l’espace membres" hide-details />
        </FieldRow>
        <FieldRow label="Sondage">
          <v-checkbox
            v-model="pasDeSondage"
            label="Pas de sondage"
            hide-details
          />
        </FieldRow>
        <FieldRow label="Hors cercle">
          <v-checkbox
            v-model="form.horsCercle"
            label="Libre · Fest-noz / sortie hors cercle"
            hide-details
          />
        </FieldRow>
      </div>

      <SortieFiche
        v-if="isSortie"
        embedded
        :titre="fullTitle"
        :debut="fromLocalInput(form.debut)"
        :lieu="form.lieu"
        :sortie="form.sortie"
        :dancer-count="dancerCount"
        :people="people"
        editable
      />

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
import SortieFiche from '@/components/SortieFiche.vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'
import { summarizePresences } from '@/domain/presence'
import {
  applyEventTitlePrefix,
  eventKindSelectItems,
  eventTitlePrefix,
  eventTitleRest,
  groupesFromKinds,
  kindsAreRepetition,
  primaryTypeFromKinds,
} from '@/domain/eventKinds'
import { danceGroupSelectItems } from '@/domain/eventGroups'
import { emptySortie, normalizeSortie } from '@/domain/sortie'
import {
  defaultRecurrenceUntil,
  RECURRENCE_FREQS,
  recurrenceSummary,
} from '@/domain/recurrence'

const props = defineProps({ id: { type: String, default: '' } })
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const ready = ref(false)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const success = ref('')
const people = ref([])
const presences = ref([])
const originalType = ref('autre')
const groupesTouched = ref(false)
const isEdit = computed(() => Boolean(props.id))
const kindItems = computed(() => eventKindSelectItems())
const groupItems = computed(() => danceGroupSelectItems())
const recurrenceItems = [
  { title: 'Ne pas répéter', value: '' },
  ...RECURRENCE_FREQS.map((entry) => ({ title: entry.label, value: entry.id })),
]

const form = reactive({
  kinds: [],
  groupes: [],
  titleRest: '',
  debut: '',
  fin: '',
  lieu: '',
  description: '',
  publie: true,
  inscriptionsOuvertes: false,
  horsCercle: false,
  recurrenceFreq: '',
  recurrenceUntil: '',
  sortie: emptySortie(),
})

const titlePrefix = computed(() => eventTitlePrefix(form.kinds))
const fullTitle = computed(() => applyEventTitlePrefix(form.titleRest, form.kinds))
const isSortie = computed(() => form.kinds.includes('sortie') || form.kinds.includes('fest_noz'))
const isRepetition = computed(() => kindsAreRepetition(form.kinds))
const showRecurrence = computed(() => !isEdit.value && isRepetition.value)
const recurrenceCaption = computed(() =>
  recurrenceSummary(fromLocalInput(form.debut), { freq: form.recurrenceFreq }),
)
const pasDeSondage = computed({
  get: () => !form.inscriptionsOuvertes,
  set: (value) => {
    form.inscriptionsOuvertes = !value
  },
})
const dancerCount = computed(() => summarizePresences(presences.value, props.id).present)
const required = (value) => Boolean(String(value || '').trim()) || 'Champ requis'
const requiredKinds = (value) => (Array.isArray(value) && value.length > 0) || 'Choisissez au moins un type'
const requiredTitle = () => Boolean(String(fullTitle.value || '').trim()) || 'Champ requis'

watch(
  () => form.kinds.join(','),
  () => {
    if (!isEdit.value) {
      form.inscriptionsOuvertes = form.kinds.includes('sortie') || form.kinds.includes('concours')
      if (form.kinds.includes('fest_noz')) {
        form.horsCercle = true
        form.inscriptionsOuvertes = false
      }
      if (!groupesTouched.value) {
        form.groupes = groupesFromKinds(form.kinds).filter((id) =>
          groupItems.value.some((item) => item.value === id),
        )
      }
      if (!isRepetition.value) {
        form.recurrenceFreq = ''
      }
    }
  },
)

watch(
  () => form.debut,
  (value) => {
    if (!isEdit.value && isRepetition.value && form.recurrenceFreq && value) {
      if (!form.recurrenceUntil) form.recurrenceUntil = defaultRecurrenceUntil(fromLocalInput(value))
    }
  },
)

watch(
  () => form.recurrenceFreq,
  (freq) => {
    if (freq && !form.recurrenceUntil) {
      form.recurrenceUntil = defaultRecurrenceUntil(fromLocalInput(form.debut) || new Date().toISOString())
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

function applyFormFromEvent(event) {
  originalType.value = event.type || 'autre'
  groupesTouched.value = Array.isArray(event.groupes)
  Object.assign(form, {
    kinds: kindsFromEvent(event),
    groupes: Array.isArray(event.groupes)
      ? event.groupes.filter((id) => id && id !== 'monitorat')
      : [],
    titleRest: eventTitleRest(event.titre),
    debut: toLocalInput(event.debut),
    fin: toLocalInput(event.fin),
    lieu: event.lieu || '',
    description: event.description || '',
    publie: event.publie !== false,
    inscriptionsOuvertes: event.inscriptionsOuvertes === true,
    horsCercle: event.horsCercle === true,
    recurrenceFreq: '',
    recurrenceUntil: '',
    sortie: normalizeSortie(event.sortie),
  })
}

async function loadEvent(id) {
  const event = await api.event(id)
  applyFormFromEvent(event)
  presences.value = await api.eventPresences(id).catch(() => [])
}

onMounted(async () => {
  try {
    people.value = await api.people().catch(() => [])
    if (props.id) {
      await loadEvent(props.id)
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

watch(
  () => props.id,
  async (id, previous) => {
    if (!id || id === previous || !ready.value) return
    try {
      await loadEvent(id)
    } catch (err) {
      error.value = err.message || 'Impossible de charger l’événement.'
    }
  },
)

async function submit() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const payload = {
      kinds: form.kinds,
      groupes: form.groupes,
      type: primaryTypeFromKinds(form.kinds, originalType.value),
      titre: form.titleRest,
      debut: fromLocalInput(form.debut),
      fin: fromLocalInput(form.fin),
      lieu: form.lieu,
      description: form.description,
      publie: form.publie,
      inscriptionsOuvertes: form.inscriptionsOuvertes,
      horsCercle: form.horsCercle,
      sortie: isSortie.value ? form.sortie : null,
    }
    if (showRecurrence.value && form.recurrenceFreq) {
      payload.recurrence = {
        freq: form.recurrenceFreq,
        until: form.recurrenceUntil || defaultRecurrenceUntil(payload.debut),
      }
    }
    const saved = props.id ? await api.updateEvent(props.id, payload) : await api.createEvent(payload)
    const createdCount = Number(saved.createdCount || 1)
    applyFormFromEvent(saved)
    if (!props.id || saved.id !== props.id) {
      await router.replace({ name: 'event-edit', params: { id: saved.id } })
    }
    success.value =
      createdCount > 1
        ? `${createdCount} répétitions créées. Chaque date peut être modifiée séparément.`
        : 'Événement enregistré.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
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
