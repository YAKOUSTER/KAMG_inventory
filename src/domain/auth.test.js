import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ROLE_PRESETS, can, effectivePermissions, publicUser } from './auth.js'

const admin = { role: 'admin' }
const gestion = { role: 'gestion' }
const lecteur = { role: 'lecteur' }
const custom = {
  role: 'gestion',
  custom: true,
  permissions: ['items.read', 'items.create', 'loans.read'],
}

describe('permissions', () => {
  it('donne tous les droits à l’admin, pas la création au gestionnaire', () => {
    assert.equal(can(admin, 'items.create'), true)
    assert.equal(can(admin, 'users.manage'), true)
    assert.equal(can(admin, 'loans.manage'), true)
    assert.equal(can(admin, 'audit.read'), true)
    assert.equal(can(gestion, 'items.update'), true)
    assert.equal(can(gestion, 'items.create'), false)
    assert.equal(can(gestion, 'loans.write'), true)
    assert.equal(can(gestion, 'loans.manage'), false)
    assert.equal(can(gestion, 'audit.read'), false)
    assert.equal(can(lecteur, 'items.read'), true)
    assert.equal(can(lecteur, 'loans.write'), false)
    assert.equal(can(lecteur, 'items.update'), false)
  })

  it('autorise un accès personnalisé qui s’écarte du rôle', () => {
    assert.equal(can(custom, 'items.create'), true)
    assert.equal(can(custom, 'items.update'), false)
    assert.deepEqual(effectivePermissions(custom), ['items.read', 'items.create', 'loans.read'])
  })

  it('retire le mot de passe du profil public', () => {
    const shown = publicUser({
      id: 'u1',
      login: 'admin',
      nom: 'Sterenn',
      role: 'admin',
      passwordHash: 'secret',
    })
    assert.equal(shown.nom, 'Sterenn')
    assert.ok(shown.permissions.includes('users.manage'))
    assert.equal(shown.passwordHash, undefined)
  })
})

describe('presets', () => {
  it('couvre bien les trois profils demandés', () => {
    assert.ok(ROLE_PRESETS.admin.includes('items.create'))
    assert.ok(!ROLE_PRESETS.gestion.includes('items.create'))
    assert.ok(ROLE_PRESETS.gestion.includes('items.update'))
    assert.deepEqual(ROLE_PRESETS.lecteur, ['items.read', 'loans.read', 'people.read'])
  })
})
