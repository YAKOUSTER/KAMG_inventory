export const EVENT_TYPES = [
  { id: 'repetition', label: 'Répétition', icon: 'mdi-calendar-clock', color: 'primary' },
  { id: 'sortie', label: 'Sortie', icon: 'mdi-drama-masks', color: 'deep-orange' },
  { id: 'stage', label: 'Stage', icon: 'mdi-school-outline', color: 'purple' },
  { id: 'cours', label: 'Cours', icon: 'mdi-human-male-female', color: 'teal' },
  { id: 'autre', label: 'Autre', icon: 'mdi-calendar-star', color: 'secondary' },
]

const EVENT_TYPE_IDS = new Set(EVENT_TYPES.map((entry) => entry.id))

export function eventTypeMeta(type) {
  return EVENT_TYPES.find((entry) => entry.id === type) || EVENT_TYPES.at(-1)
}

export function eventTypeLabel(type) {
  return eventTypeMeta(type).label
}

function trim(value) {
  return String(value ?? '').trim()
}

function normalizeIsoDate(value) {
  const raw = trim(value)
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toISOString()
}

export function normalizeEvent(input = {}, { id } = {}) {
  const nextId = trim(id || input.id)
  if (!nextId) throw new Error('Identifiant d’événement requis')

  const type = EVENT_TYPE_IDS.has(input.type) ? input.type : 'autre'
  const titre = trim(input.titre)
  if (!titre) throw new Error('Le titre est requis')

  const debut = normalizeIsoDate(input.debut)
  if (!debut) throw new Error('La date de début est requise')

  const fin = normalizeIsoDate(input.fin)
  const cible = Array.isArray(input.cible)
    ? [...new Set(input.cible.map((value) => trim(value)).filter(Boolean))]
    : []

  return {
    id: nextId,
    source: trim(input.source) || 'local',
    googleUid: trim(input.googleUid),
    type,
    titre,
    debut,
    fin: fin || debut,
    lieu: trim(input.lieu),
    description: trim(input.description),
    publie: input.publie !== false,
    cible,
    groupes: Array.isArray(input.groupes)
      ? [...new Set(input.groupes.map((value) => trim(value)).filter(Boolean))]
      : [],
    createdAt: normalizeIsoDate(input.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function sortEvents(events = [], { ascending = true } = {}) {
  const factor = ascending ? 1 : -1
  return [...events].sort((a, b) => factor * (a.debut || '').localeCompare(b.debut || ''))
}

export function filterPublishedEvents(events = []) {
  return events.filter((event) => event.publie !== false)
}

export function upcomingEvents(events = [], now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  return sortEvents(filterPublishedEvents(events).filter((event) => (event.debut || '').slice(0, 10) >= today))
}

export function pastEvents(events = [], now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  return sortEvents(
    filterPublishedEvents(events).filter((event) => (event.debut || '').slice(0, 10) < today),
    { ascending: false },
  )
}
