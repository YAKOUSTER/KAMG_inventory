import { normalizeEvent } from './events.js'
import { filterEventsByGroups } from './eventGroups.js'

function unfoldIcs(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .reduce((lines, line) => {
      if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
        lines[lines.length - 1] += line.slice(1)
      } else {
        lines.push(line)
      }
      return lines
    }, [])
}

function parseIcsDate(value, timezone = 'Europe/Paris') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\d{8}T\d{6}Z$/i.test(raw)) {
    const year = raw.slice(0, 4)
    const month = raw.slice(4, 6)
    const day = raw.slice(6, 8)
    const hour = raw.slice(9, 11)
    const minute = raw.slice(11, 13)
    const second = raw.slice(13, 15)
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString()
  }
  if (/^\d{8}T\d{6}$/i.test(raw)) {
    const year = raw.slice(0, 4)
    const month = raw.slice(4, 6)
    const day = raw.slice(6, 8)
    const hour = raw.slice(9, 11)
    const minute = raw.slice(11, 13)
    const second = raw.slice(13, 15)
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+01:00`).toISOString()
  }
  if (/^\d{8}$/.test(raw)) {
    return new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T12:00:00`).toISOString()
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function unescapeIcsText(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

const GROUP_PATTERNS = [
  { id: 'korrigan', pattern: /korrigan/i },
  { id: 'enfant', pattern: /\benfant/i },
  { id: 'ado', pattern: /\bado\b/i },
  { id: 'tremplin', pattern: /tremplin/i },
  { id: 'concours', pattern: /concours/i },
  { id: 'loisir', pattern: /loisir/i },
  { id: 'gwennyn', pattern: /gwennyn/i },
  { id: 'sortie', pattern: /sortie|spectacle|fest-noz|défilé|defile|festival/i },
  { id: 'commission', pattern: /commission|deadline/i },
]

export function inferEventType(titre = '', description = '') {
  const text = `${titre} ${description}`.toLowerCase()
  if (/stage/i.test(text)) return 'stage'
  if (/cours/i.test(text)) return 'cours'
  if (/sortie|spectacle|fest-noz|défilé|defile|festival|gwennyn/i.test(text)) return 'sortie'
  if (/répétition|repetition|repétition|rep /i.test(text)) return 'repetition'
  return 'autre'
}

export function inferEventGroups(titre = '', description = '') {
  const text = `${titre}\n${description}`
  const groups = GROUP_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.id)
  return [...new Set(groups)]
}

export function parseIcsEvents(icsText) {
  const blocks = []
  let current = null
  for (const line of unfoldIcs(icsText)) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (current) blocks.push(current)
      current = null
      continue
    }
    if (!current) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const key = line.slice(0, separator).split(';')[0].toUpperCase()
    const value = line.slice(separator + 1)
    current[key] = unescapeIcsText(value)
  }

  return blocks
    .map((block) => {
      const titre = block.SUMMARY || 'Sans titre'
      const description = block.DESCRIPTION || ''
      const debut = parseIcsDate(block.DTSTART)
      const fin = parseIcsDate(block.DTEND) || debut
      if (!debut) return null
      const googleUid = block.UID || ''
      const type = inferEventType(titre, description)
      const groupes = inferEventGroups(titre, description)
      return normalizeEvent(
        {
          id: `google-${googleUid.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 80)}`,
          source: 'google',
          googleUid,
          type,
          titre,
          debut,
          fin,
          lieu: block.LOCATION || '',
          description,
          publie: true,
          groupes,
        },
        { id: `google-${googleUid.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 80)}` },
      )
    })
    .filter(Boolean)
}

export function mergeAgendaEvents(localEvents = [], googleEvents = []) {
  const googleUids = new Set(googleEvents.map((event) => event.googleUid).filter(Boolean))
  const locals = localEvents.filter((event) => event.source !== 'google' && !googleUids.has(event.googleUid))
  return [...googleEvents, ...locals]
}

export function toIcsUtcDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value) => String(value).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

export function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

const ICS_LINE_LIMIT = 75

function utf8Bytes(text) {
  return new TextEncoder().encode(String(text || ''))
}

function sliceUtf8Octets(text, start, maxOctets) {
  const bytes = utf8Bytes(text).slice(start)
  if (bytes.length <= maxOctets) {
    return { chunk: new TextDecoder().decode(bytes), next: start + bytes.length, done: true }
  }
  let end = maxOctets
  while (end > 0 && (bytes[end] & 0b11000000) === 0b10000000) end -= 1
  if (end <= 0) {
    end = 1
    while (end < bytes.length && (bytes[end] & 0b11000000) === 0b10000000) end += 1
  }
  return {
    chunk: new TextDecoder().decode(bytes.slice(0, end)),
    next: start + end,
    done: end >= bytes.length,
  }
}

export function foldIcsLine(line) {
  const text = String(line || '')
  const limit = ICS_LINE_LIMIT
  if (utf8Bytes(text).length <= limit) return text
  const chunks = []
  let offset = 0
  let first = true
  const total = utf8Bytes(text).length
  while (offset < total) {
    const max = first ? limit : limit - 1
    const { chunk, next } = sliceUtf8Octets(text, offset, max)
    if (next <= offset) break
    chunks.push(first ? chunk : ` ${chunk}`)
    first = false
    offset = next
  }
  return chunks.join('\r\n')
}

export function icsLinesRespectOctetLimit(ics) {
  return String(ics || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .every((line) => utf8Bytes(line).length <= ICS_LINE_LIMIT)
}

export function eventIcsUid(event) {
  const googleUid = String(event?.googleUid || '').trim()
  if (googleUid) return googleUid
  const id = String(event?.id || 'event').replace(/[^a-zA-Z0-9._-]+/g, '-')
  return `kamg-${id}@kamg.sterennfonseca.fr`
}

export function eventIcsSequence(event) {
  const value = Number(event?.sequence)
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.floor(value)
}

export function icsTombstoneFromEvent(event, { now = new Date() } = {}) {
  const stamp = now instanceof Date ? now.toISOString() : String(now || '')
  return {
    id: String(event?.id || ''),
    googleUid: String(event?.googleUid || '').trim(),
    titre: String(event?.titre || 'Événement KAMG'),
    debut: event?.debut,
    fin: event?.fin || event?.debut,
    lieu: String(event?.lieu || ''),
    description: String(event?.description || ''),
    groupes: Array.isArray(event?.groupes) ? event.groupes.map((id) => String(id || '').trim()).filter(Boolean) : [],
    sequence: eventIcsSequence(event) + 1,
    updatedAt: stamp || new Date().toISOString(),
    cancelled: true,
    publie: true,
  }
}

export function normalizeIcsTombstone(entry) {
  if (!entry || typeof entry !== 'object') return null
  const id = String(entry.id || '').trim()
  const debut = entry.debut
  if (!id || !debut) return null
  return {
    id,
    googleUid: String(entry.googleUid || '').trim(),
    titre: String(entry.titre || 'Événement KAMG'),
    debut,
    fin: entry.fin || debut,
    lieu: String(entry.lieu || ''),
    description: String(entry.description || ''),
    groupes: Array.isArray(entry.groupes) ? entry.groupes.map((id) => String(id || '').trim()).filter(Boolean) : [],
    sequence: eventIcsSequence(entry),
    updatedAt: entry.updatedAt || entry.cancelledAt || new Date().toISOString(),
    cancelled: true,
    publie: true,
  }
}

function icsEndUtcDate(event, debut) {
  const fin = toIcsUtcDate(event.fin || event.debut) || debut
  if (fin && debut && fin > debut) return fin
  const start = new Date(event.debut)
  if (Number.isNaN(start.getTime())) return debut
  start.setUTCHours(start.getUTCHours() + 1)
  return toIcsUtcDate(start.toISOString()) || debut
}

function veventLines(event) {
  const debut = toIcsUtcDate(event.debut)
  if (!debut) return []
  const fin = icsEndUtcDate(event, debut)
  const stamp = toIcsUtcDate(event.updatedAt || event.createdAt || new Date().toISOString()) || toIcsUtcDate(new Date().toISOString())
  const cancelled = event.cancelled === true
  const lines = [
    'BEGIN:VEVENT',
    `UID:${eventIcsUid(event)}`,
    `DTSTAMP:${stamp}`,
    `LAST-MODIFIED:${stamp}`,
    `SEQUENCE:${eventIcsSequence(event)}`,
    `DTSTART:${debut}`,
    `DTEND:${fin}`,
    `SUMMARY:${escapeIcsText(event.titre || 'Événement KAMG')}`,
  ]
  if (event.description && !cancelled) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  if (event.lieu) lines.push(`LOCATION:${escapeIcsText(event.lieu)}`)
  if (cancelled) lines.push('STATUS:CANCELLED')
  else if (event.publie === false) lines.push('STATUS:TENTATIVE')
  else lines.push('STATUS:CONFIRMED')
  lines.push('END:VEVENT')
  return lines
}

export function isPublishableEvent(event) {
  if (!event || event.publie === false) return false
  const time = Date.parse(event.debut)
  if (!Number.isFinite(time)) return false
  if (time < Date.parse('1980-01-01T00:00:00Z')) return false
  return Boolean(String(event.titre || '').trim())
}

export function buildSingleEventIcs(event) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KAMG//Gestion KAMG//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...veventLines(event),
    'END:VCALENDAR',
  ]
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

export function buildCalendarIcs(events = [], { calName = 'Korriganed Ar Meilhoù Glas', groupes = [], cancelled = [] } = {}) {
  const published = filterEventsByGroups(events.filter(isPublishableEvent), groupes)
  const liveUids = new Set(published.map((event) => eventIcsUid(event)))
  const cancelledEvents = filterEventsByGroups(
    (cancelled || []).filter((event) => event && event.cancelled !== false && !liveUids.has(eventIcsUid(event))),
    groupes,
  )
  const sorted = [...published].sort((a, b) => String(a.debut).localeCompare(String(b.debut)))
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KAMG//Gestion KAMG//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    'X-WR-TIMEZONE:Europe/Paris',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ]
  for (const event of sorted) lines.push(...veventLines(event))
  for (const event of cancelledEvents) lines.push(...veventLines({ ...event, cancelled: true }))
  lines.push('END:VCALENDAR')
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}
