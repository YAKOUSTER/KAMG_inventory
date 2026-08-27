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

async function request(app, method, url, { body, token, headers } = {}) {
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const { port } = server.address()
  try {
    const response = await fetch(`http://127.0.0.1:${port}${url}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
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

  it('refuse l’espace membre sans connexion', async () => {
    const app = createApiApp()
    const res = await request(app, 'GET', '/api/public/espace-membre')
    assert.equal(res.status, 401)
  })

  it('publie un flux ICS des événements de l’app', async () => {
    const app = createApiApp()
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    const created = await request(app, 'POST', '/api/events', {
      token: login.body.token,
      body: {
        type: 'sortie',
        titre: 'Sortie ICS',
        debut: '2026-10-01T18:00:00.000Z',
        lieu: 'Quimper',
        publie: true,
      },
    })
    assert.equal(created.status, 200)

    const ics = await request(app, 'GET', '/api/public/calendar.ics')
    assert.equal(ics.status, 200)
    assert.match(String(ics.headers.get('content-type') || ''), /text\/calendar/)
    assert.match(ics.body.raw || '', /BEGIN:VCALENDAR/)
    assert.match(ics.body.raw || '', /SUMMARY:Sortie ICS/)
    assert.match(ics.body.raw || '', /LOCATION:Quimper/)

    const draft = await request(app, 'POST', '/api/events', {
      token: login.body.token,
      body: {
        type: 'repetition',
        titre: 'Brouillon secret',
        debut: '2026-10-02T18:00:00.000Z',
        publie: false,
      },
    })
    assert.equal(draft.status, 200)
    const icsAfterDraft = await request(app, 'GET', '/api/public/calendar.ics')
    assert.doesNotMatch(icsAfterDraft.body.raw || '', /Brouillon secret/)
  })

  it('filtre le calendrier ICS par groupes et enregistre le catalogue', async () => {
    const app = createApiApp()
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    assert.equal(login.status, 200)

    const ado = await request(app, 'POST', '/api/events', {
      token: login.body.token,
      body: {
        kinds: ['repetition_ado'],
        titre: 'Ado ICS',
        debut: '2026-10-08T18:00:00.000Z',
        publie: true,
      },
    })
    assert.equal(ado.status, 200)
    const tremplin = await request(app, 'POST', '/api/events', {
      token: login.body.token,
      body: {
        kinds: ['repetition_tremplin_ado'],
        titre: 'Tremplin ICS',
        debut: '2026-10-09T18:00:00.000Z',
        publie: true,
      },
    })
    assert.equal(tremplin.status, 200)

    const adoIcs = await request(app, 'GET', '/api/public/calendar.ics?groupes=ado')
    assert.equal(adoIcs.status, 200)
    assert.match(adoIcs.body.raw || '', /Ado ICS/)
    assert.match(adoIcs.body.raw || '', /Tremplin ICS/)

    const concoursIcs = await request(app, 'GET', '/api/public/calendar.ics?groupes=concours')
    assert.doesNotMatch(concoursIcs.body.raw || '', /Ado ICS/)
    assert.doesNotMatch(concoursIcs.body.raw || '', /Tremplin ICS/)

    const catalog = await request(app, 'PUT', '/api/settings/event-catalog', {
      token: login.body.token,
      body: {
        kinds: [{ id: 'sortie', label: 'Sortie du cercle' }],
        groups: [{ id: 'ado', label: 'Groupe ado' }],
      },
    })
    assert.equal(catalog.status, 200)
    assert.equal(catalog.body.kinds.find((entry) => entry.id === 'sortie')?.label, 'Sortie du cercle')
    assert.equal(catalog.body.groups.find((entry) => entry.id === 'ado')?.label, 'Groupe ado')
  })

  it('inscrit un membre, le range, puis autorise le sondage sur sa fiche', async () => {
    const app = createApiApp()
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    const child = await request(app, 'POST', '/api/people', {
      token: login.body.token,
      body: { nom: 'Le Gall', prenom: 'Léa', roles: ['danseur_enfant'] },
    })
    const event = await request(app, 'POST', '/api/events', {
      token: login.body.token,
      body: {
        type: 'sortie',
        titre: 'Sortie test',
        debut: '2026-09-10T17:00:00.000Z',
        inscriptionsOuvertes: true,
      },
    })

    const blocked = await request(app, 'POST', `/api/public/events/${event.body.id}/presence`, {
      body: { personId: child.body.id, statut: '1' },
    })
    assert.equal(blocked.status, 401)

    const signup = await request(app, 'POST', '/api/auth/register', {
      body: {
        prenom: 'Marie',
        nom: 'Le Gall',
        email: 'marie@cercle.test',
        password: 'motdepasse',
        relation: 'parent',
        childrenNames: 'Léa',
      },
    })
    assert.equal(signup.status, 200)
    assert.equal(signup.body.user.status, 'pending')

    const waiting = await request(app, 'GET', '/api/public/espace-membre', { token: signup.body.token })
    assert.equal(waiting.status, 200)
    assert.equal(waiting.body.pending, true)

    const tooSoon = await request(app, 'POST', `/api/public/events/${event.body.id}/presence`, {
      token: signup.body.token,
      body: { personId: child.body.id, statut: '1' },
    })
    assert.equal(tooSoon.status, 403)

    const placed = await request(app, 'POST', `/api/members/${signup.body.user.id}/place`, {
      token: login.body.token,
      body: { personIds: [child.body.id] },
    })
    assert.equal(placed.status, 200)
    assert.equal(placed.body.status, 'active')
    assert.deepEqual(placed.body.personIds, [child.body.id])

    const parentLogin = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'marie@cercle.test', password: 'motdepasse' },
    })
    const presence = await request(app, 'POST', `/api/public/events/${event.body.id}/presence`, {
      token: parentLogin.body.token,
      body: { personId: child.body.id, statut: '?' },
    })
    assert.equal(presence.status, 200)
    assert.equal(presence.body.statut, 'maybe')

    const other = await request(app, 'POST', '/api/people', {
      token: login.body.token,
      body: { nom: 'Prigent', prenom: 'Yann', roles: ['danseur_concours'] },
    })
    const stolen = await request(app, 'POST', `/api/public/events/${event.body.id}/presence`, {
      token: parentLogin.body.token,
      body: { personId: other.body.id, statut: '1' },
    })
    assert.equal(stolen.status, 403)

    const space = await request(app, 'GET', '/api/public/espace-membre', { token: parentLogin.body.token })
    assert.equal(space.body.pending, false)
    assert.equal(space.body.profiles.length, 1)
    assert.ok(space.body.presences.some((entry) => entry.personId === child.body.id))
  })

  it('refuse le sondage d’un membre hors des groupes concernés', async () => {
    const app = createApiApp()
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    const dancer = await request(app, 'POST', '/api/people', {
      token: login.body.token,
      body: { nom: 'Le Gall', prenom: 'Yan', roles: ['danseur_concours'] },
    })
    const event = await request(app, 'POST', '/api/events', {
      token: login.body.token,
      body: {
        kinds: ['sortie'],
        groupes: ['ado'],
        titre: 'Sortie ado',
        debut: '2026-10-02T17:00:00.000Z',
        inscriptionsOuvertes: true,
      },
    })
    const signup = await request(app, 'POST', '/api/auth/register', {
      body: {
        prenom: 'Yan',
        nom: 'Le Gall',
        email: 'yan.ado@cercle.test',
        password: 'motdepasse',
        relation: 'danseur',
      },
    })
    await request(app, 'POST', `/api/members/${signup.body.user.id}/place`, {
      token: login.body.token,
      body: { personIds: [dancer.body.id] },
    })
    const memberLogin = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'yan.ado@cercle.test', password: 'motdepasse' },
    })
    const blocked = await request(app, 'POST', `/api/public/events/${event.body.id}/presence`, {
      token: memberLogin.body.token,
      body: { personId: dancer.body.id, statut: '1' },
    })
    assert.equal(blocked.status, 403)
    assert.match(String(blocked.body.error || ''), /concerné/)
  })

  it('réinitialise un mot de passe sans divulguer l’existence du compte', async () => {
    const app = createApiApp()
    const unknown = await request(app, 'POST', '/api/auth/forgot-password', {
      body: { email: 'inconnu@cercle.test' },
    })
    assert.equal(unknown.status, 200)
    assert.match(unknown.body.message || '', /lien/)
    assert.equal(unknown.body.url, undefined)
    assert.equal(unknown.body.resetUrl, undefined)

    const signup = await request(app, 'POST', '/api/auth/register', {
      body: {
        prenom: 'Anna',
        nom: 'Le Berre',
        email: 'anna.reset@cercle.test',
        password: 'ancienmdp',
        relation: 'danseur',
      },
    })
    assert.equal(signup.status, 200)

    const forgot = await request(app, 'POST', '/api/auth/forgot-password', {
      body: { email: 'anna.reset@cercle.test' },
    })
    assert.equal(forgot.status, 200)
    assert.equal(forgot.body.url, undefined)
    assert.equal(forgot.body.resetUrl, undefined)

    const unauthorized = await request(app, 'POST', `/api/users/${signup.body.user.id}/reset-link`)
    assert.equal(unauthorized.status, 401)

    const admin = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    const link = await request(app, 'POST', `/api/users/${signup.body.user.id}/reset-link`, {
      token: admin.body.token,
    })
    assert.equal(link.status, 200)
    assert.match(link.body.url, /\/nouveau-mot-de-passe\?token=/)
    const token = new URL(link.body.url).searchParams.get('token')
    assert.ok(token)

    const weak = await request(app, 'POST', '/api/auth/reset-password', {
      body: { token, password: 'court' },
    })
    assert.equal(weak.status, 400)

    const reset = await request(app, 'POST', '/api/auth/reset-password', {
      body: { token, password: 'nouveaumdp' },
    })
    assert.equal(reset.status, 200)

    const oldLogin = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'anna.reset@cercle.test', password: 'ancienmdp' },
    })
    assert.equal(oldLogin.status, 401)

    const newLogin = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'anna.reset@cercle.test', password: 'nouveaumdp' },
    })
    assert.equal(newLogin.status, 200)
    assert.ok(newLogin.body.token)

    const reuse = await request(app, 'POST', '/api/auth/reset-password', {
      body: { token, password: 'autremdp12' },
    })
    assert.equal(reuse.status, 400)
  })

  it('coupe la session après reset et refuse un compte désactivé', async () => {
    const app = createApiApp()
    const signup = await request(app, 'POST', '/api/auth/register', {
      body: {
        prenom: 'Loeiza',
        nom: 'Le Roux',
        email: 'loeiza.secure@cercle.test',
        password: 'motdepasse',
        relation: 'danseur',
      },
    })
    assert.equal(signup.status, 200)
    const oldToken = signup.body.token

    const admin = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    const link = await request(app, 'POST', `/api/users/${signup.body.user.id}/reset-link`, {
      token: admin.body.token,
    })
    const token = new URL(link.body.url).searchParams.get('token')
    assert.equal((await request(app, 'POST', '/api/auth/reset-password', {
      body: { token, password: 'nouveaumdp' },
    })).status, 200)

    const stale = await request(app, 'GET', '/api/auth/me', { token: oldToken })
    assert.equal(stale.status, 401)

    const again = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'loeiza.secure@cercle.test', password: 'nouveaumdp' },
    })
    assert.equal(again.status, 200)
    await request(app, 'PUT', `/api/users/${signup.body.user.id}`, {
      token: admin.body.token,
      body: { status: 'disabled' },
    })
    const disabledMe = await request(app, 'GET', '/api/auth/me', { token: again.body.token })
    assert.equal(disabledMe.status, 401)
    const disabledLogin = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'loeiza.secure@cercle.test', password: 'nouveaumdp' },
    })
    assert.equal(disabledLogin.status, 403)
    const disabledLink = await request(app, 'POST', `/api/users/${signup.body.user.id}/reset-link`, {
      token: admin.body.token,
    })
    assert.equal(disabledLink.status, 400)
  })

  it('construit le lien de reset depuis KAMG_PUBLIC_URL, pas depuis un Host forgé', async () => {
    const previous = process.env.KAMG_PUBLIC_URL
    process.env.KAMG_PUBLIC_URL = 'https://kamg.example'
    try {
      const app = createApiApp()
      const admin = await request(app, 'POST', '/api/auth/login', {
        body: { login: 'admin', password: 'admin' },
      })
      const users = await request(app, 'GET', '/api/users', { token: admin.body.token })
      const adminUser = users.body.find((user) => user.login === 'admin')
      const link = await request(app, 'POST', `/api/users/${adminUser.id}/reset-link`, {
        token: admin.body.token,
        headers: { 'X-Forwarded-Host': 'phishing.test', Host: 'phishing.test' },
      })
      assert.equal(link.status, 200)
      assert.match(link.body.url, /^https:\/\/kamg\.example\/nouveau-mot-de-passe\?token=/)
      assert.doesNotMatch(link.body.url, /phishing/)
    } finally {
      if (previous == null) delete process.env.KAMG_PUBLIC_URL
      else process.env.KAMG_PUBLIC_URL = previous
    }
  })

  it('limite les tentatives de connexion', async () => {
    const app = createApiApp()
    let last
    for (let i = 0; i < 21; i += 1) {
      last = await request(app, 'POST', '/api/auth/login', {
        body: { login: 'inconnu-rate', password: 'mauvais-mot' },
      })
    }
    assert.equal(last.status, 429)
  })

  it('applique les en-têtes de sécurité', async () => {
    const app = createApiApp()
    const res = await request(app, 'GET', '/api/health')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN')
    assert.match(res.headers.get('content-security-policy') || '', /script-src 'self'/)
  })

  it('refuse la feuille de présences sans connexion', async () => {
    const app = createApiApp()
    const res = await request(app, 'GET', '/api/presences')
    assert.equal(res.status, 401)
  })

  it('valide, liste et efface les présences comme une feuille Excel', async () => {
    const app = createApiApp()
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    const person = await request(app, 'POST', '/api/people', {
      token: login.body.token,
      body: { nom: 'Le Gall', prenom: 'Anna', roles: ['danseur_enfant'] },
    })
    const event = await request(app, 'POST', '/api/events', {
      token: login.body.token,
      body: {
        type: 'sortie',
        titre: 'Sortie grille',
        debut: '2027-04-12T17:00:00.000Z',
        inscriptionsOuvertes: true,
      },
    })
    const invalid = await request(app, 'PUT', `/api/events/${event.body.id}/presences`, {
      token: login.body.token,
      body: { personId: person.body.id, statut: 'xyz' },
    })
    assert.equal(invalid.status, 400)

    const unknownPerson = await request(app, 'POST', `/api/public/events/${event.body.id}/presence`, {
      token: login.body.token,
      body: { personId: 'personne-inconnue', statut: '1' },
    })
    assert.equal(unknownPerson.status, 400)

    const saved = await request(app, 'PUT', `/api/events/${event.body.id}/presences`, {
      token: login.body.token,
      body: { personId: person.body.id, statut: '1' },
    })
    assert.equal(saved.status, 200)

    const sheet = await request(app, 'GET', '/api/presences', { token: login.body.token })
    assert.equal(sheet.status, 200)
    assert.equal(sheet.body.length, 1)

    const cleared = await request(app, 'PUT', `/api/events/${event.body.id}/presences`, {
      token: login.body.token,
      body: { personId: person.body.id, statut: '' },
    })
    assert.equal(cleared.status, 200)
    assert.equal(cleared.body.deleted, true)

    const empty = await request(app, 'GET', '/api/presences', { token: login.body.token })
    assert.equal(empty.body.length, 0)

    const missingPage = await request(app, 'GET', '/api/public/pages/inconnu', { token: login.body.token })
    assert.equal(missingPage.status, 404)

    const page = await request(app, 'POST', '/api/pages', {
      token: login.body.token,
      body: { titre: 'Tuto public', categorie: 'vocabulaire', corps: 'Texte utile', publie: true },
    })
    assert.equal(page.status, 200)
    const publicPage = await request(app, 'GET', `/api/public/pages/${page.body.id}`, { token: login.body.token })
    assert.equal(publicPage.status, 200)
    assert.equal(publicPage.body.corps, 'Texte utile')

    const space = await request(app, 'GET', '/api/public/espace-membre', { token: login.body.token })
    const summary = space.body.pages.find((entry) => entry.id === page.body.id)
    assert.ok(summary)
    assert.equal(summary.corps, undefined)
    assert.match(summary.excerpt || '', /Texte/)
  })

  it('vide le journal d’activité', async () => {
    const app = createApiApp()
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    assert.equal(login.status, 200)
    await request(app, 'POST', '/api/people', {
      token: login.body.token,
      body: { nom: 'Journal', prenom: 'Test' },
    })
    const before = await request(app, 'GET', '/api/audit', { token: login.body.token })
    assert.equal(before.status, 200)
    assert.ok(before.body.total >= 1)

    const cleared = await request(app, 'DELETE', '/api/audit', { token: login.body.token })
    assert.equal(cleared.status, 200)
    assert.ok(cleared.body.cleared >= 1)

    const after = await request(app, 'GET', '/api/audit', { token: login.body.token })
    assert.equal(after.status, 200)
    assert.equal(after.body.total, 1)
    assert.equal(after.body.entries[0].action, 'audit.clear')
  })

  it('enregistre une adhésion depuis Gestion', async () => {
    const app = createApiApp()
    const login = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'admin', password: 'admin' },
    })
    const person = await request(app, 'POST', '/api/people', {
      token: login.body.token,
      body: { nom: 'Le Gall', prenom: 'Anna', roles: ['danseur_loisir'] },
    })
    const paid = await request(app, 'PUT', `/api/people/${person.body.id}/adhesion`, {
      token: login.body.token,
      body: { seasonId: '2025-2026', paid: true },
    })
    assert.equal(paid.status, 200)
    assert.deepEqual(paid.body.saisons, ['2025-2026'])

    const lecteur = await request(app, 'POST', '/api/users', {
      token: login.body.token,
      body: { login: 'lecteur.adhesion', password: 'motdepasse', nom: 'Lecteur', role: 'lecteur' },
    })
    const lecteurLogin = await request(app, 'POST', '/api/auth/login', {
      body: { login: 'lecteur.adhesion', password: 'motdepasse' },
    })
    assert.equal(lecteur.status, 200)
    const forbidden = await request(app, 'PUT', `/api/people/${person.body.id}/adhesion`, {
      token: lecteurLogin.body.token,
      body: { seasonId: '2026-2027', paid: true },
    })
    assert.equal(forbidden.status, 403)
  })
})
