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
  createLoan,
  returnLoanItems,
  listItems,
  importDb,
  ensureDb,
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

    const partial = await returnLoanItems(loan.id, [jupe.id], options)
    assert.equal(partial.statut, 'retour_partiel')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Disponible')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Emprunté')

    const done = await returnLoanItems(loan.id, [], options)
    assert.equal(done.statut, 'retourne')
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
})
