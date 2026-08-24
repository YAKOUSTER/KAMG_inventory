<template>
  <div class="presence-grid">
    <div class="presence-grid__toolbar">
      <div class="presence-grid__filters">
        <v-chip
          v-for="group in groupFilters"
          :key="group.id"
          :color="groupFilter === group.id ? 'primary' : undefined"
          :variant="groupFilter === group.id ? 'flat' : 'outlined'"
          size="small"
          class="text-none"
          @click="groupFilter = group.id"
        >
          {{ group.label }}
        </v-chip>
      </div>
      <v-autocomplete
        v-if="publicMode"
        v-model="selectedPersonId"
        :items="personItems"
        label="Votre nom"
        hide-details
        density="compact"
        auto-select-first
        clearable
        class="presence-grid__who"
      />
    </div>

    <p class="presence-grid__legend">
      Comme un tableur : une colonne par date, une ligne par personne. Cliquez une case pour
      cycler <strong>1</strong> (présent), <strong>0</strong> (absent), <strong>?</strong> (peut-être),
      vide. Flèches pour changer de case, puis 1 / 0 / ? / Suppr.
    </p>

    <v-alert v-if="publicMode && !selectedPersonId" type="info" variant="tonal" class="mb-3" density="compact">
      Choisissez votre nom pour remplir votre ligne. Les autres réponses restent visibles.
    </v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-3" density="compact">{{ error }}</v-alert>

    <div v-if="columns.length && rows.length" class="presence-grid__scroll" @keydown="onKeydown">
      <table class="presence-grid__table">
        <thead>
          <tr>
            <th class="presence-grid__name-col">Personne</th>
            <th v-for="column in columns" :key="column.id" class="presence-grid__date-col">
              <div class="presence-grid__weekday">{{ column.weekday }}</div>
              <div class="presence-grid__date">{{ column.dateLabel }}</div>
              <div class="presence-grid__event" :title="column.titre">{{ column.titre }}</div>
              <div class="presence-grid__counts">
                {{ summaryFor(column.id).present }} /
                {{ summaryFor(column.id).absent }} /
                {{ summaryFor(column.id).maybe }}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(person, rowIndex) in rows"
            :key="person.id"
            :class="{ 'is-mine': person.id === selectedPersonId }"
          >
            <th class="presence-grid__name-col">{{ displayName(person) }}</th>
            <td v-for="(column, colIndex) in columns" :key="`${person.id}-${column.id}`">
              <button
                type="button"
                class="presence-grid__cell"
                :class="cellClass(person.id, column.id)"
                :disabled="!canEditCell(person.id) || isPending(person.id, column.id)"
                :tabindex="focus.row === rowIndex && focus.col === colIndex ? 0 : -1"
                :data-row="rowIndex"
                :data-col="colIndex"
                :aria-label="cellAria(person, column)"
                @focus="focus = { row: rowIndex, col: colIndex }"
                @click="cycleCell(person.id, column.event)"
              >
                {{ cellLabel(person.id, column.id) || '·' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <v-alert v-else type="info" variant="tonal">
      Aucune sortie à venir avec inscriptions ouvertes.
    </v-alert>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { personDisplayName } from '@/domain/person'
import {
  PRESENCE_GROUP_FILTERS,
  filterPeopleForPresence,
  presenceStatutMeta,
  summarizePresences,
} from '@/domain/presence'
import {
  cellShortLabel,
  cyclePresenceStatut,
  indexPresences,
  inscriptionEventsForGrid,
  moveGridFocus,
  presenceCellKey,
  presenceColumnMeta,
  statutFromGridKey,
} from '@/domain/presenceGrid'
import { api } from '@/services/api'

const PERSON_KEY = 'kamg-presence-person-id'

const props = defineProps({
  events: { type: Array, default: () => [] },
  people: { type: Array, default: () => [] },
  presences: { type: Array, default: () => [] },
  publicMode: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['updated'])

const groupFilter = ref('tous')
const selectedPersonId = ref('')
const error = ref('')
const pending = ref(new Set())
const focus = reactive({ row: 0, col: 0 })
const groupFilters = PRESENCE_GROUP_FILTERS

const columns = computed(() => inscriptionEventsForGrid(props.events).map(presenceColumnMeta))
const rows = computed(() => filterPeopleForPresence(props.people, groupFilter.value))
const personItems = computed(() =>
  rows.value.map((person) => ({ title: personDisplayName(person), value: person.id })),
)
const byCell = computed(() => indexPresences(props.presences))

onMounted(() => {
  if (!props.publicMode || typeof sessionStorage === 'undefined') return
  try {
    const stored = sessionStorage.getItem(PERSON_KEY)
    if (stored && props.people.some((person) => person.id === stored)) {
      selectedPersonId.value = stored
    }
  } catch {
    /* ignore */
  }
})

watch(selectedPersonId, (value) => {
  if (!props.publicMode || typeof sessionStorage === 'undefined') return
  try {
    if (value) sessionStorage.setItem(PERSON_KEY, value)
    else sessionStorage.removeItem(PERSON_KEY)
  } catch {
    /* ignore */
  }
  const row = rows.value.findIndex((person) => person.id === value)
  if (row >= 0) {
    focus.row = row
    nextTick(() => focusCell())
  }
})

watch(rows, (list) => {
  if (focus.row >= list.length) focus.row = Math.max(0, list.length - 1)
})

function displayName(person) {
  return personDisplayName(person)
}

function summaryFor(eventId) {
  return summarizePresences(props.presences, eventId)
}

function currentStatut(personId, eventId) {
  return byCell.value.get(presenceCellKey(eventId, personId))?.statut || ''
}

function cellLabel(personId, eventId) {
  return cellShortLabel(currentStatut(personId, eventId))
}

function cellClass(personId, eventId) {
  const statut = currentStatut(personId, eventId)
  return {
    [`is-${statut || 'empty'}`]: true,
    'is-pending': isPending(personId, eventId),
    'is-mine': personId === selectedPersonId.value,
  }
}

function cellAria(person, column) {
  const statut = currentStatut(person.id, column.id)
  const label = presenceStatutMeta(statut)?.label || 'sans réponse'
  return `${displayName(person)}, ${column.titre} ${column.dateLabel} : ${label}`
}

function canEditCell(personId) {
  if (props.readonly) return false
  if (!props.publicMode) return true
  return Boolean(selectedPersonId.value && selectedPersonId.value === personId)
}

function isPending(personId, eventId) {
  return pending.value.has(presenceCellKey(eventId, personId))
}

async function saveCell(personId, event, statut) {
  if (!canEditCell(personId)) return
  const key = presenceCellKey(event.id, personId)
  const previous = byCell.value.get(key)
  error.value = ''
  pending.value = new Set([...pending.value, key])
  emit('updated', {
    eventId: event.id,
    personId,
    statut: statut || '',
    deleted: !statut,
  })
  try {
    const payload = { personId, statut: statut || '' }
    const record = props.publicMode
      ? await api.setPublicEventPresence(event.id, payload)
      : await api.setEventPresence(event.id, payload)
    emit('updated', record)
  } catch (err) {
    error.value = err.message || 'Enregistrement impossible.'
    emit(
      'updated',
      previous
        ? previous
        : { eventId: event.id, personId, statut: '', deleted: true },
    )
  } finally {
    const next = new Set(pending.value)
    next.delete(key)
    pending.value = next
  }
}

function cycleCell(personId, event) {
  const next = cyclePresenceStatut(currentStatut(personId, event.id))
  saveCell(personId, event, next)
}

function focusCell() {
  const el = document.querySelector(
    `.presence-grid__cell[data-row="${focus.row}"][data-col="${focus.col}"]`,
  )
  el?.focus()
}

function onKeydown(event) {
  if (!columns.value.length || !rows.value.length) return
  const key = event.key
  if (key.startsWith('Arrow')) {
    event.preventDefault()
    const delta = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[key]
    const next = moveGridFocus(focus.row, focus.col, rows.value.length, columns.value.length, ...delta)
    focus.row = next.row
    focus.col = next.col
    nextTick(() => focusCell())
    return
  }
  const statut = statutFromGridKey(key === ' ' ? ' ' : key)
  if (statut == null) return
  event.preventDefault()
  const person = rows.value[focus.row]
  const column = columns.value[focus.col]
  if (!person || !column) return
  saveCell(person.id, column.event, statut)
}
</script>

<style scoped>
.presence-grid__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 8px;
}

.presence-grid__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.presence-grid__who {
  min-width: min(100%, 280px);
}

.presence-grid__legend {
  font-size: 0.88rem;
  color: rgba(44, 51, 44, 0.72);
  margin: 0 0 12px;
}

.presence-grid__scroll {
  overflow: auto;
  max-height: min(70vh, 720px);
  border: 1px solid var(--kamg-border);
  border-radius: 12px;
  background: #fff;
}

.presence-grid__table {
  border-collapse: separate;
  border-spacing: 0;
  min-width: 100%;
}

.presence-grid__table th,
.presence-grid__table td {
  border-bottom: 1px solid var(--kamg-border);
  border-right: 1px solid var(--kamg-border);
  padding: 0;
  vertical-align: middle;
}

.presence-grid__name-col {
  position: sticky;
  left: 0;
  z-index: 2;
  min-width: 160px;
  max-width: 220px;
  background: #fff;
  text-align: left;
  font-weight: 600;
  padding: 8px 10px !important;
  box-shadow: 4px 0 8px rgba(44, 51, 44, 0.04);
}

thead .presence-grid__name-col,
thead .presence-grid__date-col {
  position: sticky;
  top: 0;
  z-index: 3;
  background: #f4f6f4;
}

thead .presence-grid__name-col {
  z-index: 4;
}

.presence-grid__date-col {
  min-width: 88px;
  text-align: center;
  padding: 8px 6px !important;
  font-weight: 600;
}

.presence-grid__weekday {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: rgba(44, 51, 44, 0.55);
}

.presence-grid__date {
  font-size: 0.92rem;
}

.presence-grid__event {
  font-size: 0.68rem;
  font-weight: 500;
  max-width: 92px;
  margin: 2px auto 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.presence-grid__counts {
  font-size: 0.65rem;
  color: rgba(44, 51, 44, 0.5);
  font-weight: 500;
}

.presence-grid__cell {
  width: 100%;
  min-height: 42px;
  border: 0;
  background: transparent;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
}

.presence-grid__cell:disabled {
  cursor: default;
  opacity: 0.85;
}

.presence-grid__cell:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.presence-grid__cell.is-present {
  background: rgba(76, 175, 80, 0.18);
  color: #2e7d32;
}

.presence-grid__cell.is-absent {
  background: rgba(184, 92, 56, 0.16);
  color: #8d3a22;
}

.presence-grid__cell.is-maybe {
  background: rgba(168, 181, 69, 0.22);
  color: #5c6418;
}

.presence-grid__cell.is-empty {
  color: rgba(44, 51, 44, 0.28);
}

.presence-grid__cell.is-pending {
  opacity: 0.55;
}

tr.is-mine .presence-grid__name-col {
  background: rgba(106, 140, 105, 0.12);
}

@media (max-width: 700px) {
  .presence-grid__name-col {
    min-width: 120px;
  }

  .presence-grid__date-col {
    min-width: 76px;
  }
}
</style>
