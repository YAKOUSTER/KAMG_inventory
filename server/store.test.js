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
  ensureDb,
  saveUpload,
  login,
  createUser,
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
    const person = await createPerson({ nom: 'Anna R.' }, options)
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
    const person = await createPerson({ nom: 'Mikael' }, options)
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
      { nom: 'Anna R.', mesures: { tourTaille: 70, pointure: 38 } },
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
})
