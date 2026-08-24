import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canReceivePushNotifications, publicUser } from '../src/domain/auth.js'
import { managerSubscriptions, normalizePushSubscription } from './push.js'

describe('canReceivePushNotifications', () => {
  it('autorise admin et gestion seulement', () => {
    assert.equal(canReceivePushNotifications(publicUser({ role: 'admin' })), true)
    assert.equal(canReceivePushNotifications(publicUser({ role: 'gestion' })), true)
    assert.equal(canReceivePushNotifications(publicUser({ role: 'lecteur' })), false)
  })
})

describe('managerSubscriptions', () => {
  it('ne retient que les gestionnaires abonnés', () => {
    const db = {
      users: [
        { id: 'u1', role: 'gestion', login: 'g' },
        { id: 'u2', role: 'lecteur', login: 'l' },
      ],
      pushSubscriptions: [
        {
          id: 's1',
          userId: 'u1',
          endpoint: 'https://example.com/1',
          keys: { p256dh: 'a', auth: 'b' },
        },
        {
          id: 's2',
          userId: 'u2',
          endpoint: 'https://example.com/2',
          keys: { p256dh: 'a', auth: 'b' },
        },
      ],
    }
    assert.equal(managerSubscriptions(db).length, 1)
    assert.equal(managerSubscriptions(db)[0].userId, 'u1')
  })
})

describe('normalizePushSubscription', () => {
  it('valide endpoint et clés', () => {
    const entry = normalizePushSubscription(
      { endpoint: 'https://push.example/1', keys: { p256dh: 'abc', auth: 'def' } },
      { id: 'sub-1', userId: 'u1' },
    )
    assert.equal(entry.userId, 'u1')
    assert.equal(entry.endpoint, 'https://push.example/1')
  })
})
