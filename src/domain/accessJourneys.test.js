import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { can, publicUser, ROLE_PRESETS } from './auth.js'
import { canAccessGestion, gestionHomePath, visibleGestionAreas } from './gestionNav.js'
import { canUseMemberSpace, canVisitAppRoute, homePath } from './memberAccount.js'

const ROUTES = [
  { path: '/', permission: 'items.read' },
  { path: '/inventaire', permission: 'items.read' },
  { path: '/pieces/nouvelle', permission: 'items.create' },
  { path: '/emprunts', permission: 'loans.read' },
  { path: '/panier', permission: 'loans.write' },
  { path: '/personnes', permission: 'people.read' },
  { path: '/adhesions', permission: 'people.read' },
  { path: '/a-ranger', permission: 'people.write' },
  { path: '/agenda', permissionAny: ['agenda.read', 'agenda.write', 'agenda.libre'] },
  { path: '/agenda/presences', permissionAny: ['agenda.read', 'agenda.write', 'agenda.libre'] },
  { path: '/agenda/nouveau', permissionAny: ['agenda.write', 'agenda.libre'] },
  { path: '/contenus', permission: 'content.read' },
  { path: '/utilisateurs', permission: 'users.manage' },
  { path: '/parametres', permission: 'settings.manage' },
  { path: '/journal', permission: 'audit.read' },
  { path: '/espace-membre', member: true },
]

function visitable(user) {
  return ROUTES.filter((route) => canVisitAppRoute(user, route)).map((route) => route.path)
}

describe('parcours selon les accès', () => {
  it('laisse un simple membre dans l’espace membres, sans Gestion', () => {
    const user = publicUser({ role: 'membre', status: 'active', permissions: [] })
    assert.equal(canUseMemberSpace(user), true)
    assert.equal(canAccessGestion(user), false)
    assert.equal(homePath(user), '/espace-membre')
    assert.deepEqual(visitable(user), ['/espace-membre'])
  })

  it('ouvre toute la Gestion à un Administrateur, y compris après un enregistrement incomplet', () => {
    const user = publicUser({
      role: 'admin',
      custom: true,
      permissions: [],
      status: 'active',
    })
    assert.equal(user.custom, false)
    assert.equal(can(user, 'users.manage'), true)
    assert.equal(canAccessGestion(user), true)
    assert.equal(homePath(user), '/')
    assert.equal(gestionHomePath(user), '/')
    assert.deepEqual(
      visibleGestionAreas(user).map((area) => area.id),
      ['costume', 'calendrier', 'membres', 'infos'],
    )
    for (const route of ROUTES) {
      assert.equal(canVisitAppRoute(user, route), true, route.path)
    }
  })

  it('donne au profil Gestion le costume, l’agenda, les membres et les infos, pas les comptes', () => {
    const user = publicUser({ role: 'gestion' })
    assert.equal(canAccessGestion(user), true)
    assert.equal(homePath(user), '/')
    assert.equal(can(user, 'items.create'), false)
    assert.equal(can(user, 'users.manage'), false)
    assert.equal(canVisitAppRoute(user, { permission: 'items.update' }), true)
    assert.equal(canVisitAppRoute(user, { permission: 'users.manage' }), false)
    assert.equal(canVisitAppRoute(user, { permissionAny: ['agenda.write', 'agenda.libre'] }), true)
    assert.ok(!visitable(user).includes('/utilisateurs'))
    assert.ok(visitable(user).includes('/personnes'))
    assert.ok(visitable(user).includes('/adhesions'))
    assert.ok(visitable(user).includes('/agenda/presences'))
  })

  it('limite le Lecteur à la consultation, sans À ranger ni création', () => {
    const user = publicUser({ role: 'lecteur' })
    assert.equal(canAccessGestion(user), true)
    assert.equal(canVisitAppRoute(user, { permission: 'people.read' }), true)
    assert.equal(canVisitAppRoute(user, { permission: 'people.write' }), false)
    assert.equal(canVisitAppRoute(user, { permissionAny: ['agenda.write', 'agenda.libre'] }), false)
    assert.ok(visitable(user).includes('/agenda'))
    assert.ok(visitable(user).includes('/agenda/presences'))
    assert.ok(!visitable(user).includes('/a-ranger'))
    assert.ok(!visitable(user).includes('/agenda/nouveau'))
  })

  it('ouvre seulement le calendrier à un membre autorisé aux sorties non officielles', () => {
    const user = publicUser({
      role: 'membre',
      custom: true,
      permissions: ['agenda.libre'],
    })
    assert.equal(canAccessGestion(user), true)
    assert.equal(homePath(user), '/espace-membre')
    assert.equal(gestionHomePath(user), '/agenda')
    assert.deepEqual(visitable(user), ['/agenda', '/agenda/presences', '/agenda/nouveau', '/espace-membre'])
  })

  it('refuse un compte désactivé et garde l’espace membres pour une inscription en attente', () => {
    assert.equal(canUseMemberSpace(publicUser({ role: 'membre', status: 'disabled' })), false)
    const pending = publicUser({ role: 'membre', status: 'pending', permissions: [] })
    assert.equal(canUseMemberSpace(pending), true)
    assert.equal(canAccessGestion(pending), false)
    assert.equal(homePath(pending), '/espace-membre')
    assert.equal(canVisitAppRoute(pending, { member: true }), true)
    assert.equal(canVisitAppRoute(pending, { permission: 'items.read' }), false)
  })

  it('couvre le preset de chaque profil', () => {
    assert.ok(ROLE_PRESETS.admin.includes('users.manage'))
    assert.ok(ROLE_PRESETS.gestion.includes('agenda.write'))
    assert.ok(!ROLE_PRESETS.gestion.includes('users.manage'))
    assert.deepEqual(ROLE_PRESETS.membre, [])
  })
})
