import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { canReceivePushNotifications, publicUser } from '../src/domain/auth.js'
import {
  managerSubscriptions,
  normalizePushSubscription,
  getVapidConfig,
  ensureVapidKeys,
  vapidFilePath,
} from './push.js'

describe('canReceivePushNotifications', () => {
  it('autorise seulement l’administrateur pour le moment', () => {
    assert.equal(canReceivePushNotifications(publicUser({ role: 'admin' })), true)
    assert.equal(canReceivePushNotifications(publicUser({ role: 'gestion' })), false)
    assert.equal(canReceivePushNotifications(publicUser({ role: 'lecteur' })), false)
  })
})

describe('managerSubscriptions', () => {
  it('ne retient que les administrateurs abonnés', () => {
    const db = {
      users: [
        { id: 'u1', role: 'admin', login: 'a' },
        { id: 'u2', role: 'gestion', login: 'g' },
        { id: 'u3', role: 'lecteur', login: 'l' },
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
        {
          id: 's3',
          userId: 'u3',
          endpoint: 'https://example.com/3',
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

describe('ensureVapidKeys', () => {
  let previousDir
  let previousPublic
  let previousPrivate

  beforeEach(async () => {
    previousDir = process.env.KAMG_DATA_DIR
    previousPublic = process.env.KAMG_VAPID_PUBLIC_KEY
    previousPrivate = process.env.KAMG_VAPID_PRIVATE_KEY
    delete process.env.KAMG_VAPID_PUBLIC_KEY
    delete process.env.KAMG_VAPID_PRIVATE_KEY
    process.env.KAMG_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'kamg-vapid-'))
  })

  afterEach(() => {
    if (previousDir == null) delete process.env.KAMG_DATA_DIR
    else process.env.KAMG_DATA_DIR = previousDir
    if (previousPublic == null) delete process.env.KAMG_VAPID_PUBLIC_KEY
    else process.env.KAMG_VAPID_PUBLIC_KEY = previousPublic
    if (previousPrivate == null) delete process.env.KAMG_VAPID_PRIVATE_KEY
    else process.env.KAMG_VAPID_PRIVATE_KEY = previousPrivate
  })

  it('crée data/vapid.env une fois et le réutilise', async () => {
    assert.equal(getVapidConfig(), null)
    const first = ensureVapidKeys()
    assert.ok(first.publicKey)
    assert.ok(first.privateKey)
    const file = await readFile(vapidFilePath(), 'utf8')
    assert.match(file, /KAMG_VAPID_PUBLIC_KEY=/)
    const second = ensureVapidKeys()
    assert.equal(second.publicKey, first.publicKey)
    assert.equal(second.privateKey, first.privateKey)
  })
})
