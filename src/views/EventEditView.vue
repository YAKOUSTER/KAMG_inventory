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
          <p class="kamg-title-box__meta">
            {{ isSortie ? 'Fiche sortie' : 'Événement du cercle' }}
            <span v-if="isPast"> · Passé</span>
          </p>
        </div>
      </header>

      <v-alert v-if="isPast" type="info" variant="tonal" class="mb-4" density="compact">
        Cet événement est passé. Vous pouvez encore le modifier.
      </v-alert>
      <v-alert v-if="libreOnly" type="info" variant="tonal" class="mb-4" density="compact">
        Vous pouvez ajouter ou modifier uniquement des sorties non officielles (fest-noz / hors cercle).
      </v-alert>

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
          <FieldRow v-if="form.recurrenceFreq" label="Sauf le" class="form-fields-grid__span-2">
            <p class="text-caption text-medium-emphasis mb-2">
              Décochez les dates à ne pas créer (vacances, jours fériés…). Vous pouvez aussi ajouter une
              date ci-dessous.
            </p>
            <div v-if="recurrencePreview.length" class="recurrence-dates">
              <v-checkbox
                v-for="item in recurrencePreview"
                :key="item.day"
                :model-value="!form.recurrenceExcept.includes(item.day)"
                :label="item.label"
                hide-details
                density="compact"
                @update:model-value="toggleOccurrence(item.day, $event)"
              />
            </div>
            <div class="d-flex flex-wrap ga-2 align-end mt-2">
              <v-text-field
                v-model="exceptDraft"
                type="date"
                hide-details
                density="compact"
                label="Date à sauter"
                class="recurrence-except-date"
              />
              <v-btn
                variant="tonal"
                class="text-none"
                :disabled="!exceptDraft"
                @click="addExceptDate"
              >
                Sauf cette date
              </v-btn>
            </div>
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
            :disabled="libreOnly"
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
        <v-btn variant="text" :to="cancelTo">Annuler</v-btn>
        <v-spacer />
        <v-btn
          v-if="isEdit && canDeleteEvent"
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
import { isLibreAgendaUser } from '@/domain/auth'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'
import { summarizePresences } from '@/domain/presence'
import {
  applyEventTitlePrefix,
  eventKindSelectItems,
  eventTitlePrefix,
  eventTitleRest,
  groupesFromKinds,
  kindsAllowRecurrence,
  kindsAreRepetition,
  primaryTypeFromKinds,
} from '@/domain/eventKinds'
import { danceGroupSelectItems } from '@/domain/eventGroups'
import { emptySortie, normalizeSortie } from '@/domain/sortie'
import { assertCanMutateEvent, canMutateEvent, eventIsPast } from '@/domain/events'
import {
  defaultRecurrenceUntil,
  expandRecurringDates,
  normalizeSkipDates,
  RECURRENCE_FREQS,
  recurrenceSummary,
  recurrenceWeekdayLabel,
} from '@/domain/recurrence'
import { displayDate, todayLocal } from '@/domain/dates'

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
const cancelTo = computed(() =>
  isEdit.value ? { name: 'event-detail', params: { id: props.id } } : { name: 'agenda' },
)
const libreOnly = computed(() => isLibreAgendaUser(auth.user))
const kindItems = computed(() => {
  const items = eventKindSelectItems()
  if (!libreOnly.value) return items
  return items.filter((item) => item.value === 'fest_noz' || item.value === 'sortie')
})
const canDeleteEvent = computed(
  () => canMutateEvent(auth.user, { horsCercle: form.horsCercle, kinds: form.kinds }),
)
const groupItems = computed(() => danceGroupSelectItems())
const recurrenceItems = [
  { title: 'Ne pas répéter', value: '' },
  ...RECURRENCE_FREQS.map((entry) => ({ title: entry.label, value: entry.id })),
]

const exceptDraft = ref('')
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
  recurrenceExcept: [],
  sortie: emptySortie(),
})

const titlePrefix = computed(() => eventTitlePrefix(form.kinds))
const fullTitle = computed(() => applyEventTitlePrefix(form.titleRest, form.kinds))
const isSortie = computed(() => form.kinds.includes('sortie') || form.kinds.includes('fest_noz'))
const isRepetition = computed(() => kindsAreRepetition(form.kinds))
const isPast = computed(() =>
  eventIsPast({
    debut: fromLocalInput(form.debut),
    fin: fromLocalInput(form.fin),
  }),
)
const showRecurrence = computed(() => !isEdit.value && kindsAllowRecurrence(form.kinds))
const recurrenceCaption = computed(() =>
  recurrenceSummary(fromLocalInput(form.debut), {
    freq: form.recurrenceFreq,
    except: form.recurrenceExcept,
  }),
)
const recurrencePreview = computed(() => {
  if (!form.recurrenceFreq || !form.debut) return []
  return expandRecurringDates(fromLocalInput(form.debut), {
    freq: form.recurrenceFreq,
    until: form.recurrenceUntil || defaultRecurrenceUntil(fromLocalInput(form.debut)),
  }).map((iso) => {
    const day = todayLocal(new Date(iso))
    const weekday = recurrenceWeekdayLabel(iso)
    return {
      iso,
      day,
      label: weekday ? `${weekday} ${displayDate(day)}` : displayDate(day),
    }
  })
})
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
  libreOnly,
  (value) => {
    if (value) form.horsCercle = true
  },
  { immediate: true },
)

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
      if (!showRecurrence.value) {
        form.recurrenceFreq = ''
        form.recurrenceExcept = []
      }
    }
  },
)

watch(
  () => form.debut,
  (value) => {
    if (!isEdit.value && showRecurrence.value && form.recurrenceFreq && value) {
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

function toggleOccurrence(day, keep) {
  const id = String(day || '').slice(0, 10)
  if (!id) return
  if (keep) {
    form.recurrenceExcept = form.recurrenceExcept.filter((entry) => entry !== id)
    return
  }
  if (!form.recurrenceExcept.includes(id)) form.recurrenceExcept = [...form.recurrenceExcept, id]
}

function addExceptDate() {
  const day = String(exceptDraft.value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return
  if (!form.recurrenceExcept.includes(day)) form.recurrenceExcept = [...form.recurrenceExcept, day]
  exceptDraft.value = ''
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
    recurrenceExcept: [],
    sortie: normalizeSortie(event.sortie),
  })
}

async function loadEvent(id) {
  const event = await api.event(id)
  assertCanMutateEvent(auth.user, event)
  applyFormFromEvent(event)
  if (libreOnly.value) form.horsCercle = true
  presences.value = await api.eventPresences(id).catch(() => [])
}

onMounted(async () => {
  try {
    people.value = await api.people().catch(() => [])
    if (props.id) {
      await loadEvent(props.id)
    } else {
      if (libreOnly.value) {
        form.horsCercle = true
        if (!form.kinds.length) form.kinds = ['fest_noz']
      }
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
      horsCercle: libreOnly.value ? true : form.horsCercle,
      sortie: isSortie.value ? form.sortie : null,
    }
    if (showRecurrence.value && form.recurrenceFreq) {
      payload.recurrence = {
        freq: form.recurrenceFreq,
        until: form.recurrenceUntil || defaultRecurrenceUntil(payload.debut),
        except: normalizeSkipDates(form.recurrenceExcept),
      }
    }
    const saved = props.id ? await api.updateEvent(props.id, payload) : await api.createEvent(payload)
    const createdCount = Number(saved.createdCount || 1)
    await router.push({
      name: 'event-detail',
      params: { id: saved.id },
      query: createdCount > 1 ? { created: String(createdCount) } : { saved: '1' },
    })
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

.recurrence-dates {
  max-height: 240px;
  overflow: auto;
  padding: 4px 8px;
  border: 1px solid var(--kamg-border, #d5d8cf);
  border-radius: 12px;
  background: #fff;
}

.recurrence-except-date {
  max-width: 220px;
}
</style>
