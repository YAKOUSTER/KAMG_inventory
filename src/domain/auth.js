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

const KNOWN_PERMISSIONS = new Set(PERMISSIONS.map((permission) => permission.id))

export function normalizeAccountRole(role) {
  return Object.hasOwn(ROLE_PRESETS, String(role || '')) ? role : 'lecteur'
}

export function permissionsForRole(role) {
  return [...(ROLE_PRESETS[normalizeAccountRole(role)] || [])]
}

export function resolveUserAccess({ role, custom, permissions } = {}) {
  const nextRole = normalizeAccountRole(role)
  const preset = permissionsForRole(nextRole)
  const requested = Array.isArray(permissions)
    ? [...new Set(permissions.map(String).filter((id) => KNOWN_PERMISSIONS.has(id)))]
    : null
  if (!custom) {
    return { role: nextRole, custom: false, permissions: preset }
  }
  const nextPerms = requested ?? preset
  if (!nextPerms.length && preset.length) {
    return { role: nextRole, custom: false, permissions: preset }
  }
  if (samePermissions(nextPerms, preset)) {
    return { role: nextRole, custom: false, permissions: preset }
  }
  return { role: nextRole, custom: true, permissions: nextPerms }
}

export function effectivePermissions(user) {
  if (!user) return []
  return resolveUserAccess(user).permissions
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
  const access = resolveUserAccess(user)
  return {
    id: user.id,
    login: user.login,
    email: user.email || '',
    nom: user.nom || user.login,
    role: access.role,
    custom: access.custom,
    permissions: access.permissions,
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
