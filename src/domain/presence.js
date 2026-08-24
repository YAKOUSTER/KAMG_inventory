import { personDisplayName } from './person.js'

export const PRESENCE_STATUTS = [
  { id: 'present', label: 'Présent', short: '1', color: 'success' },
  { id: 'absent', label: 'Absent', short: '0', color: 'error' },
  { id: 'maybe', label: 'Peut-être', short: '?', color: 'warning' },
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

export function normalizePresenceStatut(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (PRESENCE_IDS.has(raw)) return raw
  if (raw === '1' || raw === 'oui' || raw === 'présent' || raw === 'present') return 'present'
  if (raw === '0' || raw === 'non' || raw === 'absent') return 'absent'
  if (raw === '?' || raw === 'peut-etre' || raw === 'peut-être' || raw === 'maybe') return 'maybe'
  throw new Error('Statut de présence invalide (1, 0 ou ?)')
}

export function publicPerson(person) {
  if (!person?.id) return null
  const prenom = String(person.prenom || '').trim()
  const nom = String(person.nom || '').trim()
  if (!prenom && !nom) return null
  return {
    id: person.id,
    prenom,
    nom,
    roles: Array.isArray(person.roles) ? person.roles : [],
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
