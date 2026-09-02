import { personDisplayName, personSeasons, isNewMember } from './person.js'
import { coverSrc } from './images.js'

export const PRESENCE_PERSON_STORAGE_KEY = 'kamg-presence-person-id'

export const PRESENCE_STATUTS = [
  { id: 'present', label: 'Présent', actionLabel: 'Je viens', short: '1', color: 'success', icon: 'mdi-check' },
  { id: 'absent', label: 'Absent', actionLabel: 'Absent', short: '0', color: 'error', icon: 'mdi-close' },
  { id: 'maybe', label: 'Peut-être', actionLabel: 'Peut-être', short: '?', color: 'warning', icon: 'mdi-help' },
]

const PRESENCE_IDS = new Set(PRESENCE_STATUTS.map((entry) => entry.id))

export const PRESENCE_GROUP_FILTERS = [
  { id: 'tous', label: 'Tous' },
  { id: 'danseur_enfant', label: 'Groupe enfant' },
  { id: 'danseur_concours', label: 'Groupe concours' },
]

export function presenceStatutMeta(statut) {
  return PRESENCE_STATUTS.find((entry) => entry.id === statut) || null
}

export function nextPresenceStatut(previous, clicked, { toggleClears = true } = {}) {
  const current = String(previous || '')
  const next = String(clicked || '')
  if (!next) return ''
  if (current === next) return toggleClears ? '' : current
  return next
}

export function isClearedPresenceStatut(value) {
  if (value == null) return false
  const raw = String(value).trim().toLowerCase()
  return raw === '' || raw === 'clear' || raw === 'none' || raw === '-' || raw === 'empty'
}

export function normalizePresenceStatut(value) {
  if (isClearedPresenceStatut(value)) {
    throw new Error('Statut de présence invalide (1, 0 ou ?)')
  }
  const raw = String(value ?? '').trim().toLowerCase()
  if (PRESENCE_IDS.has(raw)) return raw
  if (raw === '1' || raw === 'oui' || raw === 'présent' || raw === 'present') return 'present'
  if (raw === '0' || raw === 'non' || raw === 'absent') return 'absent'
  if (raw === '?' || raw === 'peut-etre' || raw === 'peut-être' || raw === 'maybe') return 'maybe'
  throw new Error('Statut de présence invalide (1, 0 ou ?)')
}

export function applyPresenceUpdate(list = [], record) {
  const next = Array.isArray(list) ? [...list] : []
  if (!record?.eventId || !record?.personId) return next
  const index = next.findIndex(
    (entry) => entry.eventId === record.eventId && entry.personId === record.personId,
  )
  if (record.deleted || isClearedPresenceStatut(record.statut)) {
    if (index >= 0) next.splice(index, 1)
    return next
  }
  if (index === -1) next.push(record)
  else next[index] = record
  return next
}

export function publicPerson(person) {
  if (!person?.id) return null
  const prenom = String(person.prenom || '').trim()
  const nom = String(person.nom || '').trim()
  const nomUsage = String(person.nomUsage || '').trim()
  if (!prenom && !nom) return null
  return {
    id: person.id,
    prenom,
    nom,
    nomUsage,
    roles: Array.isArray(person.roles) ? person.roles : [],
    tags: Array.isArray(person.tags) ? person.tags : [],
    saisons: personSeasons(person),
    adhesions: Array.isArray(person.adhesions) ? person.adhesions : [],
    nouveau: isNewMember(person),
    photo: coverSrc(person) || '',
    bio: String(person.bio || '').trim(),
  }
}

export function filterPeopleForPresence(people = [], groupId = 'tous') {
  return [...people]
    .filter((person) => {
      if (!groupId || groupId === 'tous') return true
      return (person.roles || []).includes(groupId)
    })
    .sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), 'fr'))
}

export function presenceForPerson(presences = [], eventId, personId) {
  return presences.find((entry) => entry.eventId === eventId && entry.personId === personId) || null
}

export function summarizePresences(presences = [], eventId) {
  const counts = { present: 0, absent: 0, maybe: 0, total: 0 }
  for (const entry of presences) {
    if (eventId && entry.eventId !== eventId) continue
    if (!PRESENCE_IDS.has(entry.statut)) continue
    counts[entry.statut] += 1
    counts.total += 1
  }
  return counts
}

export function groupPeopleByPresence(people = [], presences = [], eventId) {
  const groups = { present: [], absent: [], maybe: [], unanswered: [] }
  for (const person of people) {
    const statut = presenceForPerson(presences, eventId, person.id)?.statut
    if (statut && groups[statut]) groups[statut].push(person)
    else groups.unanswered.push(person)
  }
  return groups
}

export function readStoredPresencePersonId(people = []) {
  if (typeof sessionStorage === 'undefined') return ''
  try {
    const stored = sessionStorage.getItem(PRESENCE_PERSON_STORAGE_KEY)
    if (stored && people.some((person) => person.id === stored)) return stored
  } catch {
    /* ignore */
  }
  return ''
}

export function storePresencePersonId(personId) {
  if (typeof sessionStorage === 'undefined') return
  try {
    if (personId) sessionStorage.setItem(PRESENCE_PERSON_STORAGE_KEY, personId)
    else sessionStorage.removeItem(PRESENCE_PERSON_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function normalizePresenceRecord(input = {}) {
  const eventId = String(input.eventId || '').trim()
  const personId = String(input.personId || '').trim()
  if (!eventId) throw new Error('Événement requis')
  if (!personId) throw new Error('Personne requise')
  return {
    eventId,
    personId,
    statut: normalizePresenceStatut(input.statut),
    updatedAt: input.updatedAt || new Date().toISOString(),
  }
}
