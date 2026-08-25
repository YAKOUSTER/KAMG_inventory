<template>
  <div class="rsvp-poll">
    <v-autocomplete
      v-if="publicMode && !hideIdentity"
      :model-value="personId"
      :items="personItems"
      label="Votre nom"
      hide-details
      density="compact"
      auto-select-first
      clearable
      class="rsvp-poll__who"
      @update:model-value="emit('update:personId', $event || '')"
    />

    <p v-if="publicMode && !personId && hideIdentity" class="rsvp-poll__hint">
      Choisissez votre nom en haut de page pour répondre.
    </p>

    <div class="rsvp-poll__actions">
      <button
        v-for="statut in PRESENCE_STATUTS"
        :key="statut.id"
        type="button"
        class="rsvp-poll__btn"
        :class="{
          [`is-${statut.id}`]: true,
          'is-selected': currentStatut === statut.id,
          'is-pending': saving && pendingStatut === statut.id,
        }"
        :disabled="!canRespond || (saving && pendingStatut !== statut.id)"
        @click="choose(statut.id)"
      >
        <v-icon size="18">{{ statut.icon }}</v-icon>
        <span class="rsvp-poll__btn-label">{{ statut.actionLabel }}</span>
        <strong>{{ summary[statut.id] || 0 }}</strong>
      </button>
    </div>
    <p v-if="error" class="rsvp-poll__error">{{ error }}</p>

    <div v-if="showAttendees" class="rsvp-poll__people">
      <details v-for="group in attendeeGroups" :key="group.id" :open="group.id === 'present'">
        <summary>
          {{ group.label }}
          <span>{{ group.people.length }}</span>
        </summary>
        <ul v-if="group.people.length">
          <li v-for="person in group.people" :key="person.id">{{ personDisplayName(person) }}</li>
        </ul>
        <p v-else class="rsvp-poll__empty">Personne pour l’instant.</p>
      </details>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { personDisplayName } from '@/domain/person'
import {
  PRESENCE_STATUTS,
  filterPeopleForPresence,
  groupPeopleByPresence,
  presenceForPerson,
  summarizePresences,
} from '@/domain/presence'
import { api } from '@/services/api'

const props = defineProps({
  event: { type: Object, required: true },
  people: { type: Array, default: () => [] },
  presences: { type: Array, default: () => [] },
  personId: { type: String, default: '' },
  publicMode: { type: Boolean, default: false },
  hideIdentity: { type: Boolean, default: false },
  showAttendees: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['updated', 'update:personId'])

const saving = ref(false)
const pendingStatut = ref('')
const error = ref('')

const filteredPeople = computed(() => filterPeopleForPresence(props.people, 'tous'))
const personItems = computed(() =>
  filteredPeople.value.map((person) => ({
    title: personDisplayName(person),
    value: person.id,
  })),
)
const localPresences = computed(() =>
  (props.presences || []).filter((entry) => entry.eventId === props.event.id),
)
const summary = computed(() => summarizePresences(localPresences.value, props.event.id))
const currentStatut = computed(
  () => presenceForPerson(localPresences.value, props.event.id, props.personId)?.statut || '',
)
const grouped = computed(() =>
  groupPeopleByPresence(filteredPeople.value, localPresences.value, props.event.id),
)
const attendeeGroups = computed(() => [
  { id: 'present', label: 'Présent·e·s', people: grouped.value.present },
  { id: 'maybe', label: 'Peut-être', people: grouped.value.maybe },
  { id: 'absent', label: 'Absent·e·s', people: grouped.value.absent },
  { id: 'unanswered', label: 'Sans réponse', people: grouped.value.unanswered },
])
const canRespond = computed(() => {
  if (props.readonly) return false
  if (!props.event?.id) return false
  if (!props.publicMode) return Boolean(props.personId)
  return Boolean(props.personId)
})

async function choose(statut) {
  if (!canRespond.value) return
  const previous = currentStatut.value
  const next = previous === statut ? '' : statut
  saving.value = true
  pendingStatut.value = statut
  error.value = ''
  emit('updated', {
    eventId: props.event.id,
    personId: props.personId,
    statut: next,
    deleted: !next,
  })
  try {
    const record = props.publicMode
      ? await api.setPublicEventPresence(props.event.id, { personId: props.personId, statut: next })
      : await api.setEventPresence(props.event.id, { personId: props.personId, statut: next })
    emit('updated', record)
  } catch (err) {
    error.value = err.message || 'Réponse impossible.'
    emit('updated', {
      eventId: props.event.id,
      personId: props.personId,
      statut: previous,
      deleted: !previous,
    })
  } finally {
    saving.value = false
    pendingStatut.value = ''
  }
}
</script>

<style scoped>
.rsvp-poll__who {
  margin-bottom: 10px;
}

.rsvp-poll__hint,
.rsvp-poll__empty {
  margin: 0 0 8px;
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.62);
}

.rsvp-poll__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.rsvp-poll__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 56px;
  border: 1px solid var(--kamg-border);
  border-radius: 12px;
  background: #fff;
  color: inherit;
  cursor: pointer;
  padding: 6px 4px;
}

.rsvp-poll__btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.rsvp-poll__btn-label {
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.15;
}

.rsvp-poll__btn strong {
  font-size: 0.95rem;
}

.rsvp-poll__btn.is-present.is-selected {
  background: #c8e6c9;
  border-color: #81c784;
  color: #1b5e20;
}

.rsvp-poll__btn.is-absent.is-selected {
  background: #ffcdd2;
  border-color: #e57373;
  color: #b71c1c;
}

.rsvp-poll__btn.is-maybe.is-selected {
  background: #fff59d;
  border-color: #fbc02d;
  color: #5d4037;
}

.rsvp-poll__btn.is-pending {
  opacity: 0.65;
}

.rsvp-poll__error {
  color: rgb(var(--v-theme-error));
  font-size: 0.82rem;
  margin: 8px 0 0;
}

.rsvp-poll__people {
  margin-top: 10px;
}

.rsvp-poll__people details {
  border-top: 1px solid var(--kamg-border);
  padding: 6px 0;
}

.rsvp-poll__people summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 0.86rem;
  display: flex;
  justify-content: space-between;
}

.rsvp-poll__people ul {
  margin: 6px 0 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
</style>
