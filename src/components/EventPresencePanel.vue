<template>
  <div class="presence-panel">
    <div class="presence-panel__summary d-flex flex-wrap ga-2 mb-3">
      <v-chip size="small" color="success" variant="tonal">{{ summary.present }} présent·e·s</v-chip>
      <v-chip size="small" color="error" variant="tonal">{{ summary.absent }} absent·e·s</v-chip>
      <v-chip size="small" color="warning" variant="tonal">{{ summary.maybe }} peut-être</v-chip>
    </div>

    <p class="presence-panel__legend text-caption mb-3">
      Comme l’ancien tableur : <strong>1</strong> présent, <strong>0</strong> absent, <strong>?</strong> peut-être.
    </p>

    <v-select
      v-model="groupFilter"
      :items="groupItems"
      label="Groupe"
      hide-details
      density="compact"
      class="mb-3"
    />

    <v-autocomplete
      v-model="selectedPersonId"
      :items="personItems"
      label="Votre nom"
      hide-details
      density="compact"
      auto-select-first
      class="mb-3"
    />

      <div class="d-flex flex-wrap ga-2 mb-3">
      <v-btn
        v-for="statut in PRESENCE_STATUTS"
        :key="statut.id"
        size="small"
        class="text-none"
        :color="statut.color"
        :variant="currentStatut === statut.id ? 'flat' : 'tonal'"
        :disabled="!selectedPersonId || saving"
        :loading="saving && pendingStatut === statut.id"
        @click="choose(statut.id)"
      >
        {{ statut.short }} — {{ statut.label }}
      </v-btn>
      <v-btn
        size="small"
        class="text-none"
        variant="text"
        :disabled="!selectedPersonId || !currentStatut || saving"
        @click="choose('')"
      >
        Effacer
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
    <v-alert v-if="saved" type="success" variant="tonal" density="compact" class="mb-3">
      Présence enregistrée.
    </v-alert>

    <details class="presence-panel__list">
      <summary>Voir les réponses ({{ filteredPeopleWithStatus.length }})</summary>
      <ul>
        <li v-for="row in filteredPeopleWithStatus" :key="row.person.id">
          <strong>{{ displayName(row.person) }}</strong>
          <span :class="`presence-panel__status presence-panel__status--${row.statut || 'none'}`">
            {{ row.statut ? presenceStatutMeta(row.statut).label : '—' }}
          </span>
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { personDisplayName } from '@/domain/person'
import {
  PRESENCE_STATUTS,
  PRESENCE_GROUP_FILTERS,
  filterPeopleForPresence,
  presenceForPerson,
  presenceStatutMeta,
  summarizePresences,
} from '@/domain/presence'
import { api } from '@/services/api'

const props = defineProps({
  event: { type: Object, required: true },
  people: { type: Array, default: () => [] },
  presences: { type: Array, default: () => [] },
  publicMode: { type: Boolean, default: false },
})

const emit = defineEmits(['updated'])

const groupFilter = ref('tous')
const selectedPersonId = ref('')
const saving = ref(false)
const pendingStatut = ref('')
const error = ref('')
const saved = ref(false)

const groupItems = PRESENCE_GROUP_FILTERS.map((group) => ({ title: group.label, value: group.id }))
const filteredPeople = computed(() => filterPeopleForPresence(props.people, groupFilter.value))
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
  () => presenceForPerson(localPresences.value, props.event.id, selectedPersonId.value)?.statut || '',
)

const filteredPeopleWithStatus = computed(() =>
  filteredPeople.value
    .map((person) => ({
      person,
      statut: presenceForPerson(localPresences.value, props.event.id, person.id)?.statut || '',
    }))
    .filter((row) => row.statut)
)

function displayName(person) {
  return personDisplayName(person)
}

async function choose(statut) {
  if (!selectedPersonId.value) return
  saving.value = true
  pendingStatut.value = statut
  error.value = ''
  saved.value = false
  try {
    const payload = { personId: selectedPersonId.value, statut }
    const record = props.publicMode
      ? await api.setPublicEventPresence(props.event.id, payload)
      : await api.setEventPresence(props.event.id, payload)
    saved.value = true
    emit('updated', record)
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
    pendingStatut.value = ''
  }
}
</script>

<style scoped>
.presence-panel__legend {
  color: rgba(44, 51, 44, 0.68);
}

.presence-panel__list {
  margin-top: 4px;
}

.presence-panel__list summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.presence-panel__list ul {
  margin: 8px 0 0;
  padding-left: 1.1rem;
}

.presence-panel__list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.presence-panel__status--present {
  color: rgb(var(--v-theme-success));
}
.presence-panel__status--absent {
  color: rgb(var(--v-theme-error));
}
.presence-panel__status--maybe {
  color: rgb(var(--v-theme-warning));
}
.presence-panel__status--none {
  color: rgba(44, 51, 44, 0.5);
}
</style>
