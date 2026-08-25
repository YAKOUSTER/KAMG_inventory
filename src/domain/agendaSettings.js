import { GROUP_NAME } from './brand.js'
import { buildSingleEventIcs, toIcsUtcDate } from './ics.js'

const DEFAULT_AGENDA_SETTINGS = {
  googleCalendarId: 'korriganedarmeilhouglas.site@gmail.com',
  googleCalendarCid: 'a29ycmlnYW5lZGFybWVpbGhvdWdsYXMuc2l0ZUBnbWFpbC5jb20',
  googleCalendarName: 'Sorties — Korriganed Ar Meilhoù Glas',
}

export const APP_CALENDAR_ICS_PATH = '/api/public/calendar.ics'

export function normalizeAgendaSettings(input = {}) {
  const googleCalendarId = String(input.googleCalendarId || DEFAULT_AGENDA_SETTINGS.googleCalendarId).trim()
  return {
    googleCalendarId,
    googleCalendarCid: String(input.googleCalendarCid || DEFAULT_AGENDA_SETTINGS.googleCalendarCid).trim(),
    googleCalendarName: String(input.googleCalendarName || DEFAULT_AGENDA_SETTINGS.googleCalendarName).trim(),
    googleCalendarIcalUrl:
      String(input.googleCalendarIcalUrl || '').trim() ||
      `https://calendar.google.com/calendar/ical/${encodeURIComponent(googleCalendarId)}/public/basic.ics`,
    googleImportedAt: String(input.googleImportedAt || '').trim(),
    knownGoogleEventUids: Array.isArray(input.knownGoogleEventUids)
      ? input.knownGoogleEventUids.map((value) => String(value))
      : [],
  }
}

export function appCalendarIcsUrl(origin = '', groupes = []) {
  const base = String(origin || '').replace(/\/$/, '')
  const ids = [...new Set((Array.isArray(groupes) ? groupes : []).map((id) => String(id || '').trim()).filter(Boolean))]
  const query = ids.length ? `?groupes=${encodeURIComponent(ids.join(','))}` : ''
  return `${base}${APP_CALENDAR_ICS_PATH}${query}`
}

export function appCalendarWebcalUrl(origin = '', groupes = []) {
  return appCalendarIcsUrl(origin, groupes).replace(/^https:\/\//i, 'webcal://').replace(/^http:\/\//i, 'webcal://')
}

export function googleCalendarSubscribeFromIcsUrl(icsUrl) {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsUrl)}`
}

export function googleCalendarSubscribeUrl(settings) {
  const agenda = normalizeAgendaSettings(settings)
  if (agenda.googleCalendarCid) {
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(agenda.googleCalendarCid)}`
  }
  return `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(agenda.googleCalendarCid)}`
}

export function googleCalendarIcalSubscribeUrl(settings) {
  const agenda = normalizeAgendaSettings(settings)
  return agenda.googleCalendarIcalUrl.replace(/^https?:\/\//, 'webcal://')
}

export function googleCalendarAddEventUrl(event) {
  const params = new URLSearchParams()
  params.set('action', 'TEMPLATE')
  params.set('text', event.titre || 'Événement KAMG')
  params.set('dates', `${toIcsUtcDate(event.debut)}/${toIcsUtcDate(event.fin || event.debut)}`)
  if (event.description) params.set('details', event.description)
  if (event.lieu) params.set('location', event.lieu)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function publishedCalendarName(settings) {
  const agenda = normalizeAgendaSettings(settings)
  return agenda.googleCalendarName || GROUP_NAME
}

export { DEFAULT_AGENDA_SETTINGS, buildSingleEventIcs }
