const DEFAULT_AGENDA_SETTINGS = {
  googleCalendarId: 'korriganedarmeilhouglas.site@gmail.com',
  googleCalendarCid: 'a29ycmlnYW5lZGFybWVpbGhvdWdsYXMuc2l0ZUBnbWFpbC5jb20',
  googleCalendarName: 'Sorties — Korriganed Ar Meilhoù Glas',
}

export function normalizeAgendaSettings(input = {}) {
  const googleCalendarId = String(input.googleCalendarId || DEFAULT_AGENDA_SETTINGS.googleCalendarId).trim()
  return {
    googleCalendarId,
    googleCalendarCid: String(input.googleCalendarCid || DEFAULT_AGENDA_SETTINGS.googleCalendarCid).trim(),
    googleCalendarName: String(input.googleCalendarName || DEFAULT_AGENDA_SETTINGS.googleCalendarName).trim(),
    googleCalendarIcalUrl:
      String(input.googleCalendarIcalUrl || '').trim() ||
      `https://calendar.google.com/calendar/ical/${encodeURIComponent(googleCalendarId)}/public/basic.ics`,
  }
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
  params.set('dates', `${toGoogleDate(event.debut)}/${toGoogleDate(event.fin || event.debut)}`)
  if (event.description) params.set('details', event.description)
  if (event.lieu) params.set('location', event.lieu)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function toGoogleDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value) => String(value).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

export function buildSingleEventIcs(event) {
  const uid = event.googleUid || event.id || `kamg-${Date.now()}@kamg.local`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KAMG//Patrimoine textile//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toGoogleDate(new Date().toISOString())}`,
    `DTSTART:${toGoogleDate(event.debut)}`,
    `DTEND:${toGoogleDate(event.fin || event.debut)}`,
    `SUMMARY:${escapeIcsText(event.titre || 'Événement KAMG')}`,
  ]
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  if (event.lieu) lines.push(`LOCATION:${escapeIcsText(event.lieu)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export { DEFAULT_AGENDA_SETTINGS }
