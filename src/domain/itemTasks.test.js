import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  addTasks,
  applyReturnUpdate,
  completeTask,
  countOpenTasks,
  itemsWithOpenTasks,
  normalizeItemCareFields,
  openTasks,
  syncDisponibiliteAfterReturn,
} from './itemTasks.js'

function sampleItem(overrides = {}) {
  return {
    id: 'item-1',
    code: 'JUP-01',
    nom: 'Jupe',
    etat: 'Bon',
    description: '',
    disponibilite: 'Emprunté',
    propre: null,
    pressingPayePar: '',
    pressingPayeParPersonId: '',
    aFaire: [],
    ...overrides,
  }
}

describe('applyReturnUpdate', () => {
  it('met à jour état, propreté et disponibilité au pressing', () => {
    const item = sampleItem()
    applyReturnUpdate(
      item,
      {
        etat: 'Usé',
        propre: false,
        pressingPayePar: 'cercle',
        descriptionAppend: 'Tache au bas',
      },
      { loanId: 'loan-1', defaultPersonId: 'person-1' },
    )
    assert.equal(item.etat, 'Usé')
    assert.equal(item.propre, false)
    assert.equal(item.pressingPayePar, 'cercle')
    assert.equal(item.disponibilite, 'Au pressing')
    assert.match(item.description, /\[Retour \d{4}-\d{2}-\d{2}\] Tache au bas/)
  })

  it('ajoute des actions et passe en restauration', () => {
    const item = sampleItem({ propre: true })
    applyReturnUpdate(
      item,
      {
        propre: true,
        aFaire: ['Recoudre un bouton', 'Recoudre un ourlet'],
      },
      { loanId: 'loan-1' },
    )
    assert.equal(item.disponibilite, 'En restauration')
    assert.equal(openTasks(item).length, 2)
    assert.equal(openTasks(item)[0].loanId, 'loan-1')
  })

  it('efface le pressing quand la pièce revient propre', () => {
    const item = sampleItem({
      propre: false,
      pressingPayePar: 'personne',
      pressingPayeParPersonId: 'person-1',
    })
    applyReturnUpdate(item, { propre: true }, { loanId: 'loan-1' })
    assert.equal(item.propre, true)
    assert.equal(item.pressingPayePar, '')
    assert.equal(item.pressingPayeParPersonId, '')
    assert.equal(item.disponibilite, 'Disponible')
  })

  it('attribue le pressing à la personne par défaut', () => {
    const item = sampleItem()
    applyReturnUpdate(
      item,
      { propre: false, pressingPayePar: 'personne' },
      { loanId: 'loan-1', defaultPersonId: 'borrower-1' },
    )
    assert.equal(item.pressingPayePar, 'personne')
    assert.equal(item.pressingPayeParPersonId, 'borrower-1')
  })
})

describe('openTasks et completeTask', () => {
  it('compte et termine les actions ouvertes', () => {
    const item = sampleItem()
    addTasks(item, ['À laver'], { loanId: 'loan-1', now: '2026-08-17T10:00:00.000Z' })
    addTasks(item, ['À réparer'], { loanId: 'loan-1', now: '2026-08-17T10:00:00.000Z' })
    assert.equal(countOpenTasks([item]), 2)
    const taskId = openTasks(item)[0].id
    completeTask(item, taskId, '2026-08-17T12:00:00.000Z')
    assert.equal(openTasks(item).length, 1)
    assert.ok(item.aFaire.find((task) => task.id === taskId).doneAt)
  })

  it('remonte les pièces avec actions ouvertes', () => {
    const withTasks = sampleItem({ id: 'a' })
    const clean = sampleItem({ id: 'b' })
    addTasks(withTasks, ['Repasser'])
    const rows = itemsWithOpenTasks([withTasks, clean])
    assert.equal(rows.length, 1)
    assert.equal(rows[0].item.id, 'a')
    assert.equal(rows[0].tasks[0].text, 'Repasser')
  })
})

describe('syncDisponibiliteAfterReturn', () => {
  it('priorise les actions ouvertes sur le pressing', () => {
    const item = sampleItem({ propre: false })
    addTasks(item, ['Recoudre un ourlet'])
    syncDisponibiliteAfterReturn(item)
    assert.equal(item.disponibilite, 'En restauration')
  })
})

describe('normalizeItemCareFields', () => {
  it('normalise les champs de suivi', () => {
    const item = normalizeItemCareFields({
      propre: '',
      pressingPayePar: 'invalid',
      aFaire: [{ text: 'À laver' }],
    })
    assert.equal(item.propre, null)
    assert.equal(item.pressingPayePar, '')
    assert.equal(item.aFaire[0].text, 'À laver')
  })
})
