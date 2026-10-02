import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import webpush from 'web-push'
import {
  ensureDb,
  login,
  registerMember,
  listPendingMembers,
  readDb,
  writeDb,
  getBootstrap,
  resetStoreCache,
} from './store.js'

async function tmpOptions() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'kamg-pending-notify-'))
  const seedPath = path.join(dir, 'seed.json')
  const dbPath = path.join(dir, 'db.json')
  await writeFile(
    seedPath,
    JSON.stringify({ meta: { version: 1 }, referentiels: {}, items: [], people: [], loans: [] }),
  )
  await mkdir(path.join(dir, 'uploads'), { recursive: true })
  await ensureDb({ seedPath, dbPath })
  return { seedPath, dbPath, uploadsDir: path.join(dir, 'uploads') }
}

describe('inscription à ranger et notification', () => {
  let options
  let previousPublic
  let previousPrivate
  let previousSubject

  beforeEach(async () => {
    resetStoreCache()
    options = await tmpOptions()
    previousPublic = process.env.KAMG_VAPID_PUBLIC_KEY
    previousPrivate = process.env.KAMG_VAPID_PRIVATE_KEY
    previousSubject = process.env.KAMG_VAPID_SUBJECT
  })

  afterEach(() => {
    mock.restoreAll()
    if (previousPublic == null) delete process.env.KAMG_VAPID_PUBLIC_KEY
    else process.env.KAMG_VAPID_PUBLIC_KEY = previousPublic
    if (previousPrivate == null) delete process.env.KAMG_VAPID_PRIVATE_KEY
    else process.env.KAMG_VAPID_PRIVATE_KEY = previousPrivate
    if (previousSubject == null) delete process.env.KAMG_VAPID_SUBJECT
    else process.env.KAMG_VAPID_SUBJECT = previousSubject
    resetStoreCache()
  })

  it('écrit le membre à ranger sans attendre le push', async () => {
    const keys = webpush.generateVAPIDKeys()
    process.env.KAMG_VAPID_PUBLIC_KEY = keys.publicKey
    process.env.KAMG_VAPID_PRIVATE_KEY = keys.privateKey
    process.env.KAMG_VAPID_SUBJECT = 'mailto:test@cercle.test'

    const admin = await login('admin', 'admin', options)
    const db = await readDb(options)
    db.pushSubscriptions = [
      {
        id: 'sub-admin',
        userId: admin.user.id,
        endpoint: 'https://push.example/hang',
        keys: { p256dh: 'p256', auth: 'auth' },
        createdAt: new Date().toISOString(),
      },
    ]
    await writeDb(db, options)

    mock.method(webpush, 'sendNotification', () => new Promise(() => {}))

    const signup = await registerMember(
      {
        prenom: 'Cécile',
        nom: 'Goureaux',
        email: 'cecile.pending@cercle.test',
        password: 'motdepasse',
        relation: 'danseur',
      },
      options,
    )

    const pending = await listPendingMembers(options)
    assert.equal(pending.length, 1)
    assert.equal(pending[0].id, signup.user.id)
    assert.match(pending[0].nom, /Cécile/)
    const boot = await getBootstrap(admin.user, options)
    assert.equal(boot.stats.pendingMembers, 1)
  })
})
