import { parseIcsEvents } from '../src/domain/ics.js'
import { normalizeAgendaSettings } from '../src/domain/agendaSettings.js'

const cache = new Map()
const DEFAULT_TTL_MS = 15 * 60 * 1000

export function resetGoogleCalendarCache() {
  cache.clear()
}

export async function fetchGoogleCalendarEvents(settings, { ttlMs = DEFAULT_TTL_MS, fetchImpl = fetch } = {}) {
  const agenda = normalizeAgendaSettings(settings)
  if (!agenda.googleCalendarIcalUrl) return []

  const cacheKey = agenda.googleCalendarIcalUrl
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < ttlMs) {
    return cached.events
  }

  const response = await fetchImpl(agenda.googleCalendarIcalUrl, {
    headers: { Accept: 'text/calendar' },
  })
  if (!response.ok) {
    throw Object.assign(new Error(`Google Agenda inaccessible (${response.status})`), { status: 502 })
  }
  const icsText = await response.text()
  const events = parseIcsEvents(icsText)
  cache.set(cacheKey, { fetchedAt: Date.now(), events })
  return events
}
