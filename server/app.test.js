import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createApiApp, resetRateLimits } from './app.js'
import { ensureDb, resetStoreCache } from './store.js'

async function setupTempData() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'patrimoine-api-'))
  const seedPath = path.join(dir, 'seed.json')
  const dbPath = path.join(dir, 'db.json')
  await writeFile(
    seedPath,
    JSON.stringify({ meta: { version: 1 }, referentiels: {}, items: [], people: [], loans: [] }),
  )
  await mkdir(path.join(dir, 'uploads'), { recursive: true })
  process.env.KAMG_DATA_DIR = dir
  resetStoreCache()
  resetRateLimits()
  await ensureDb({ seedPath, dbPath })
  return dir
}

async function request(app, method, url, { body, token } = {}) {
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const { port } = server.address()
  try {
    const response = await fetch(`http://127.0.0.1:${port}${url}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await response.text()
    let json = {}
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      json = { raw: text }
    }
    return { status: response.status, body: json, headers: response.headers }
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

describe('API HTTP', () => {
  let previousDataDir

  beforeEach(async () => {
    previousDataDir = process.env.KAMG_DATA_DIR
    await setupTempData()
  })

  afterEach(() => {
    if (previousDataDir == null) delete process.env.KAMG_DATA_DIR
    else process.env.KAMG_DATA_DIR = previousDataDir
    resetStoreCache()
    resetRateLimits()
  })

  it('expose /api/health', async () => {
    const app = createApiApp()
    const res = await request(app, 'GET', '/api/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.ok, true)
  })

  it('refuse l’accès aux pièces sans connexion', async () => {
    const app = createApiApp()
    const res = await request(app, 'GET', '/api/items')
    assert.equal(res.status, 401)
  })

  it('connecte admin et crée une pièce', async () => {
    const app = createApiApp()
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    assert.equal(login.status, 200)
    assert.ok(login.body.token)

    const code = `API-${Date.now()}`
    const created = await request(app, 'POST', '/api/items', {
      token: login.body.token,
      body: {
        code,
        nom: 'Pièce API',
        categorie: 'piece_costume',
        type: 'Jupe',
      },
    })
    assert.equal(created.status, 200)
    assert.equal(created.body.code, code)

    const invalid = await request(app, 'POST', '/api/items', {
      token: login.body.token,
      body: { code: '', nom: 'Sans code', categorie: 'piece_costume' },
    })
    assert.equal(invalid.status, 400)
  })

  it('expose l’espace membre sans connexion', async () => {
    const app = createApiApp()
    const res = await request(app, 'GET', '/api/public/espace-membre')
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.loans))
    assert.ok(res.body.events)
    assert.ok(Array.isArray(res.body.pages))
  })

  it('applique les en-têtes de sécurité', async () => {
    const app = createApiApp()
    const res = await request(app, 'GET', '/api/health')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN')
  })
})
