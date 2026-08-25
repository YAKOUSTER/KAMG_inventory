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
        <template v-if="view !== 'liste'">
          <v-btn icon variant="text" size="small" aria-label="Période précédente" @click="shift(-1)">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <button type="button" class="agenda-cal__today" @click="goToday">Aujourd’hui</button>
          <v-btn icon variant="text" size="small" aria-label="Période suivante" @click="shift(1)">
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </template>
        <div class="agenda-cal__label">{{ label }}</div>
        <button
          type="button"
          class="agenda-cal__holidays-toggle"
          :class="{ 'is-active': holidaysVisible }"
          :aria-pressed="holidaysVisible"
          :title="RENNES_ACADEMY.legend"
          @click="toggleHolidays"
        >
          <v-icon size="16">mdi-beach</v-icon>
          <span>Vacances</span>
        </button>
      </div>
    </div>

    <div v-if="view === 'liste'" class="agenda-cal__list">
      <section v-for="group in listGroups" :key="group.day" class="agenda-cal__day-group">
        <h3 class="agenda-cal__day-heading">
          {{ weekdayLabel(group.day) }} {{ displayDate(group.day) }}
          <span v-if="holidayShort(group.day)" class="agenda-cal__holiday-chip">{{ holidayShort(group.day) }}</span>
          <span v-if="group.events.length > 1" class="agenda-cal__day-count">
            {{ group.events.length }} événements
          </span>
        </h3>
        <article
          v-for="event in group.events"
          :key="event.id"
          class="agenda-cal__list-item"
          :class="{ 'is-past': isPastEvent(event) }"
          @click="emit('select', event)"
        >
          <time class="agenda-cal__list-when">
            <span>{{ eventTimeLabel(event) }}</span>
          </time>
          <div class="agenda-cal__list-body">
            <div class="d-flex flex-wrap ga-1 align-center mb-1">
              <EventKindChips :event="event" />
              <v-chip v-if="event.publie === false" size="x-small" color="warning" variant="tonal">
                Brouillon
              </v-chip>
              <v-chip v-if="isPastEvent(event)" size="x-small" variant="tonal" color="secondary">
                Passé
              </v-chip>
            </div>
            <div class="agenda-cal__list-title">{{ event.titre }}</div>
            <div v-if="event.lieu" class="agenda-cal__list-meta">{{ event.lieu }}</div>
          </div>
        </article>
      </section>
      <p v-if="!listGroups.length" class="agenda-cal__empty">Aucun événement.</p>
    </div>

    <div v-else-if="view === 'semaine'" class="agenda-cal__week">
      <div v-for="day in week" :key="day" class="agenda-cal__week-col" :class="dayClass(day)">
        <button type="button" class="agenda-cal__week-head" @click="openDay(day)">
          <span>{{ weekdayLabel(day) }}</span>
          <strong>{{ dayNumber(day) }}</strong>
          <span v-if="holidayShort(day)" class="agenda-cal__holiday-chip">{{ holidayShort(day) }}</span>
          <span v-if="eventsFor(day).length > 1" class="agenda-cal__day-count">
            {{ eventsFor(day).length }}
          </span>
        </button>
        <button
          v-for="event in eventsFor(day)"
          :key="event.id"
          type="button"
          class="agenda-cal__chip"
          :class="chipClass(event)"
          @click.stop="emit('select', event)"
        >
          <span class="agenda-cal__chip-time">{{ eventTimeLabel(event) }}</span>
          {{ event.titre }}
        </button>
        <button
          v-if="canWrite"
          type="button"
          class="agenda-cal__add"
          @click="emit('create', day)"
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
        :class="{ ...dayClass(cell.iso, cell.inMonth), 'has-events': eventsFor(cell.iso).length > 0 }"
      >
        <button type="button" class="agenda-cal__cell-num" @click="openDay(cell.iso)">
          {{ dayNumber(cell.iso) }}
          <span v-if="holidayShort(cell.iso)" class="agenda-cal__holiday-dot" :title="holidayLabel(cell.iso)" />
          <span v-if="eventsFor(cell.iso).length > 1" class="agenda-cal__day-count">
            {{ eventsFor(cell.iso).length }}
          </span>
        </button>
        <button
          v-for="event in eventsFor(cell.iso).slice(0, 3)"
          :key="event.id"
          type="button"
          class="agenda-cal__chip agenda-cal__chip--compact"
          :class="chipClass(event)"
          @click="emit('select', event)"
        >
          {{ eventTimeLabel(event) }} {{ event.titre }}
        </button>
        <button
          v-if="eventsFor(cell.iso).length > 3"
          type="button"
          class="agenda-cal__more"
          @click="openDay(cell.iso)"
        >
          +{{ eventsFor(cell.iso).length - 3 }} autres
        </button>
      </div>
    </div>

    <div v-else class="agenda-cal__year">
      <div v-for="entry in year" :key="entry.month" class="agenda-cal__mini">
        <button type="button" class="agenda-cal__mini-title" @click="openMonth(entry)">
          {{ entry.label }}
        </button>
        <div class="agenda-cal__mini-grid">
          <span v-for="name in weekdayLabels" :key="`${entry.month}-${name}`" class="agenda-cal__mini-dow">
            {{ name.charAt(0) }}
          </span>
          <button
            v-for="cell in entry.cells"
            :key="cell.iso"
            type="button"
            class="agenda-cal__mini-day"
            :class="miniDayClass(cell)"
            @click="openDay(cell.iso)"
          >
            {{ dayNumber(cell.iso) }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="holidaysVisible" class="agenda-cal__legend">
      <span class="agenda-cal__legend-swatch" aria-hidden="true" />
      {{ RENNES_ACADEMY.legend }}
    </p>

    <v-dialog v-model="dayOpen" max-width="480">
      <v-card v-if="selectedDay" class="pa-2">
        <v-card-title class="text-wrap">
          {{ weekdayLabel(selectedDay) }} {{ displayDate(selectedDay) }}
        </v-card-title>
        <v-card-text>
          <p v-if="holidayLabel(selectedDay)" class="agenda-cal__holiday-note">
            {{ holidayLabel(selectedDay) }} · {{ RENNES_ACADEMY.label }} (zone {{ RENNES_ACADEMY.zone }})
          </p>
          <p v-if="dayEvents.length > 1" class="text-body-2 text-medium-emphasis mb-3">
            {{ dayEvents.length }} événements ce jour-là.
          </p>
          <button
            v-for="event in dayEvents"
            :key="event.id"
            type="button"
            class="agenda-cal__day-item"
            :class="{ 'is-past': isPastEvent(event) }"
            @click="selectFromDay(event)"
          >
            <span class="agenda-cal__chip-time">{{ eventTimeLabel(event) }}</span>
            <EventKindChips :event="event" />
            <v-chip v-if="isPastEvent(event)" size="x-small" variant="tonal" color="secondary">
              Passé
            </v-chip>
            <span class="agenda-cal__list-title">{{ event.titre }}</span>
            <span v-if="event.lieu" class="agenda-cal__list-meta">{{ event.lieu }}</span>
          </button>
          <p v-if="!dayEvents.length" class="text-medium-emphasis">Aucun événement ce jour-là.</p>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="canWrite"
            color="primary"
            variant="tonal"
            class="text-none"
            prepend-icon="mdi-plus"
            @click="createFromDay"
          >
            Ajouter un événement
          </v-btn>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="dayOpen = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { displayDate, todayLocal } from '@/domain/dates'
import EventKindChips from '@/components/EventKindChips.vue'
import {
  AGENDA_VIEWS,
  WEEKDAY_LABELS,
  eventsOnDay,
  eventTimeLabel,
  groupEventsByDay,
  listGroupsByDay,
  monthCells,
  periodLabel,
  readStoredAgendaView,
  shiftPeriod,
  weekDays,
  writeStoredAgendaView,
  yearMonths,
  parseLocalDay,
} from '@/domain/calendarViews'
import {
  HOLIDAY_STORAGE_KEY,
  RENNES_ACADEMY,
  holidayLabel as holidayLabelForDay,
  holidayShortLabel,
  isSchoolHoliday,
  readStoredHolidaysVisible,
  writeStoredHolidaysVisible,
} from '@/domain/schoolHolidays'
import { eventIsPast } from '@/domain/events'

const props = defineProps({
  events: { type: Array, default: () => [] },
  canWrite: { type: Boolean, default: false },
  markPast: { type: Boolean, default: false },
  storageKey: { type: String, default: 'kamg-agenda-view' },
  initialView: { type: String, default: 'mois' },
})

const emit = defineEmits(['select', 'create'])

const views = AGENDA_VIEWS
const weekdayLabels = WEEKDAY_LABELS
const view = ref(readStoredAgendaView(props.storageKey, props.initialView))
const holidaysVisible = ref(readStoredHolidaysVisible(HOLIDAY_STORAGE_KEY, true))
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
const listEvents = computed(() =>
  [...props.events].sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || ''))),
)
const listGroups = computed(() => listGroupsByDay(listEvents.value))
const dayOpen = ref(false)
const selectedDay = ref('')
const dayEvents = computed(() => (selectedDay.value ? eventsFor(selectedDay.value) : []))

watch(view, (value) => writeStoredAgendaView(props.storageKey, value))
watch(holidaysVisible, (value) => writeStoredHolidaysVisible(HOLIDAY_STORAGE_KEY, value))

function setView(next) {
  view.value = next
}

function toggleHolidays() {
  holidaysVisible.value = !holidaysVisible.value
}

function holidayShort(isoDay) {
  return holidaysVisible.value ? holidayShortLabel(isoDay) : ''
}

function holidayLabel(isoDay) {
  return holidaysVisible.value ? holidayLabelForDay(isoDay) : ''
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

function isPastEvent(event) {
  return props.markPast && eventIsPast(event)
}

function chipClass(event) {
  return {
    [`agenda-cal__chip--${event.type || 'autre'}`]: true,
    'is-past': isPastEvent(event),
  }
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
    'is-holiday': holidaysVisible.value && isSchoolHoliday(isoDay),
  }
}

function miniDayClass(cell) {
  const count = eventsFor(cell.iso).length
  return {
    'is-out': !cell.inMonth,
    'is-today': isToday(cell.iso),
    'has-events': count > 0 && cell.inMonth,
    'has-many': count > 1 && cell.inMonth,
    'is-holiday': holidaysVisible.value && isSchoolHoliday(cell.iso),
  }
}

function openDay(isoDay) {
  selectedDay.value = isoDay
  const list = eventsFor(isoDay)
  if (!list.length) {
    if (holidaysVisible.value && isSchoolHoliday(isoDay) && !props.canWrite) {
      dayOpen.value = true
      return
    }
    if (props.canWrite) emit('create', isoDay)
    return
  }
  if (list.length === 1 && !props.canWrite) {
    emit('select', list[0])
    return
  }
  dayOpen.value = true
}

function selectFromDay(event) {
  dayOpen.value = false
  emit('select', event)
}

function createFromDay() {
  const day = selectedDay.value
  dayOpen.value = false
  if (day) emit('create', day)
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
  border-radius: var(--kamg-radius);
  box-shadow: var(--kamg-shadow);
  padding: 16px;
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

.agenda-cal__holidays-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--kamg-border);
  background: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  margin-left: 6px;
  color: inherit;
}

.agenda-cal__holidays-toggle.is-active {
  background: rgba(201, 162, 39, 0.22);
  border-color: rgba(168, 132, 24, 0.45);
}

.agenda-cal__legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 4px 0;
  font-size: 0.78rem;
  color: rgba(44, 51, 44, 0.68);
}

.agenda-cal__legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    -45deg,
    rgba(201, 162, 39, 0.18),
    rgba(201, 162, 39, 0.18) 4px,
    #fff 4px,
    #fff 8px
  );
  border: 1px solid rgba(168, 132, 24, 0.35);
  flex-shrink: 0;
}

.agenda-cal__holiday-chip {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(201, 162, 39, 0.22);
  color: #6b5310;
  font-size: 0.68rem;
  font-weight: 700;
}

.agenda-cal__holiday-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #c9a227;
  flex-shrink: 0;
}

.agenda-cal__holiday-note {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(201, 162, 39, 0.16);
  font-size: 0.86rem;
  color: #6b5310;
}

.agenda-cal__empty {
  color: rgba(44, 51, 44, 0.62);
  margin: 12px 4px;
}

.agenda-cal__day-group {
  margin-bottom: 12px;
}

.agenda-cal__day-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 700;
  margin: 8px 4px 4px;
}

.agenda-cal__day-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(106, 140, 105, 0.18);
  font-size: 0.72rem;
  font-weight: 700;
}

.agenda-cal__day-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 1px solid var(--kamg-border);
  background: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
}

.agenda-cal__day-item:hover {
  background: rgba(83, 115, 106, 0.08);
}

.agenda-cal__day-item.is-past,
.agenda-cal__list-item.is-past,
.agenda-cal__chip.is-past {
  opacity: 0.55;
  filter: grayscale(0.4);
}

.agenda-cal__day-item.is-past:hover,
.agenda-cal__list-item.is-past:hover,
.agenda-cal__chip.is-past:hover {
  opacity: 0.8;
  filter: grayscale(0.15);
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
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
}

.agenda-cal__week-col.is-holiday {
  background: repeating-linear-gradient(
    -45deg,
    rgba(201, 162, 39, 0.07),
    rgba(201, 162, 39, 0.07) 6px,
    #fff 6px,
    #fff 12px
  );
}

.agenda-cal__week-col.is-holiday.is-today {
  background: repeating-linear-gradient(
    -45deg,
    rgba(201, 162, 39, 0.1),
    rgba(201, 162, 39, 0.1) 6px,
    rgba(106, 140, 105, 0.1) 6px,
    rgba(106, 140, 105, 0.1) 12px
  );
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
  align-items: flex-start;
  gap: 2px;
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

.agenda-cal__chip--concours {
  background: rgba(201, 162, 39, 0.2);
}

.agenda-cal__chip--atelier {
  background: rgba(141, 110, 99, 0.18);
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
  display: flex;
  align-items: center;
  gap: 4px;
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
  background: #f7f8f7;
}

.agenda-cal__cell.is-out .agenda-cal__cell-num {
  color: rgba(44, 51, 44, 0.42);
}

.agenda-cal__cell.is-today {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
}

.agenda-cal__cell.is-holiday {
  background: repeating-linear-gradient(
    -45deg,
    rgba(201, 162, 39, 0.07),
    rgba(201, 162, 39, 0.07) 6px,
    #fff 6px,
    #fff 12px
  );
}

.agenda-cal__cell.is-holiday.is-today {
  background: repeating-linear-gradient(
    -45deg,
    rgba(201, 162, 39, 0.1),
    rgba(201, 162, 39, 0.1) 6px,
    rgba(106, 140, 105, 0.1) 6px,
    rgba(106, 140, 105, 0.1) 12px
  );
}

.agenda-cal__chip--compact {
  margin-bottom: 2px;
}

.agenda-cal__more {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  font-size: 0.7rem;
  color: rgba(44, 51, 44, 0.55);
  cursor: pointer;
  text-align: left;
  padding: 0;
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
  text-align: left;
}

.agenda-cal__mini-title {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: left;
  cursor: pointer;
  padding: 0;
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

.agenda-cal__mini-day {
  border: 0;
  background: transparent;
  padding: 2px 0;
  cursor: pointer;
}

.agenda-cal__mini-day.has-events {
  font-weight: 700;
  border-radius: 999px;
  background: rgba(106, 140, 105, 0.22);
}

.agenda-cal__mini-day.has-many {
  background: rgba(184, 92, 56, 0.22);
}

.agenda-cal__mini-day.is-holiday {
  background: rgba(201, 162, 39, 0.28);
  border-radius: 999px;
}

.agenda-cal__mini-day.is-holiday.has-events,
.agenda-cal__mini-day.is-holiday.has-many {
  box-shadow: inset 0 -2px 0 rgba(201, 162, 39, 0.9);
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
    min-height: 48px;
    padding: 4px;
  }

  .agenda-cal__month .agenda-cal__chip,
  .agenda-cal__month .agenda-cal__more {
    display: none;
  }

  .agenda-cal__cell.has-events {
    background: rgba(106, 140, 105, 0.12);
  }

  .agenda-cal__cell.is-holiday {
    background: repeating-linear-gradient(
      -45deg,
      rgba(201, 162, 39, 0.08),
      rgba(201, 162, 39, 0.08) 5px,
      #fff 5px,
      #fff 10px
    );
  }

  .agenda-cal__cell.is-holiday.has-events {
    box-shadow: inset 0 -3px 0 rgba(106, 140, 105, 0.55);
  }

  .agenda-cal__holidays-toggle span {
    display: none;
  }

  .agenda-cal__views span {
    display: none;
  }

  .agenda-cal__view {
    padding: 8px 10px;
  }
}
</style>
