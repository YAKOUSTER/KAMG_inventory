export const PERMISSIONS = [
  { id: 'items.read', label: 'Consulter l’inventaire' },
  { id: 'items.create', label: 'Ajouter des pièces' },
  { id: 'items.update', label: 'Modifier les fiches' },
  { id: 'items.delete', label: 'Supprimer des pièces' },
  { id: 'loans.read', label: 'Consulter les emprunts' },
  { id: 'loans.write', label: 'Gérer les emprunts (panier, retours)' },
  { id: 'loans.manage', label: 'Modifier ou annuler un emprunt' },
  { id: 'people.read', label: 'Consulter les personnes' },
  { id: 'people.write', label: 'Modifier les personnes' },
  { id: 'agenda.read', label: 'Consulter l’agenda' },
  { id: 'agenda.write', label: 'Gérer l’agenda (répétitions, sorties…)' },
  { id: 'agenda.libre', label: 'Ajouter uniquement des sorties non officielles' },
  { id: 'content.read', label: 'Consulter les contenus membres' },
  { id: 'content.write', label: 'Gérer les contenus membres' },
  { id: 'users.manage', label: 'Gérer les comptes et les accès' },
  { id: 'settings.manage', label: 'Paramètres, import/export et listes' },
  { id: 'audit.read', label: 'Consulter le journal d’activité' },
  { id: 'audit.manage', label: 'Vider le journal d’activité' },
]

export const ROLES = [
  { id: 'admin', label: 'Administrateur' },
  { id: 'gestion', label: 'Gestion' },
  { id: 'lecteur', label: 'Lecteur' },
  { id: 'membre', label: 'Membre' },
]

export const ROLE_PRESETS = {
  admin: PERMISSIONS.map((p) => p.id),
  gestion: [
    'items.read',
    'items.update',
    'loans.read',
    'loans.write',
    'people.read',
    'people.write',
    'agenda.read',
    'agenda.write',
    'content.read',
    'content.write',
  ],
  lecteur: ['items.read', 'loans.read', 'people.read', 'agenda.read', 'content.read'],
  membre: [],
}

export function effectivePermissions(user) {
  if (!user) return []
  if (user.custom && Array.isArray(user.permissions)) return [...user.permissions]
  return [...(ROLE_PRESETS[user.role] || ROLE_PRESETS.lecteur)]
}

export function can(user, permission) {
  if (!permission) return Boolean(user)
  return effectivePermissions(user).includes(permission)
}

export function canSeeAgenda(user) {
  return can(user, 'agenda.read') || can(user, 'agenda.write') || can(user, 'agenda.libre')
}

export function canWriteLibreEvents(user) {
  return can(user, 'agenda.write') || can(user, 'agenda.libre')
}

export function isLibreAgendaUser(user) {
  return can(user, 'agenda.libre') && !can(user, 'agenda.write')
}

export function canReceivePushNotifications(user) {
  return Boolean(user && (user.role === 'admin' || user.role === 'gestion'))
}

export function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    login: user.login,
    email: user.email || '',
    nom: user.nom || user.login,
    role: user.role,
    custom: Boolean(user.custom),
    permissions: effectivePermissions(user),
    status: user.status || 'active',
    personIds: Array.isArray(user.personIds) ? [...user.personIds] : [],
    signup: user.signup && typeof user.signup === 'object' ? { ...user.signup } : null,
  }
}

export function samePermissions(a = [], b = []) {
  const left = [...a].sort()
  const right = [...b].sort()
  return left.length === right.length && left.every((id, i) => id === right[i])
}
