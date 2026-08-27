import { coverSrc, normalizeImages } from './images.js'
import { displayDate, formatDate } from './dates.js'
import {
  currentSeasonId,
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

export const PAYMENT_METHODS = [
  { id: 'hello_asso', label: 'Hello Asso' },
  { id: 'virement', label: 'Virement bancaire' },
  { id: 'espece', label: 'Espèce' },
  { id: 'cheque', label: 'Chèque' },
  { id: 'autre', label: 'Autre' },
]

const ROLE_IDS = new Set(PERSON_ROLES.map((role) => role.id))
const PAYMENT_METHOD_IDS = new Set(PAYMENT_METHODS.map((method) => method.id))

export function paymentMethodLabel(id) {
  return PAYMENT_METHODS.find((method) => method.id === id)?.label || ''
}

export function normalizePaymentMethod(value) {
  const id = String(value || '').trim()
  return PAYMENT_METHOD_IDS.has(id) ? id : ''
}

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
    adhesions: [],
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
    adhesions: personAdhesions(person),
    nouveau: isNewMember(person),
    actif: isActiveMember(person),
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

export function personRoleLabels(person, now = new Date()) {
  const labels = [...membershipLabels(person)]
  const status = membershipStatusLabel(person, now)
  if (status) labels.push(status)
  labels.push(
    ...normalizeRoles(person)
      .filter((id) => id !== 'membre')
      .map((id) => roleLabel(id)),
  )
  if (isNewMember(person, now)) labels.push('NEW')
  return labels
}

export function personSeasons(person) {
  const fromAdhesions = Array.isArray(person?.adhesions)
    ? person.adhesions.map((row) => parseSeasonId(row?.seasonId || row)).filter(Boolean)
    : []
  if (fromAdhesions.length) return [...new Set(fromAdhesions)].sort((a, b) => a.localeCompare(b))
  return normalizeSeasons(person?.saisons, person?.anneeMembre)
}

export function personYear(person) {
  const seasons = personSeasons(person)
  return seasons.at(-1) || ''
}

export function membershipLabels(person) {
  return personSeasons(person).map((id) => `Membre ${id}`)
}

export function normalizeAdhesions(input = {}, seasonsFallback = []) {
  const map = new Map()
  const raw = input.adhesions
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (typeof row === 'string') {
        const season = parseSeasonId(row)
        if (season) map.set(season, { seasonId: season, methode: '' })
        continue
      }
      const season = parseSeasonId(row?.seasonId || row?.saison)
      if (!season) continue
      map.set(season, { seasonId: season, methode: normalizePaymentMethod(row.methode) })
    }
  } else if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      const season = parseSeasonId(key)
      if (!season) continue
      const methode =
        typeof value === 'string' ? normalizePaymentMethod(value) : normalizePaymentMethod(value?.methode)
      map.set(season, { seasonId: season, methode })
    }
  }
  for (const season of seasonsFallback) {
    const id = parseSeasonId(season)
    if (id && !map.has(id)) map.set(id, { seasonId: id, methode: '' })
  }
  return [...map.values()].sort((a, b) => a.seasonId.localeCompare(b.seasonId))
}

export function personAdhesions(person) {
  return normalizeAdhesions(person || {}, personSeasons(person))
}

export function personAdhesionMethod(person, seasonId) {
  const season = parseSeasonId(seasonId) || String(seasonId || '').trim()
  return personAdhesions(person).find((row) => row.seasonId === season)?.methode || ''
}

export function adhesionSummary(person) {
  return personAdhesions(person)
    .map((row) => {
      const method = paymentMethodLabel(row.methode)
      return method ? `Membre ${row.seasonId} (${method})` : `Membre ${row.seasonId}`
    })
    .join(', ')
}

export function setAdhesionRecord(person, seasonId, { paid, methode } = {}) {
  const season = parseSeasonId(seasonId)
  const current = personAdhesions(person)
  if (!season) return current
  const next = current.filter((row) => row.seasonId !== season)
  if (!paid) return next
  const previous = current.find((row) => row.seasonId === season)
  next.push({
    seasonId: season,
    methode: normalizePaymentMethod(methode) || previous?.methode || '',
  })
  return next.sort((a, b) => a.seasonId.localeCompare(b.seasonId))
}

export function hasPaidSeason(person, seasonId) {
  const wanted = parseSeasonId(seasonId) || String(seasonId || '').trim()
  return Boolean(wanted) && personSeasons(person).includes(wanted)
}

export function isCurrentMember(person, now = new Date()) {
  return hasPaidSeason(person, currentSeasonId(now))
}

export function isActiveMember(person, now = new Date()) {
  if (!person || !canHaveSeasons(person)) return false
  const current = currentSeasonId(now)
  if (hasPaidSeason(person, current)) return true
  const next = newSeasonId(now)
  return next !== current && hasPaidSeason(person, next)
}

export function membershipStatusLabel(person, now = new Date()) {
  if (!canHaveSeasons(person)) return ''
  return isActiveMember(person, now) ? 'Actif' : 'Inactif'
}

export function personMembershipLabel(person, now = new Date()) {
  const seasons = personSeasons(person)
  if (!seasons.length) return ''
  const current = currentSeasonId(now)
  if (seasons.includes(current)) return `Membre ${current}`
  const next = newSeasonId(now)
  if (next !== current && seasons.includes(next)) return `Membre ${next}`
  return ''
}

export function setPaidSeason(person, seasonId, paid) {
  return setAdhesionRecord(person, seasonId, { paid }).map((row) => row.seasonId)
}

export function isInviteOnly(person) {
  const roles = normalizeRoles(person)
  return roles.includes('invite') && !roles.some((id) => id !== 'invite')
}

export function canHaveSeasons(person) {
  return !isInviteOnly(person)
}

export function adhesionPeople(people = []) {
  return people.filter((person) => canHaveSeasons(person))
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

export function personIdentityKey(person) {
  return [foldText(person?.prenom), foldText(person?.nomUsage || person?.nom)].filter(Boolean).join('|')
}

export function matchingPeopleForAccount(people = [], account = {}) {
  const email = String(account.email || account.login || '')
    .trim()
    .toLowerCase()
  const prenom = foldText(account.signup?.prenom || account.prenom || '')
  const nom = foldText(account.signup?.nom || '')
  const fullName = foldText(account.nom || '')
  return (people || []).filter((person) => {
    if (!person?.id) return false
    const personEmail = String(person.email || '').trim().toLowerCase()
    if (email && email.includes('@') && personEmail === email) return true
    const personPrenom = foldText(person.prenom)
    const personNom = foldText(person.nom)
    const personUsage = foldText(person.nomUsage)
    if (prenom && nom && personPrenom === prenom && (personNom === nom || personUsage === nom)) return true
    if (fullName && foldText(personDisplayName(person)) === fullName) return true
    return false
  })
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
    membershipStatusLabel(person),
    ...personAdhesions(person).map((row) => paymentMethodLabel(row.methode)),
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

export function personRolesLabel(person, now = new Date()) {
  return personRoleLabels(person, now).join(' · ')
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
  const eligible = canHaveSeasons(person)
  if (!eligible) {
    person.adhesions = []
    person.saisons = []
    person.anneeMembre = ''
  } else {
    const seasonsSource = Object.prototype.hasOwnProperty.call(input, 'saisons') ? input.saisons : undefined
    const seasons = normalizeSeasons(seasonsSource, person.anneeMembre)
    let adhesions = normalizeAdhesions(input, seasons)
    if (Object.prototype.hasOwnProperty.call(input, 'saisons')) {
      const wanted = new Set(seasons)
      adhesions = adhesions.filter((row) => wanted.has(row.seasonId))
      for (const season of seasons) {
        if (!adhesions.some((row) => row.seasonId === season)) {
          adhesions.push({ seasonId: season, methode: '' })
        }
      }
      adhesions.sort((a, b) => a.seasonId.localeCompare(b.seasonId))
    }
    person.adhesions = adhesions
    person.saisons = adhesions.map((row) => row.seasonId)
    person.anneeMembre = person.saisons.at(-1) || ''
  }
  if (!eligible) person.nouveau = false
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
