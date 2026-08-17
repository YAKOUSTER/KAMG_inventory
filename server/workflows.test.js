import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  createItem,
  createPerson,
  createLoan,
  returnLoanItems,
  getItem,
  getStats,
  ensureDb,
  resetStoreCache,
} from './store.js'
import { countOpenTasks } from '../src/domain/itemTasks.js'

async function tmpOptions() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'patrimoine-wf-'))
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

describe('workflows métier', () => {
  let options

  beforeEach(async () => {
    options = await tmpOptions()
  })

  it('panier → emprunt → retour enrichi → actions au tableau de bord', async () => {
    const jupe = await createItem(
      { code: 'JUP-WF', nom: 'Jupe workflow', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const gilet = await createItem(
      { code: 'GIL-WF', nom: 'Gilet workflow', categorie: 'piece_costume', disponibilite: 'Disponible' },
      options,
    )
    const person = await createPerson({ nom: 'Test', prenom: 'Workflow' }, options)

    const loan = await createLoan(
      {
        personId: person.id,
        titre: 'Répétition',
        items: [
          { itemId: jupe.id, comment: 'sortie ok' },
          { itemId: gilet.id, comment: '' },
        ],
      },
      options,
    )
    assert.equal(loan.statut, 'en_cours')
    assert.equal((await getItem(jupe.id, options)).disponibilite, 'Emprunté')

    await returnLoanItems(loan.id, [jupe.id], {
      ...options,
      dateRetour: '2026-08-17',
      updates: {
        [jupe.id]: {
          etat: 'Usé',
          propre: false,
          pressingPayePar: 'personne',
          pressingPayeParPersonId: person.id,
          descriptionAppend: 'Tache au bas',
          aFaire: ['Recoudre un ourlet'],
        },
      },
    })

    const jupeAfter = await getItem(jupe.id, options)
    assert.equal(jupeAfter.etat, 'Usé')
    assert.equal(jupeAfter.propre, false)
    assert.equal(jupeAfter.disponibilite, 'En restauration')
    assert.match(jupeAfter.description, /Tache au bas/)
    assert.equal(countOpenTasks([jupeAfter]), 1)

    const stats = await getStats(options)
    assert.equal(stats.openTasks, 1)

    const closed = await returnLoanItems(loan.id, [], { ...options, dateRetour: '2026-08-20' })
    assert.equal(closed.statut, 'retourne')
    assert.equal((await getItem(gilet.id, options)).disponibilite, 'Disponible')
  })

  it('refuse une pièce invalide avec une erreur client', async () => {
    await assert.rejects(
      () => createItem({ code: '', nom: 'Sans code', categorie: 'piece_costume' }, options),
      (error) => {
        assert.equal(error.status, 400)
        assert.match(error.message, /code/i)
        return true
      },
    )
  })
})
