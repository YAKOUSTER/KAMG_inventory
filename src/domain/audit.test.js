import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AUDIT_ACTIONS, auditActionLabel, auditEntityRoute } from './audit.js'

describe('journal d’activité', () => {
  it('étiquette les inscriptions et les demandes de mot de passe', () => {
    assert.equal(auditActionLabel('user.register'), 'Inscription à ranger')
    assert.equal(auditActionLabel('user.password-reset-request'), 'Mot de passe oublié')
    assert.ok(AUDIT_ACTIONS.some((entry) => entry.id === 'user.register'))
    assert.ok(AUDIT_ACTIONS.some((entry) => entry.id === 'user.password-reset-request'))
  })

  it('ouvre À ranger depuis une inscription, et les comptes depuis une demande de mot de passe', () => {
    assert.deepEqual(
      auditEntityRoute({ action: 'user.register', entityType: 'user', entityId: 'u1' }),
      { path: '/a-ranger' },
    )
    assert.deepEqual(
      auditEntityRoute({
        action: 'user.password-reset-request',
        entityType: 'user',
        entityId: 'u1',
      }),
      { path: '/utilisateurs' },
    )
  })
})
