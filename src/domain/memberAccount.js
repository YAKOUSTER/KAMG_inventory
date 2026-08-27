import { can, resolveUserAccess } from './auth.js'
import { isActiveMember } from './person.js'

export const USER_STATUSES = [
  { id: 'pending', label: 'En attente de rangement' },
  { id: 'active', label: 'Actif' },
  { id: 'disabled', label: 'Refusé / désactivé' },
]

export const SIGNUP_RELATIONS = [
  { id: 'danseur', label: 'Je danse' },
  { id: 'parent', label: 'Je suis parent' },
]

const STATUS_IDS = new Set(USER_STATUSES.map((entry) => entry.id))
const RELATION_IDS = new Set(SIGNUP_RELATIONS.map((entry) => entry.id))

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function isValidEmail(value) {
  const email = normalizeEmail(value)
  return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePassword(value) {
  const password = String(value || '')
  if (password.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères')
  if (password.length > 200) throw new Error('Mot de passe trop long')
  return password
}

export function normalizePersonIds(ids = []) {
  return [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || '').trim()).filter(Boolean))]
}

export function normalizeSignup(input = {}) {
  const prenom = String(input.prenom || '').trim()
  const nom = String(input.nom || '').trim()
  if (!prenom) throw new Error('Le prénom est requis')
  if (!nom) throw new Error('Le nom est requis')
  const relation = RELATION_IDS.has(input.relation) ? input.relation : 'danseur'
  const childrenNames = String(input.childrenNames || '').trim()
  if (relation === 'parent' && !childrenNames) {
    throw new Error('Indiquez le prénom de l’enfant (ou des enfants)')
  }
  return {
    prenom,
    nom,
    telephone: String(input.telephone || '').trim(),
    relation,
    childrenNames,
    message: String(input.message || '').trim().slice(0, 500),
  }
}

export function displayNameFromSignup(signup, fallback = '') {
  const name = [signup?.prenom, signup?.nom].filter(Boolean).join(' ').trim()
  return name || fallback
}

export function isPendingPlacement(user) {
  return user?.status === 'pending'
}

export function isDisabledUser(user) {
  return user?.status === 'disabled'
}

export function canUseMemberSpace(user) {
  return Boolean(user) && !isDisabledUser(user)
}

export const DUES_OVERDUE_MESSAGE =
  'Votre cotisation n’est plus à jour. Merci de reprendre une adhésion pour accéder aux groupes du cercle ainsi qu’à l’application'

export function isStaffAccount(user) {
  return user?.role === 'admin' || user?.role === 'gestion' || user?.role === 'lecteur'
}

export function accountDuesOverdue(user, people = [], now = new Date()) {
  if (!user || isDisabledUser(user) || isPendingPlacement(user) || isStaffAccount(user)) return false
  const ids = normalizePersonIds(user.personIds)
  if (!ids.length) return true
  return !ids.some((id) => {
    const person = people.find((entry) => entry.id === id)
    return person && isActiveMember(person, now)
  })
}

export function homePath(user) {
  if (!canUseMemberSpace(user)) return '/connexion'
  if (user.duesOverdue) return '/espace-membre'
  if (can(user, 'items.read')) return '/'
  return '/espace-membre'
}

export function canVisitAppRoute(user, meta = {}) {
  if (meta.public) return true
  if (!canUseMemberSpace(user)) return false
  if (user.duesOverdue) return Boolean(meta.member)
  if (meta.member) return true
  if (Array.isArray(meta.permissionAny) && meta.permissionAny.length) {
    return meta.permissionAny.some((permission) => can(user, permission))
  }
  if (meta.permission) return can(user, meta.permission)
  return true
}

export function canRsvpAsPerson(user, personId) {
  if (!user || isDisabledUser(user) || isPendingPlacement(user) || user.duesOverdue) return false
  const id = String(personId || '').trim()
  if (!id) return false
  return normalizePersonIds(user.personIds).includes(id)
}

export function normalizeAccountRecord(user = {}) {
  const login = String(user.login || user.email || '').trim().toLowerCase()
  const email = normalizeEmail(user.email || (login.includes('@') ? login : ''))
  const status = STATUS_IDS.has(user.status) ? user.status : 'active'
  const access = resolveUserAccess(user)
  return {
    ...user,
    login: login || email,
    email,
    status,
    role: access.role,
    custom: access.custom,
    permissions: access.permissions,
    personIds: normalizePersonIds(user.personIds),
    signup: user.signup && typeof user.signup === 'object' ? user.signup : null,
  }
}

export const PASSWORD_RESET_MESSAGE =
  'Si un compte est associé à cette adresse, un lien a été envoyé. Il expire dans une heure.'

export function passwordResetUrl(origin, token) {
  const base = String(origin || '').replace(/\/$/, '')
  const path = `/nouveau-mot-de-passe?token=${encodeURIComponent(token)}`
  return base ? `${base}${path}` : path
}

export function findUserByIdentifiant(users = [], identifiant) {
  const ident = String(identifiant || '').trim().toLowerCase()
  if (!ident) return null
  return (
    users.find((user) => String(user.login || '').toLowerCase() === ident) ||
    users.find((user) => String(user.email || '').toLowerCase() === ident) ||
    null
  )
}
