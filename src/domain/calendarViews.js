import { addDays, todayLocal } from './dates.js'

export const AGENDA_VIEWS = [
  { id: 'liste', label: 'Liste', icon: 'mdi-format-list-bulleted' },
  { id: 'semaine', label: 'Semaine', icon: 'mdi-calendar-week' },
  { id: 'mois', label: 'Mois', icon: 'mdi-calendar-month' },
  { id: 'annee', label: 'Année', icon: 'mdi-calendar' },
]

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

export function pad2(value) {
  return String(value).padStart(2, '0')
}

export function toLocalDay(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return todayLocal(date)
}

export function parseLocalDay(isoDay) {
  const [year, month, day] = String(isoDay || '')
    .split('-')
    .map(Number)
  if (!year || !month || !day) return null
  return { year, month, day, date: new Date(year, month - 1, day) }
}

export function startOfWeek(isoDay) {
  const parsed = parseLocalDay(isoDay || todayLocal())
  if (!parsed) return todayLocal()
  const weekday = (parsed.date.getDay() + 6) % 7
  return todayLocal(new Date(parsed.year, parsed.month - 1, parsed.day - weekday))
}

export function weekDays(isoDay) {
  const start = startOfWeek(isoDay)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function monthKey(isoDay) {
  return String(isoDay || '').slice(0, 7)
}

export function monthCells(year, month) {
  const first = `${year}-${pad2(month)}-01`
  const start = startOfWeek(first)
  const prefix = `${year}-${pad2(month)}`
  return Array.from({ length: 42 }, (_, index) => {
    const iso = addDays(start, index)
    return { iso, inMonth: iso.startsWith(prefix) }
  })
}

export function yearMonths(year) {
  return Array.from({ length: 12 }, (_, index) => ({
    year,
    month: index + 1,
    label: MONTH_LABELS[index],
    cells: monthCells(year, index + 1),
  }))
}

export function groupEventsByDay(events = []) {
  const map = new Map()
  for (const event of events) {
    const day = toLocalDay(event?.debut)
    if (!day) continue
    if (!map.has(day)) map.set(day, [])
    map.get(day).push(event)
  }
  for (const list of map.values()) {
    list.sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || '')))
  }
  return map
}

export function eventsOnDay(byDay, isoDay) {
  return byDay.get(isoDay) || []
}

export function listGroupsByDay(events = []) {
  const groups = []
  const index = new Map()
  const sorted = [...events].sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || '')))
  for (const event of sorted) {
    const day = toLocalDay(event?.debut)
    if (!day) continue
    let group = index.get(day)
    if (!group) {
      group = { day, events: [] }
      index.set(day, group)
      groups.push(group)
    }
    group.events.push(event)
  }
  return groups
}

export function groupEventsByMonth(events = []) {
  const groups = []
  const indexByKey = new Map()
  const sorted = [...events].sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || '')))
  for (const event of sorted) {
    const day = toLocalDay(event.debut)
    const key = monthKey(day)
    if (!key) continue
    let group = indexByKey.get(key)
    if (!group) {
      const [year, month] = key.split('-').map(Number)
      group = { key, label: `${MONTH_LABELS[(month || 1) - 1]} ${year}`, events: [] }
      indexByKey.set(key, group)
      groups.push(group)
    }
    group.events.push(event)
  }
  return groups
}

export function shiftPeriod(view, isoDay, delta = 1) {
  const parsed = parseLocalDay(isoDay || todayLocal())
  if (!parsed) return todayLocal()
  if (view === 'semaine') return addDays(startOfWeek(isoDay), delta * 7)
  if (view === 'annee') return `${parsed.year + delta}-${pad2(parsed.month)}-${pad2(parsed.day)}`
  if (view === 'liste') {
    const next = new Date(parsed.year, parsed.month - 1 + delta, 1)
    return todayLocal(next)
  }
  const next = new Date(parsed.year, parsed.month - 1 + delta, 1)
  return todayLocal(next)
}

export function periodLabel(view, isoDay) {
  const parsed = parseLocalDay(isoDay || todayLocal())
  if (!parsed) return ''
  if (view === 'annee') return String(parsed.year)
  if (view === 'semaine') {
    const days = weekDays(isoDay)
    const start = parseLocalDay(days[0])
    const end = parseLocalDay(days[6])
    if (!start || !end) return ''
    if (start.month === end.month) {
      return `${start.day} – ${end.day} ${MONTH_LABELS[start.month - 1]} ${start.year}`
    }
    return `${start.day} ${MONTH_LABELS[start.month - 1]} – ${end.day} ${MONTH_LABELS[end.month - 1]} ${end.year}`
  }
  return `${MONTH_LABELS[parsed.month - 1]} ${parsed.year}`
}

export function isAgendaView(value) {
  return AGENDA_VIEWS.some((entry) => entry.id === value)
}

export function eventTimeLabel(event) {
  const raw = event?.debut
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function eventDateBadge(value) {
  const day = toLocalDay(value?.debut || value)
  const parsed = parseLocalDay(day)
  if (!parsed) return { weekday: '', day: '', month: '' }
  const weekday = WEEKDAY_LABELS[(parsed.date.getDay() + 6) % 7]
  return {
    weekday,
    day: String(parsed.day),
    month: MONTH_LABELS[parsed.month - 1].slice(0, 3).toUpperCase(),
  }
}

export function eventsInMonth(events = [], isoDay) {
  const key = monthKey(isoDay)
  if (!key) return []
  return [...events]
    .filter((event) => monthKey(toLocalDay(event?.debut)) === key)
    .sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || '')))
}

export function eventsInYear(events = [], isoDay) {
  const year = String(parseLocalDay(isoDay || todayLocal())?.year || '')
  if (!year) return []
  return [...events]
    .filter((event) => toLocalDay(event?.debut).startsWith(`${year}-`))
    .sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || '')))
}

export function readStoredAgendaView(key, fallback = 'mois') {
  const safeFallback = isAgendaView(fallback) ? fallback : 'mois'
  if (typeof sessionStorage === 'undefined') return safeFallback
  try {
    const value = sessionStorage.getItem(key)
    return isAgendaView(value) ? value : safeFallback
  } catch {
    return safeFallback
  }
}

export function writeStoredAgendaView(key, value) {
  if (!key || !isAgendaView(value) || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* ignore quota / private mode */
  }
}
