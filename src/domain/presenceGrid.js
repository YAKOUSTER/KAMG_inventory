import { eventAcceptsInscriptions } from './events.js'
import { todayLocal } from './dates.js'
import { WEEKDAY_LABELS, parseLocalDay, toLocalDay } from './calendarViews.js'
import { presenceStatutMeta } from './presence.js'

export function presenceCellKey(eventId, personId) {
  return `${eventId}::${personId}`
}

export function indexPresences(presences = []) {
  const map = new Map()
  for (const entry of presences) {
    if (!entry?.eventId || !entry?.personId) continue
    map.set(presenceCellKey(entry.eventId, entry.personId), entry)
  }
  return map
}

export function cyclePresenceStatut(current) {
  if (current === 'present') return 'absent'
  if (current === 'absent') return 'maybe'
  if (current === 'maybe') return ''
  return 'present'
}

export function statutFromGridKey(key) {
  if (key === '1') return 'present'
  if (key === '0') return 'absent'
  if (key === '?') return 'maybe'
  if (key === 'Delete' || key === 'Backspace' || key === ' ' || key === 'Space') return ''
  return null
}

export function moveGridFocus(row, col, rowCount, colCount, dRow = 0, dCol = 0) {
  if (!rowCount || !colCount) return { row: 0, col: 0 }
  return {
    row: Math.min(rowCount - 1, Math.max(0, Number(row) + Number(dRow))),
    col: Math.min(colCount - 1, Math.max(0, Number(col) + Number(dCol))),
  }
}

export function inscriptionEventsForGrid(events = [], now = new Date()) {
  const today = todayLocal(now)
  return [...events]
    .filter((event) => eventAcceptsInscriptions(event))
    .filter((event) => {
      const day = toLocalDay(event.debut)
      return day && day >= today
    })
    .sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || '')))
}

export function presenceColumnMeta(event) {
  const day = toLocalDay(event?.debut)
  const parsed = parseLocalDay(day)
  const weekday = parsed ? WEEKDAY_LABELS[(parsed.date.getDay() + 6) % 7] : ''
  const dateLabel = parsed
    ? `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}`
    : day
  return {
    id: event?.id,
    event,
    day,
    weekday,
    dateLabel,
    titre: event?.titre || '',
  }
}

export function cellShortLabel(statut) {
  return presenceStatutMeta(statut)?.short || ''
}
