import { normalizeImages } from './images.js'

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

export function emptyMesures() {
  return Object.fromEntries(PERSON_MEASUREMENTS.map((field) => [field.key, null]))
}

export function emptyPerson() {
  return {
    id: '',
    nom: '',
    role: 'Membre',
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
  person.nom = String(person.nom).trim()
  person.images = normalizeImages(person.images)
  const stamp = now || new Date().toISOString()
  person.createdAt = person.createdAt || stamp
  person.updatedAt = stamp
  return person
}

export function formatDate(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function displayDate(value) {
  const iso = formatDate(value)
  if (!iso || iso.length < 10) return iso
  const [year, month, day] = iso.split('-')
  if (!day) return iso
  return `${day}/${month}/${year}`
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
