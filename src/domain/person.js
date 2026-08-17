import { normalizeImages } from './images.js'
import { displayDate, formatDate } from './dates.js'

export { displayDate, formatDate }

export const PERSON_MEASUREMENTS = [
  { key: 'hauteur', label: 'Taille / stature (cm)' },
  { key: 'tourTete', label: 'Tour de tête (cm)' },
  { key: 'tourCou', label: 'Tour de cou (cm)' },
  { key: 'tourPoitrine', label: 'Tour de poitrine (cm)' },
  { key: 'tourTaille', label: 'Tour de taille (cm)' },
  { key: 'tourHanches', label: 'Tour de hanches (cm)' },
  { key: 'carure', label: 'Carrure, épaule à épaule (cm)' },
  { key: 'longueurDos', label: 'Longueur de dos (cm)' },
  { key: 'longueurBras', label: 'Longueur de bras (cm)' },
  { key: 'longueurJambe', label: 'Longueur de jambe (cm)' },
  { key: 'tourPoignet', label: 'Tour de poignet (cm)' },
  { key: 'pointure', label: 'Pointure' },
]

export const PERSON_ROLES = [
  { id: 'membre', label: 'Membre' },
  { id: 'danseur_enfant', label: 'Danseur enfant' },
  { id: 'danseur_ado', label: 'Danseurs ado' },
  { id: 'danseur_tremplin', label: 'Danseurs tremplin' },
  { id: 'danseur_concours', label: 'Danseur concours' },
  { id: 'danseur_loisir', label: 'Danseur loisir' },
  { id: 'couture', label: 'Couture' },
  { id: 'invite', label: 'Invité' },
]

const ROLE_IDS = new Set(PERSON_ROLES.map((role) => role.id))

export function emptyMesures() {
  return Object.fromEntries(PERSON_MEASUREMENTS.map((field) => [field.key, null]))
}

export function emptyPerson() {
  return {
    id: '',
    nom: '',
    prenom: '',
    roles: [],
    anneeMembre: '',
    telephone: '',
    email: '',
    notes: '',
    tailleLettre: '',
    images: [],
    mesures: emptyMesures(),
    createdAt: '',
    updatedAt: '',
  }
}

export function personDisplayName(person) {
  if (!person) return ''
  return [person.prenom, person.nom].map((part) => String(part || '').trim()).filter(Boolean).join(' ')
}

export function roleLabel(id) {
  return PERSON_ROLES.find((role) => role.id === id)?.label || id
}

export function normalizeRoles(input = {}) {
  const fromArray = Array.isArray(input.roles) ? input.roles : []
  const known = fromArray.map((value) => String(value || '').trim()).filter((id) => ROLE_IDS.has(id))
  if (known.length) return [...new Set(known)]
  const legacy = String(input.role || '').trim()
  if (!legacy) return []
  const match = PERSON_ROLES.find(
    (role) => role.id === legacy || role.label.toLowerCase() === legacy.toLowerCase(),
  )
  return match ? [match.id] : []
}

export function personRoleLabels(person) {
  return normalizeRoles(person).map((id) => {
    const label = roleLabel(id)
    if (id === 'membre' && person?.anneeMembre) return `${label} ${person.anneeMembre}`
    return label
  })
}

export function personRolesLabel(person) {
  return personRoleLabels(person).join(' · ')
}

export function membershipYears(now = new Date()) {
  const current = now.getFullYear()
  const years = []
  for (let year = current + 1; year >= current - 25; year -= 1) years.push(String(year))
  return years
}

export function normalizePerson(input = {}, { id, now } = {}) {
  const base = emptyPerson()
  const person = {
    ...base,
    ...input,
    mesures: { ...emptyMesures(), ...(input.mesures || {}) },
  }
  if (id) person.id = id
  if (!person.id) throw new Error('id requis')
  if (!person.nom?.trim()) throw new Error('Le nom est requis')
  if (!person.prenom?.trim()) throw new Error('Le prénom est requis')
  person.nom = String(person.nom).trim()
  person.prenom = String(person.prenom).trim()
  person.roles = normalizeRoles(person)
  person.anneeMembre = person.roles.includes('membre') ? String(person.anneeMembre || '').trim() : ''
  delete person.role
  person.images = normalizeImages(person.images)
  const stamp = now || new Date().toISOString()
  person.createdAt = person.createdAt || stamp
  person.updatedAt = stamp
  return person
}

export function groupLoansByYear(loans = []) {
  const groups = new Map()
  for (const loan of loans) {
    const year = formatDate(loan.dateEmprunt).slice(0, 4) || 'Sans date'
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year).push(loan)
  }
  return [...groups.entries()]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .map(([year, yearLoans]) => ({ year, loans: yearLoans }))
}
