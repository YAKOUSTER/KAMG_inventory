<template>
  <div class="agenda-cal">
    <div class="agenda-cal__toolbar">
      <div class="agenda-cal__views" role="tablist" aria-label="Vue agenda">
        <button
          v-for="entry in views"
          :key="entry.id"
          type="button"
          class="agenda-cal__view"
          :class="{ 'is-active': view === entry.id }"
          :aria-pressed="view === entry.id"
          @click="setView(entry.id)"
        >
          <v-icon size="18">{{ entry.icon }}</v-icon>
          <span>{{ entry.label }}</span>
        </button>
      </div>

      <div class="agenda-cal__nav">
        <v-btn icon variant="text" size="small" aria-label="Période précédente" @click="shift(-1)">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <button type="button" class="agenda-cal__today" @click="goToday">Aujourd’hui</button>
        <v-btn icon variant="text" size="small" aria-label="Période suivante" @click="shift(1)">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
        <div class="agenda-cal__label">{{ label }}</div>
      </div>
    </div>

    <div v-if="view === 'liste'" class="agenda-cal__list">
      <article
        v-for="event in listEvents"
        :key="event.id"
        class="agenda-cal__list-item"
        @click="emit('select', event)"
      >
        <time class="agenda-cal__list-when">
          <span>{{ displayDate(event.debut) }}</span>
          <span>{{ eventTimeLabel(event) }}</span>
        </time>
        <div class="agenda-cal__list-body">
          <div class="d-flex flex-wrap ga-1 align-center mb-1">
            <v-chip size="x-small" :color="eventTypeMeta(event.type).color" variant="tonal">
              {{ eventTypeLabel(event.type) }}
            </v-chip>
            <v-chip v-if="event.publie === false" size="x-small" color="warning" variant="tonal">
              Brouillon
            </v-chip>
            <v-chip v-if="event.inscriptionsOuvertes" size="x-small" color="deep-orange" variant="tonal">
              Inscriptions
            </v-chip>
          </div>
          <div class="agenda-cal__list-title">{{ event.titre }}</div>
          <div v-if="event.lieu" class="agenda-cal__list-meta">{{ event.lieu }}</div>
        </div>
      </article>
      <p v-if="!listEvents.length" class="agenda-cal__empty">Aucun événement sur cette période.</p>
    </div>

    <div v-else-if="view === 'semaine'" class="agenda-cal__week">
      <div v-for="day in week" :key="day" class="agenda-cal__week-col" :class="dayClass(day)">
        <button type="button" class="agenda-cal__week-head" @click="onEmptyDay(day)">
          <span>{{ weekdayLabel(day) }}</span>
          <strong>{{ dayNumber(day) }}</strong>
        </button>
        <button
          v-for="event in eventsFor(day)"
          :key="event.id"
          type="button"
          class="agenda-cal__chip"
          :class="`agenda-cal__chip--${event.type || 'autre'}`"
          @click.stop="emit('select', event)"
        >
          <span class="agenda-cal__chip-time">{{ eventTimeLabel(event) }}</span>
          {{ event.titre }}
        </button>
        <button
          v-if="canWrite && !eventsFor(day).length"
          type="button"
          class="agenda-cal__add"
          @click="onEmptyDay(day)"
        >
          +
        </button>
      </div>
    </div>

    <div v-else-if="view === 'mois'" class="agenda-cal__month">
      <div v-for="name in weekdayLabels" :key="name" class="agenda-cal__dow">{{ name }}</div>
      <div
        v-for="cell in month"
        :key="cell.iso"
        class="agenda-cal__cell"
        :class="dayClass(cell.iso, cell.inMonth)"
      >
        <button type="button" class="agenda-cal__cell-num" @click="onDayOrCreate(cell)">
          {{ dayNumber(cell.iso) }}
        </button>
        <button
          v-for="event in eventsFor(cell.iso).slice(0, 3)"
          :key="event.id"
          type="button"
          class="agenda-cal__chip agenda-cal__chip--compact"
          :class="`agenda-cal__chip--${event.type || 'autre'}`"
          @click="emit('select', event)"
        >
          {{ eventTimeLabel(event) }} {{ event.titre }}
        </button>
        <span v-if="eventsFor(cell.iso).length > 3" class="agenda-cal__more">
          +{{ eventsFor(cell.iso).length - 3 }}
        </span>
      </div>
    </div>

    <div v-else class="agenda-cal__year">
      <button
        v-for="entry in year"
        :key="entry.month"
        type="button"
        class="agenda-cal__mini"
        @click="openMonth(entry)"
      >
        <div class="agenda-cal__mini-title">{{ entry.label }}</div>
        <div class="agenda-cal__mini-grid">
          <span v-for="name in weekdayLabels" :key="`${entry.month}-${name}`" class="agenda-cal__mini-dow">
            {{ name.charAt(0) }}
          </span>
          <span
            v-for="cell in entry.cells"
            :key="cell.iso"
            class="agenda-cal__mini-day"
            :class="miniDayClass(cell)"
          >
            {{ dayNumber(cell.iso) }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { displayDate, todayLocal } from '@/domain/dates'
import { eventTypeLabel, eventTypeMeta } from '@/domain/events'
import {
  AGENDA_VIEWS,
  WEEKDAY_LABELS,
  eventsInMonth,
  eventsOnDay,
  eventTimeLabel,
  groupEventsByDay,
  monthCells,
  periodLabel,
  readStoredAgendaView,
  shiftPeriod,
  weekDays,
  writeStoredAgendaView,
  yearMonths,
  parseLocalDay,
} from '@/domain/calendarViews'

const props = defineProps({
  events: { type: Array, default: () => [] },
  canWrite: { type: Boolean, default: false },
  storageKey: { type: String, default: 'kamg-agenda-view' },
  initialView: { type: String, default: 'mois' },
})

const emit = defineEmits(['select', 'create'])

const views = AGENDA_VIEWS
const weekdayLabels = WEEKDAY_LABELS
const view = ref(readStoredAgendaView(props.storageKey, props.initialView))
const cursor = ref(todayLocal())

const byDay = computed(() => groupEventsByDay(props.events))
const label = computed(() => periodLabel(view.value, cursor.value))
const week = computed(() => weekDays(cursor.value))
const parsedCursor = computed(() => parseLocalDay(cursor.value))
const month = computed(() => {
  const parsed = parsedCursor.value
  return parsed ? monthCells(parsed.year, parsed.month) : []
})
const year = computed(() => {
  const parsed = parsedCursor.value
  return parsed ? yearMonths(parsed.year) : []
})
const listEvents = computed(() => eventsInMonth(props.events, cursor.value))

watch(view, (value) => writeStoredAgendaView(props.storageKey, value))

function setView(next) {
  view.value = next
}

function shift(delta) {
  cursor.value = shiftPeriod(view.value, cursor.value, delta)
}

function goToday() {
  cursor.value = todayLocal()
}

function eventsFor(isoDay) {
  return eventsOnDay(byDay.value, isoDay)
}

function dayNumber(isoDay) {
  return Number(String(isoDay).slice(8, 10))
}

function weekdayLabel(isoDay) {
  const parsed = parseLocalDay(isoDay)
  if (!parsed) return ''
  return WEEKDAY_LABELS[(parsed.date.getDay() + 6) % 7]
}

function isToday(isoDay) {
  return isoDay === todayLocal()
}

function dayClass(isoDay, inMonth = true) {
  return {
    'is-today': isToday(isoDay),
    'is-out': !inMonth,
  }
}

function miniDayClass(cell) {
  return {
    'is-out': !cell.inMonth,
    'is-today': isToday(cell.iso),
    'has-events': eventsFor(cell.iso).length > 0 && cell.inMonth,
  }
}

function onEmptyDay(isoDay) {
  if (props.canWrite) emit('create', isoDay)
}

function onDayOrCreate(cell) {
  const events = eventsFor(cell.iso)
  if (events.length === 1) {
    emit('select', events[0])
    return
  }
  if (!events.length && props.canWrite) {
    emit('create', cell.iso)
  }
}

function openMonth(entry) {
  const day = `${entry.year}-${String(entry.month).padStart(2, '0')}-01`
  cursor.value = day
  view.value = 'mois'
}
</script>

<style scoped>
.agenda-cal {
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: 16px;
  padding: 12px;
}

.agenda-cal__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.agenda-cal__views {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  background: rgba(83, 115, 106, 0.08);
  border-radius: 999px;
  padding: 4px;
}

.agenda-cal__view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: inherit;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}

.agenda-cal__view.is-active {
  background: #fff;
  box-shadow: 0 1px 4px rgba(44, 51, 44, 0.12);
}

.agenda-cal__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.agenda-cal__today {
  border: 1px solid var(--kamg-border);
  background: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.82rem;
  cursor: pointer;
}

.agenda-cal__label {
  font-weight: 700;
  margin-left: 8px;
}

.agenda-cal__empty {
  color: rgba(44, 51, 44, 0.62);
  margin: 12px 4px;
}

.agenda-cal__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agenda-cal__list-item {
  display: flex;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
}

.agenda-cal__list-item:hover {
  background: rgba(83, 115, 106, 0.08);
}

.agenda-cal__list-when {
  display: flex;
  flex-direction: column;
  min-width: 88px;
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.68);
}

.agenda-cal__list-title {
  font-weight: 700;
}

.agenda-cal__list-meta {
  font-size: 0.88rem;
  color: rgba(44, 51, 44, 0.68);
}

.agenda-cal__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.agenda-cal__week-col {
  min-height: 180px;
  border: 1px solid var(--kamg-border);
  border-radius: 12px;
  padding: 6px;
  background: #fafbfa;
}

.agenda-cal__week-col.is-today {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(106, 140, 105, 0.08);
}

.agenda-cal__week-head {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 0;
  background: none;
  cursor: pointer;
  margin-bottom: 6px;
  font-size: 0.75rem;
  color: rgba(44, 51, 44, 0.62);
}

.agenda-cal__chip {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  border-radius: 8px;
  padding: 4px 6px;
  margin-bottom: 4px;
  font-size: 0.75rem;
  line-height: 1.25;
  cursor: pointer;
  background: rgba(106, 140, 105, 0.16);
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-cal__chip--sortie {
  background: rgba(184, 92, 56, 0.16);
}

.agenda-cal__chip--repetition {
  background: rgba(106, 140, 105, 0.18);
}

.agenda-cal__chip--stage,
.agenda-cal__chip--cours {
  background: rgba(83, 115, 106, 0.16);
}

.agenda-cal__chip-time {
  font-weight: 700;
  margin-right: 4px;
}

.agenda-cal__add {
  width: 100%;
  border: 1px dashed var(--kamg-border);
  background: transparent;
  border-radius: 8px;
  color: rgba(44, 51, 44, 0.45);
  cursor: pointer;
}

.agenda-cal__month {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.agenda-cal__dow {
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  color: rgba(44, 51, 44, 0.55);
  padding: 4px 0;
}

.agenda-cal__cell {
  min-height: 92px;
  border: 1px solid var(--kamg-border);
  border-radius: 10px;
  background: #fff;
  text-align: left;
  padding: 6px;
}

.agenda-cal__cell-num {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  font-size: 0.78rem;
  font-weight: 700;
  margin-bottom: 4px;
  text-align: left;
  cursor: pointer;
  padding: 0;
}

.agenda-cal__cell.is-out {
  opacity: 0.42;
}

.agenda-cal__cell.is-today {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(106, 140, 105, 0.08);
}

.agenda-cal__chip--compact {
  margin-bottom: 2px;
}

.agenda-cal__more {
  font-size: 0.7rem;
  color: rgba(44, 51, 44, 0.55);
}

.agenda-cal__year {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.agenda-cal__mini {
  border: 1px solid var(--kamg-border);
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  cursor: pointer;
  text-align: left;
}

.agenda-cal__mini-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.agenda-cal__mini-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}

.agenda-cal__mini-dow,
.agenda-cal__mini-day {
  font-size: 0.62rem;
  text-align: center;
}

.agenda-cal__mini-day.is-out {
  opacity: 0.28;
}

.agenda-cal__mini-day.has-events {
  font-weight: 700;
  border-radius: 999px;
  background: rgba(106, 140, 105, 0.22);
}

.agenda-cal__mini-day.is-today {
  outline: 1px solid rgb(var(--v-theme-primary));
  border-radius: 999px;
}

@media (max-width: 900px) {
  .agenda-cal__week {
    grid-template-columns: 1fr;
  }

  .agenda-cal__week-col {
    min-height: 0;
  }

  .agenda-cal__month {
    gap: 2px;
  }

  .agenda-cal__cell {
    min-height: 64px;
    padding: 4px;
  }
}
</style>
