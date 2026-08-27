import { coverSrc, normalizeImages } from './images.js'
import { displayDate, formatDate } from './dates.js'
import {
  membershipSeasons,
  newSeasonId,
  normalizeSeasons,
  isFirstYearOfSeason,
  parseSeasonId,
} from './seasons.js'
import { normalizeOrgTags, personOrgTagLabels } from './orgChart.js'

export { displayDate, formatDate, membershipSeasons }

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
  { id: 'couture', label: 'Groupe Vêtement', aliases: ['Couture'] },
  { id: 'invite', label: 'Invité' },
]

export const COHORT_ROLES = [
  'membre',
  'danseur_enfant',
  'danseur_ado',
  'danseur_tremplin',
  'danseur_concours',
  'danseur_loisir',
]

export const PROMOTION_ROLE_ORDER = [
  'danseur_concours',
  'danseur_ado',
  'danseur_enfant',
  'danseur_tremplin',
  'danseur_loisir',
  'membre',
  'couture',
  'invite',
]

export const DANCER_CATEGORY_ROLES = [
  'danseur_enfant',
  'danseur_ado',
  'danseur_tremplin',
  'danseur_concours',
  'danseur_loisir',
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
    nomUsage: '',
    roles: [],
    tags: [],
    anneeMembre: '',
    saisons: [],
    nouveau: null,
    telephone: '',
    email: '',
    notes: '',
    noteAtelier: '',
    bio: '',
    tailleLettre: '',
    images: [],
    mesures: emptyMesures(),
    createdAt: '',
    updatedAt: '',
  }
}

export function memberSelfProfile(person) {
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
    roles: normalizeRoles(person),
    tags: normalizeOrgTags(person),
    saisons: personSeasons(person),
    nouveau: isNewMember(person),
    photo: coverSrc(person) || '',
    images: person.images || [],
    mesures: { ...emptyMesures(), ...(person.mesures || {}) },
    tailleLettre: String(person.tailleLettre || '').trim(),
    noteAtelier: String(person.noteAtelier || '').trim(),
    bio: String(person.bio || '').trim(),
  }
}

export const PERSON_BIO_MAX = 400

export function filledMeasurements(person) {
  const mesures = person?.mesures || {}
  return PERSON_MEASUREMENTS.filter((field) => {
    const value = mesures[field.key]
    return value != null && value !== ''
  }).map((field) => ({ ...field, value: mesures[field.key] }))
}

export function personDisplayName(person) {
  if (!person) return ''
  const prenom = String(person.prenom || '').trim()
  const nom = String(person.nomUsage || person.nom || '').trim()
  return [prenom, nom].filter(Boolean).join(' ')
}

export function personLegalName(person) {
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
  const match = PERSON_ROLES.find((role) => {
    const needle = legacy.toLowerCase()
    if (role.id === legacy || role.label.toLowerCase() === needle) return true
    return (role.aliases || []).some((alias) => String(alias).toLowerCase() === needle)
  })
  return match ? [match.id] : []
}

export function personRoleLabels(person) {
  const season = personYear(person)
  const labels = normalizeRoles(person).map((id) => {
    const label = roleLabel(id)
    if (season && (id === 'membre' || COHORT_ROLES.includes(id))) return `${label} ${season}`
    return label
  })
  if (isNewMember(person)) labels.push('NEW')
  return labels
}

export function personSeasons(person) {
  return normalizeSeasons(person?.saisons, person?.anneeMembre)
}

export function personYear(person) {
  const seasons = personSeasons(person)
  return seasons.at(-1) || ''
}

export function canHaveSeasons(person) {
  return hasCohortRole(person)
}

export function isNewMember(person, now = new Date()) {
  if (!canHaveSeasons(person)) return false
  if (person?.nouveau === true) return true
  if (person?.nouveau === false) return false
  return isFirstYearOfSeason(personSeasons(person), newSeasonId(now))
}

export function hasCohortRole(person) {
  return normalizeRoles(person).some((id) => COHORT_ROLES.includes(id))
}

export function primaryPromotionRole(person) {
  const roles = normalizeRoles(person)
  return PROMOTION_ROLE_ORDER.find((id) => roles.includes(id)) || 'autre'
}

export function foldText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesSearch(haystack, query) {
  const foldedQuery = foldText(query)
  if (!foldedQuery) return true
  const foldedHaystack = foldText(haystack)
  return foldedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => foldedHaystack.includes(token))
}

export function personSearchText(person) {
  return [
    person?.prenom,
    person?.nom,
    person?.nomUsage,
    personDisplayName(person),
    personRolesLabel(person),
    personOrgTagLabels(person).join(' '),
    person?.email,
    person?.telephone,
    personYear(person),
    ...(personSeasons(person) || []),
    isNewMember(person) ? 'NEW' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function availablePersonYears(people = [], now = new Date()) {
  const years = new Set(membershipSeasons(now))
  for (const person of people) {
    for (const season of personSeasons(person)) years.add(season)
  }
  return [...years].sort((a, b) => String(b).localeCompare(String(a)))
}

export function filterPeople(people = [], filters = {}) {
  const q = (filters.search || '').trim()
  return people.filter((person) => {
    if (q && !matchesSearch(personSearchText(person), q)) return false
    if (filters.annee && filters.annee !== 'Toutes') {
      if (filters.annee === 'NEW') {
        if (!isNewMember(person)) return false
      } else {
        const wanted = parseSeasonId(filters.annee) || filters.annee
        const seasons = personSeasons(person)
        if (!seasons.includes(wanted) && personYear(person) !== filters.annee && personYear(person) !== wanted) {
          return false
        }
      }
    }
    if (filters.role && filters.role !== 'Tous') {
      if (!normalizeRoles(person).includes(filters.role)) return false
    }
    if (filters.tag && filters.tag !== 'Tous') {
      if (!normalizeOrgTags(person).includes(filters.tag)) return false
    }
    return true
  })
}

export function sortPeople(people = [], sortBy = 'nom') {
  const list = [...people]
  if (sortBy === 'annee') {
    return list.sort((a, b) => {
      const yearCmp = String(personYear(b)).localeCompare(String(personYear(a)))
      if (yearCmp) return yearCmp
      return personDisplayName(a).localeCompare(personDisplayName(b), 'fr')
    })
  }
  if (sortBy === 'groupe') {
    return list.sort((a, b) => {
      const roleA = PROMOTION_ROLE_ORDER.indexOf(primaryPromotionRole(a))
      const roleB = PROMOTION_ROLE_ORDER.indexOf(primaryPromotionRole(b))
      const safeA = roleA >= 0 ? roleA : PROMOTION_ROLE_ORDER.length
      const safeB = roleB >= 0 ? roleB : PROMOTION_ROLE_ORDER.length
      if (safeA !== safeB) return safeA - safeB
      return personDisplayName(a).localeCompare(personDisplayName(b), 'fr')
    })
  }
  return list.sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), 'fr'))
}

export function groupPeopleByPromotion(people = [], { annee } = {}) {
  const filtered =
    annee && annee !== 'Toutes'
      ? annee === 'NEW'
        ? people.filter((person) => isNewMember(person))
        : people.filter((p) => {
            const wanted = parseSeasonId(annee) || annee
            return personSeasons(p).includes(wanted) || personYear(p) === annee || personYear(p) === wanted
          })
      : people

  if (annee && annee !== 'Toutes') {
    const byRole = new Map()
    for (const person of filtered) {
      const role = primaryPromotionRole(person)
      if (!byRole.has(role)) byRole.set(role, [])
      byRole.get(role).push(person)
    }
    return [
      {
        year: annee,
        groups: PROMOTION_ROLE_ORDER.filter((role) => byRole.has(role)).map((role) => ({
          role,
          label: roleLabel(role),
          people: sortPeople(byRole.get(role) || []),
        })),
      },
    ]
  }

  const byYear = new Map()
  for (const person of filtered) {
    const year = personYear(person) || 'Sans année'
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year).push(person)
  }

  return [...byYear.entries()]
    .sort((a, b) => {
      if (a[0] === 'Sans année') return 1
      if (b[0] === 'Sans année') return -1
      return String(b[0]).localeCompare(String(a[0]))
    })
    .map(([year, yearPeople]) => {
      const byRole = new Map()
      for (const person of yearPeople) {
        const role = primaryPromotionRole(person)
        if (!byRole.has(role)) byRole.set(role, [])
        byRole.get(role).push(person)
      }
      return {
        year,
        groups: PROMOTION_ROLE_ORDER.filter((role) => byRole.has(role)).map((role) => ({
          role,
          label: roleLabel(role),
          people: sortPeople(byRole.get(role) || []),
        })),
      }
    })
}

export function personRolesLabel(person) {
  return personRoleLabels(person).join(' · ')
}

export function membershipYears(now = new Date()) {
  return membershipSeasons(now)
}

export function dancerCategory(person) {
  const roles = normalizeRoles(person)
  return (
    DANCER_CATEGORY_ROLES.find((id) => roles.includes(id)) ||
    (roles.includes('membre') ? 'membre' : null)
  )
}

export function newMembersByCategory(people = [], now = new Date()) {
  const grouped = new Map()
  for (const person of people) {
    if (!isNewMember(person, now)) continue
    const category = dancerCategory(person)
    if (!category) continue
    if (!grouped.has(category)) grouped.set(category, [])
    grouped.get(category).push(person)
  }
  return DANCER_CATEGORY_ROLES.concat('membre')
    .filter((role) => grouped.has(role))
    .map((role) => ({
      role,
      label: roleLabel(role),
      people: sortPeople(grouped.get(role) || []),
    }))
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
  person.nom = String(person.nom).trim().toLocaleUpperCase('fr')
  person.prenom = String(person.prenom).trim()
  person.nomUsage = String(person.nomUsage || '').trim().toLocaleUpperCase('fr')
  person.roles = normalizeRoles(person)
  person.tags = normalizeOrgTags(person)
  const cohort = hasCohortRole(person)
  person.saisons = cohort ? normalizeSeasons(person.saisons, person.anneeMembre) : []
  person.anneeMembre = person.saisons.at(-1) || ''
  if (!cohort) person.nouveau = false
  else if (person.nouveau === true || person.nouveau === false) person.nouveau = Boolean(person.nouveau)
  else person.nouveau = isFirstYearOfSeason(person.saisons, newSeasonId())
  delete person.role
  person.images = normalizeImages(person.images)
  person.email = String(person.email || '').trim()
  person.noteAtelier = String(person.noteAtelier || '').trim().slice(0, 1000)
  person.bio = String(person.bio || '').trim().slice(0, PERSON_BIO_MAX)
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
