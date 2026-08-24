import { todayLocal } from './dates.js'

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

  const inscriptionsOuvertes =
    input.inscriptionsOuvertes == null ? type === 'sortie' : Boolean(input.inscriptionsOuvertes)

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
    inscriptionsOuvertes,
    cible,
    groupes: Array.isArray(input.groupes)
      ? [...new Set(input.groupes.map((value) => trim(value)).filter(Boolean))]
      : [],
    createdAt: normalizeIsoDate(input.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function eventAcceptsInscriptions(event) {
  if (!event) return false
  if (event.inscriptionsOuvertes != null) return Boolean(event.inscriptionsOuvertes)
  return event.type === 'sortie'
}

export function applyEventOverlay(event, overlay) {
  if (!event) return event
  if (!overlay || typeof overlay !== 'object') {
    return {
      ...event,
      inscriptionsOuvertes: eventAcceptsInscriptions(event),
    }
  }

  const titre = trim(overlay.titre) || event.titre
  const type = EVENT_TYPE_IDS.has(overlay.type) ? overlay.type : event.type
  const description = overlay.description == null ? event.description : trim(overlay.description)
  const lieu = overlay.lieu == null ? event.lieu : trim(overlay.lieu)
  const publie = overlay.publie == null ? event.publie !== false : overlay.publie !== false
  const inscriptionsOuvertes =
    overlay.inscriptionsOuvertes == null
      ? eventAcceptsInscriptions({ ...event, type })
      : Boolean(overlay.inscriptionsOuvertes)

  return {
    ...event,
    type,
    titre,
    lieu,
    description,
    publie,
    inscriptionsOuvertes,
  }
}

export function sortEvents(events = [], { ascending = true } = {}) {
  const factor = ascending ? 1 : -1
  return [...events].sort((a, b) => factor * (a.debut || '').localeCompare(b.debut || ''))
}

export function filterPublishedEvents(events = []) {
  return events.filter((event) => event.publie !== false)
}

export function eventLocalDay(event) {
  if (!event?.debut) return ''
  const date = new Date(event.debut)
  if (Number.isNaN(date.getTime())) return String(event.debut).slice(0, 10)
  return todayLocal(date)
}

export function upcomingEvents(events = [], now = new Date()) {
  const today = todayLocal(now)
  return sortEvents(
    filterPublishedEvents(events).filter((event) => {
      const day = eventLocalDay(event)
      return day && day >= today
    }),
  )
}

export function pastEvents(events = [], now = new Date()) {
  const today = todayLocal(now)
  return sortEvents(
    filterPublishedEvents(events).filter((event) => {
      const day = eventLocalDay(event)
      return day && day < today
    }),
    { ascending: false },
  )
}

export function publicEventSummary(event, { includeDescription = false } = {}) {
  if (!event?.id) return null
  const description = includeDescription ? String(event.description || '').slice(0, 400) : ''
  return {
    id: event.id,
    type: event.type,
    titre: event.titre,
    debut: event.debut,
    fin: event.fin || event.debut,
    lieu: event.lieu || '',
    description,
    inscriptionsOuvertes: eventAcceptsInscriptions(event),
    groupes: Array.isArray(event.groupes) ? event.groupes : [],
  }
}
