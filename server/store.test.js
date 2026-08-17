import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  createItem,
  updateItem,
  deleteItem,
  getItem,
  createPerson,
  getPerson,
  createLoan,
  returnLoanItems,
  listItems,
  importDb,
  exportDb,
  ensureDb,
  saveUpload,
  login,
  createUser,
  getBootstrap,
  getLoan,
} from './store.js'

async function tmpOptions() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'patrimoine-'))
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

describe('json store', () => {
  let options

  beforeEach(async () => {
    options = await tmpOptions()
  })

  it('crée et relit une pièce', async () => {
    const created = await createItem(
      { code: 'JUP-01', nom: 'Jupe noire', categorie: 'piece_costume', type: 'Jupe' },
      options,
    )
    assert.ok(created.id)
    const items = await listItems(options)
    assert.equal(items.length, 1)
    const detail = await getItem(created.id, options)
    assert.equal(detail.nom, 'Jupe noire')
  })

  it('refuse un code en doublon', async () => {
    await createItem({ code: 'ECH-01', nom: 'Toile', categorie: 'echantillon' }, options)
    await assert.rejects(
      () => createItem({ code: 'ech-01', nom: 'Autre', categorie: 'echantillon' }, options),
      /existe déjà/,
    )
  })

  it('crée un emprunt puis un retour partiel', async () => {
    const jupe = await createItem(
      { code: 'JUP-01', nom: 'Jupe', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const gilet = await createItem(
      { code: 'GIL-01', nom: 'Gilet', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Le Gall', prenom: 'Anna' }, options)
    const loan = await createLoan(
      {
        personId: person.id,
        items: [
          { itemId: jupe.id, comment: 'bon état' },
          { itemId: gilet.id, comment: '' },
        ],
      },
      options,
    )
    assert.equal(loan.statut, 'en_cours')
    assert.equal(loan.personName, 'Anna Le Gall')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Emprunté')

    const partial = await returnLoanItems(loan.id, [jupe.id], { ...options, dateRetour: '2026-08-01' })
    assert.equal(partial.statut, 'retour_partiel')
    assert.equal(partial.items.find((line) => line.itemId === jupe.id).returnedAt, '2026-08-01')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Disponible')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Emprunté')

    const done = await returnLoanItems(loan.id, [], { ...options, dateRetour: '2026-08-15T18:00:00.000Z' })
    assert.equal(done.statut, 'retourne')
    assert.equal(done.items.find((line) => line.itemId === gilet.id).returnedAt, '2026-08-15')
    assert.equal(done.dateRetour, '2026-08-15')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Disponible')
  })

  it('refuse de supprimer une pièce empruntée', async () => {
    const item = await createItem(
      { code: 'TAB-01', nom: 'Tablier', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Le Berre', prenom: 'Mikael' }, options)
    await createLoan({ personId: person.id, items: [{ itemId: item.id }] }, options)
    await assert.rejects(() => deleteItem(item.id, options), /empruntée/)
  })

  it('met à jour une pièce et lie deux fiches', async () => {
    const jupe = await createItem({ code: 'JUP-02', nom: 'Jupe', categorie: 'piece_costume' }, options)
    const tablier = await createItem({ code: 'TAB-02', nom: 'Tablier', categorie: 'piece_costume' }, options)
    await updateItem(jupe.id, { linkedItemIds: [tablier.id], couleur: 'Noir' }, options)
    const detail = await getItem(jupe.id, options)
    assert.equal(detail.couleur, 'Noir')
    assert.equal(detail.linkedItems[0].id, tablier.id)
  })

  it('importe un dump JSON complet', async () => {
    await importDb(
      {
        items: [{ id: 'a', code: 'TIS-01', nom: 'Toile de lin', categorie: 'tissu' }],
        people: [{ id: 'p1', nom: 'Sterenn' }],
        loans: [],
      },
      options,
    )
    const items = await listItems(options)
    assert.equal(items[0].code, 'TIS-01')
  })

  it('enregistre une photo dans le dossier uploads', async () => {
    const pixel =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const saved = await saveUpload({ filename: 'face.png', dataUrl: pixel, prefix: 'JUP-014' }, options)
    assert.match(saved.src, /^\/uploads\/jup-014-/)
    assert.match(saved.src, /\.png$/)
  })

  it('connecte les comptes par défaut et refuse un mauvais mot de passe', async () => {
    const session = await login('admin', 'admin', options)
    assert.equal(session.user.role, 'admin')
    assert.ok(session.token)
    assert.ok(session.user.permissions.includes('items.create'))
    assert.ok(Array.isArray(session.items))
    assert.equal(typeof session.stats.totalItems, 'number')
    const boot = await getBootstrap(session.user, options)
    assert.equal(boot.items.length, session.items.length)
    await assert.rejects(() => login('admin', 'mauvais', options), /incorrect/)
  })

  it('crée un compte aux accès personnalisés', async () => {
    const user = await createUser(
      {
        login: 'marie',
        password: 'secret',
        nom: 'Marie',
        role: 'gestion',
        custom: true,
        permissions: ['items.read', 'items.create', 'loans.read'],
      },
      options,
    )
    assert.equal(user.custom, true)
    assert.ok(user.permissions.includes('items.create'))
    assert.ok(!user.permissions.includes('items.update'))
    assert.equal(user.passwordHash, undefined)
  })

  it('enregistre nom, prénom et plusieurs rôles', async () => {
    const person = await createPerson(
      {
        nom: 'Le Gall',
        prenom: 'Anna',
        roles: ['membre', 'danseur_enfant', 'couture'],
        anneeMembre: '2026',
      },
      options,
    )
    assert.equal(person.prenom, 'Anna')
    assert.equal(person.nom, 'Le Gall')
    assert.deepEqual(person.roles, ['membre', 'danseur_enfant', 'couture'])
    assert.equal(person.anneeMembre, '2026')
  })

  it('regroupe l’historique d’emprunts d’une personne par année', async () => {
    const jupe = await createItem(
      { code: 'JUP-HIST', nom: 'Jupe', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const tablier = await createItem(
      { code: 'TAB-HIST', nom: 'Tablier', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson(
      { nom: 'Le Gall', prenom: 'Anna', mesures: { tourTaille: 70, pointure: 38 } },
      options,
    )
    await createLoan(
      { personId: person.id, titre: 'Fest-noz', dateEmprunt: '2024-12-14', items: [{ itemId: tablier.id }] },
      options,
    )
    await createLoan(
      { personId: person.id, titre: 'Spectacle', dateEmprunt: '2026-07-20', items: [{ itemId: jupe.id }] },
      options,
    )
    const detail = await getPerson(person.id, options)
    assert.equal(detail.mesures.tourTaille, 70)
    assert.deepEqual(
      detail.loansByYear.map((group) => group.year),
      ['2026', '2024'],
    )
    assert.equal(detail.loansByYear[0].loans[0].titre, 'Spectacle')
  })

  it('déroule un emprunt réel : sortie, retour partiel daté, clôture', async () => {
    const jupe = await createItem(
      { code: 'JUP-WF', nom: 'Jupe', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const gilet = await createItem(
      { code: 'GIL-WF', nom: 'Gilet', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Fonseca', prenom: 'Sterenn' }, options)
    const loan = await createLoan(
      {
        personId: person.id,
        titre: 'Répétition',
        items: [{ itemId: jupe.id }, { itemId: gilet.id }],
      },
      options,
    )
    assert.equal(loan.statut, 'en_cours')
    assert.match(loan.dateEmprunt, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Emprunté')

    const partial = await returnLoanItems(loan.id, [jupe.id], { ...options, dateRetour: '2026-08-10' })
    assert.equal(partial.statut, 'retour_partiel')
    assert.equal(partial.items.find((line) => line.itemId === jupe.id).returnedAt, '2026-08-10')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Disponible')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Emprunté')

    const done = await returnLoanItems(loan.id, [], { ...options, dateRetour: '2026-08-15T22:00:00.000Z' })
    assert.equal(done.statut, 'retourne')
    assert.equal(done.dateRetour, '2026-08-15')
    assert.equal((await getLoan(loan.id, options)).items.every((line) => line.returnedAt), true)
    await assert.rejects(() => returnLoanItems(loan.id, [], options), /Aucune pièce/)
  })

  it('refuse un échantillon, un doublon, ou une pièce déjà sortie', async () => {
    const sample = await createItem(
      { code: 'ECH-WF', nom: 'Toile', categorie: 'echantillon', disponibilite: 'Disponible' },
      options,
    )
    const jupe = await createItem(
      { code: 'JUP-WF2', nom: 'Jupe', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Prigent', prenom: 'Yann' }, options)
    await assert.rejects(
      () => createLoan({ personId: person.id, items: [{ itemId: sample.id }] }, options),
      /pas disponible/,
    )
    await createLoan({ personId: person.id, items: [{ itemId: jupe.id }] }, options)
    await assert.rejects(
      () => createLoan({ personId: person.id, items: [{ itemId: jupe.id }] }, options),
      /pas disponible/,
    )
    const gilet = await createItem(
      { code: 'GIL-WF2', nom: 'Gilet', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    await assert.rejects(
      () =>
        createLoan(
          { personId: person.id, items: [{ itemId: gilet.id }, { itemId: gilet.id }] },
          options,
        ),
      /deux fois/,
    )
  })

  it('exporte sans sessions et conserve les comptes à l’import', async () => {
    await login('admin', 'admin', options)
    const dump = await exportDb(options)
    assert.deepEqual(dump.sessions, [])
    assert.ok(dump.users.length)
    const beforeUsers = dump.users.length
    await importDb({ items: [], people: [], loans: [] }, options)
    const after = await exportDb(options)
    assert.equal(after.users.length, beforeUsers)
    assert.deepEqual(after.sessions, [])
  })
})
