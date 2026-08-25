import { todayLocal } from './dates.js'

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

export function expandRecurringDates(startIso, recurrence = {}, { max = 52 } = {}) {
  const freq = recurrence?.freq
  const stepWeeks = freq === 'biweekly' ? 2 : freq === 'weekly' ? 1 : 0
  if (!stepWeeks || !startIso) return [startIso]
  const untilDay = String(recurrence.until || '').slice(0, 10)
  const dates = []
  let current = startIso
  while (dates.length < max) {
    const day = todayLocal(new Date(current))
    if (untilDay && day > untilDay) break
    dates.push(current)
    current = addWeeksLocal(current, stepWeeks)
  }
  return dates
}

export function recurrenceSummary(startIso, recurrence = {}) {
  const weekday = recurrenceWeekdayLabel(startIso)
  if (recurrence.freq === 'weekly') {
    return weekday ? `Toutes les semaines le ${weekday}` : 'Toutes les semaines'
  }
  if (recurrence.freq === 'biweekly') {
    return weekday ? `1 semaine sur 2 le ${weekday}` : '1 semaine sur 2'
  }
  return ''
}
