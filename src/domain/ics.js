import { normalizeEvent } from './events.js'

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
  { id: 'monitorat', pattern: /monitorat/i },
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
