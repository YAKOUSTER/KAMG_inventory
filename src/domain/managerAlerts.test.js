import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPasswordResetNotification,
  buildPendingMemberNotification,
} from './managerAlerts.js'

describe('alertes admin', () => {
  it('prépare une notification vers À ranger pour une inscription parent', () => {
    const payload = buildPendingMemberNotification({
      nom: 'Lydie NORMANT',
      email: 'lydie@example.test',
      login: 'lydie@example.test',
      signup: { relation: 'parent', childrenNames: 'Zoé NORMANT' },
    })
    assert.equal(payload.title, 'Nouveau membre à ranger')
    assert.equal(payload.url, '/a-ranger')
    assert.equal(payload.tag, 'a-ranger')
    assert.match(payload.body, /Lydie NORMANT/)
    assert.match(payload.body, /parent/)
    assert.match(payload.body, /Zoé NORMANT/)
    assert.match(payload.body, /À ranger/)
  })

  it('prépare une notification pour un danseur sans enfant', () => {
    const payload = buildPendingMemberNotification({
      nom: 'Léa Le Gall',
      email: 'lea@example.test',
      signup: { relation: 'danseur' },
    })
    assert.match(payload.body, /danseur/)
    assert.doesNotMatch(payload.body, /Enfant/)
  })

  it('prépare l’alerte mot de passe oublié vers les comptes', () => {
    const payload = buildPasswordResetNotification({ nom: 'Anna', login: 'anna@example.test' })
    assert.equal(payload.title, 'Mot de passe oublié')
    assert.equal(payload.url, '/utilisateurs')
    assert.match(payload.body, /Anna/)
  })
})
