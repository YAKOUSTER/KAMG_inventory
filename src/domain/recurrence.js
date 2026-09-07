import { displayDate, todayLocal } from './dates.js'

export const RECURRENCE_FREQS = [
  { id: 'weekly', label: 'Toutes les semaines' },
  { id: 'biweekly', label: '1 semaine sur 2' },
]

const WEEKDAY_LABELS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

export function recurrenceWeekdayLabel(isoDatetime) {
  const date = new Date(isoDatetime)
  if (Number.isNaN(date.getTime())) return ''
  return WEEKDAY_LABELS[date.getDay()] || ''
}

export function defaultRecurrenceUntil(startIso) {
  const date = new Date(startIso || Date.now())
  if (Number.isNaN(date.getTime())) return `${new Date().getFullYear()}-06-30`
  const year = date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear()
  return `${year}-06-30`
}

export function addWeeksLocal(isoDatetime, weeks) {
  const date = new Date(isoDatetime)
  if (Number.isNaN(date.getTime())) return isoDatetime
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + Number(weeks || 0) * 7,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  )
  return next.toISOString()
}

export function shiftEventTimes(originalStart, originalEnd, nextStart) {
  const start = new Date(originalStart)
  const end = new Date(originalEnd || originalStart)
  const next = new Date(nextStart)
  if ([start, end, next].some((value) => Number.isNaN(value.getTime()))) {
    return { debut: nextStart, fin: nextStart }
  }
  return {
    debut: next.toISOString(),
    fin: new Date(next.getTime() + (end.getTime() - start.getTime())).toISOString(),
  }
}

export function normalizeSkipDates(input = []) {
  const list = Array.isArray(input) ? input : [input]
  return [
    ...new Set(
      list
        .map((value) => String(value || '').trim().slice(0, 10))
        .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)),
    ),
  ].sort()
}

export function expandRecurringDates(startIso, recurrence = {}, { max = 52 } = {}) {
  const freq = recurrence?.freq
  const stepWeeks = freq === 'biweekly' ? 2 : freq === 'weekly' ? 1 : 0
  if (!stepWeeks || !startIso) return startIso ? [startIso] : []
  const untilDay = String(recurrence.until || '').slice(0, 10)
  const skip = new Set(normalizeSkipDates(recurrence.except || recurrence.skipDates || recurrence.exdates))
  const dates = []
  let current = startIso
  let guard = 0
  const maxSteps = Math.max(max * 2, 80)
  while (dates.length < max && guard < maxSteps) {
    guard += 1
    const parsed = new Date(current)
    if (Number.isNaN(parsed.getTime())) break
    const day = todayLocal(parsed)
    if (untilDay && day > untilDay) break
    if (!skip.has(day)) dates.push(current)
    current = addWeeksLocal(current, stepWeeks)
  }
  return dates
}

export function skipDatesLabel(days = []) {
  const skips = normalizeSkipDates(days)
  if (!skips.length) return ''
  if (skips.length <= 3) return `sauf le ${skips.map((day) => displayDate(day)).join(', le ')}`
  return `sauf ${skips.length} dates`
}

export function recurrenceSummary(startIso, recurrence = {}) {
  const weekday = recurrenceWeekdayLabel(startIso)
  let base = ''
  if (recurrence.freq === 'weekly') {
    base = weekday ? `Toutes les semaines le ${weekday}` : 'Toutes les semaines'
  } else if (recurrence.freq === 'biweekly') {
    base = weekday ? `1 semaine sur 2 le ${weekday}` : '1 semaine sur 2'
  }
  if (!base) return ''
  const skipped = skipDatesLabel(recurrence.except || recurrence.skipDates || recurrence.exdates)
  return skipped ? `${base}, ${skipped}` : base
}
