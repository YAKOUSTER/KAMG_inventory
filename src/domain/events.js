import { todayLocal } from './dates.js'
import {
  applyEventTitlePrefix,
  inferEventKinds,
  normalizeEventKinds,
  primaryTypeFromKinds,
  groupesFromKinds,
  eventKindsOf,
  eventIsSortie,
  eventIsHorsCercle,
  eventKindMeta,
  eventKindLabel,
} from './eventKinds.js'
import { emptySortie, normalizeSortie } from './sortie.js'

export {
  EVENT_KINDS,
  eventKindLabel,
  eventKindsOf,
  eventIsSortie,
  eventIsFestNoz,
  eventIsHorsCercle,
  eventMatchesKindFilter,
  eventTitlePrefix,
  eventTitleRest,
  applyEventTitlePrefix,
} from './eventKinds.js'

export const EVENT_TYPES = [
  { id: 'repetition', label: 'Répétition', icon: 'mdi-calendar-clock', color: 'primary' },
  { id: 'sortie', label: 'Sortie', icon: 'mdi-drama-masks', color: 'deep-orange' },
  { id: 'concours', label: 'Concours', icon: 'mdi-trophy-outline', color: 'amber' },
  { id: 'stage', label: 'Stage', icon: 'mdi-school-outline', color: 'purple' },
  { id: 'atelier', label: 'Atelier', icon: 'mdi-scissors-cutting', color: 'brown' },
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

  const explicitKinds = Array.isArray(input.kinds) ? normalizeEventKinds(input.kinds) : []
  const inferred = explicitKinds.length
    ? explicitKinds
    : inferEventKinds(input.titre, input.description, input.type)
  const type = inferred.length
    ? primaryTypeFromKinds(inferred, EVENT_TYPE_IDS.has(input.type) ? input.type : 'autre')
    : EVENT_TYPE_IDS.has(input.type)
      ? input.type
      : 'autre'

  const rawTitre = trim(input.titre)
  const titre = explicitKinds.length ? applyEventTitlePrefix(rawTitre, explicitKinds) : rawTitre
  if (!titre) throw new Error('Le titre est requis')

  const debut = normalizeIsoDate(input.debut)
  if (!debut) throw new Error('La date de début est requise')

  const fin = normalizeIsoDate(input.fin)
  const cible = Array.isArray(input.cible)
    ? [...new Set(input.cible.map((value) => trim(value)).filter(Boolean))]
    : []

  const derivedGroupes = groupesFromKinds(explicitKinds)
  const explicitGroupes = Array.isArray(input.groupes)
    ? [...new Set(input.groupes.map((value) => trim(value)).filter(Boolean))]
    : null
  const groupes = explicitGroupes != null ? explicitGroupes : derivedGroupes

  const isSortie = explicitKinds.includes('sortie') || explicitKinds.includes('fest_noz') || type === 'sortie'
  const inferredLibre =
    explicitKinds.includes('fest_noz') || /fest-?noz/i.test(`${titre} ${trim(input.description)}`)
  const horsCercle = input.horsCercle == null ? inferredLibre : Boolean(input.horsCercle)
  const inscriptionsOuvertes =
    input.inscriptionsOuvertes == null
      ? (isSortie || type === 'concours' || explicitKinds.includes('concours')) && !horsCercle
      : Boolean(input.inscriptionsOuvertes)

  return {
    id: nextId,
    source: trim(input.source) || 'local',
    googleUid: trim(input.googleUid),
    type,
    kinds: explicitKinds,
    titre,
    debut,
    fin: fin || debut,
    lieu: trim(input.lieu),
    description: trim(input.description),
    publie: input.publie !== false,
    inscriptionsOuvertes,
    cible,
    groupes,
    horsCercle,
    sortie: isSortie ? normalizeSortie(input.sortie) : null,
    createdAt: normalizeIsoDate(input.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function eventAcceptsInscriptions(event) {
  if (!event) return false
  if (event.inscriptionsOuvertes != null) return Boolean(event.inscriptionsOuvertes)
  return eventIsSortie(event) || eventKindsOf(event).includes('concours') || event?.type === 'concours'
}

export function applyEventOverlay(event, overlay) {
  if (!event) return event
  if (!overlay || typeof overlay !== 'object') {
    return {
      ...event,
      inscriptionsOuvertes: eventAcceptsInscriptions(event),
    }
  }

  const kinds = Array.isArray(overlay.kinds) ? normalizeEventKinds(overlay.kinds) : event.kinds || []
  const rawTitre = overlay.titre == null ? event.titre : trim(overlay.titre)
  const titre = Array.isArray(overlay.kinds) && kinds.length ? applyEventTitlePrefix(rawTitre, kinds) : rawTitre
  const type = kinds.length
    ? primaryTypeFromKinds(kinds, event.type)
    : EVENT_TYPE_IDS.has(overlay.type)
      ? overlay.type
      : event.type
  const description = overlay.description == null ? event.description : trim(overlay.description)
  const lieu = overlay.lieu == null ? event.lieu : trim(overlay.lieu)
  const publie = overlay.publie == null ? event.publie !== false : overlay.publie !== false
  const inscriptionsOuvertes =
    overlay.inscriptionsOuvertes == null
      ? eventAcceptsInscriptions({ ...event, type, kinds })
      : Boolean(overlay.inscriptionsOuvertes)
  const isSortie = kinds.includes('sortie') || kinds.includes('fest_noz') || type === 'sortie'
  const inferredLibre = kinds.includes('fest_noz') || /fest-?noz/i.test(`${titre} ${description}`)
  const horsCercle =
    overlay.horsCercle == null ? (event.horsCercle == null ? inferredLibre : Boolean(event.horsCercle)) : Boolean(overlay.horsCercle)
  const sortie = overlay.sortie
    ? normalizeSortie(overlay.sortie)
    : isSortie
      ? event.sortie || emptySortie()
      : event.sortie || null
  const groupes = Array.isArray(overlay.groupes)
    ? [...new Set(overlay.groupes.map((value) => trim(value)).filter(Boolean))]
    : event.groupes

  return {
    ...event,
    type,
    kinds,
    titre,
    lieu,
    description,
    publie,
    inscriptionsOuvertes,
    horsCercle,
    groupes,
    sortie,
  }
}

export function eventDisplayChips(event) {
  const kinds = eventKindsOf(event)
  if (kinds.length) {
    return kinds.map((id) => {
      const kind = eventKindMeta(id)
      return {
        id,
        label: eventKindLabel(id),
        color: kind?.color || eventTypeMeta(kind?.family).color,
      }
    })
  }
  const type = eventTypeMeta(event?.type)
  return [{ id: type.id, label: type.label, color: type.color }]
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
    kinds: eventKindsOf(event),
    horsCercle: eventIsHorsCercle(event),
    sortie: event.sortie || null,
  }
}
