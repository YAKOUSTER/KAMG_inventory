import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { displayDate, formatDate, groupLoansByYear, normalizePerson } from './person.js'

describe('normalizePerson', () => {
  it('exige un nom et normalise les mensurations', () => {
    const person = normalizePerson({ nom: 'Anna', mesures: { tourTaille: 70 } }, { id: 'p1' })
    assert.equal(person.nom, 'Anna')
    assert.equal(person.mesures.tourTaille, 70)
    assert.equal(person.mesures.tourTete, null)
    assert.equal(person.images.length, 0)
    assert.throws(() => normalizePerson({}, { id: 'x' }))
  })
})

describe('groupLoansByYear', () => {
  it('regroupe les emprunts de la plus récente année à la plus ancienne', () => {
    const grouped = groupLoansByYear([
      { id: 'a', dateEmprunt: '2024-03-01' },
      { id: 'b', dateEmprunt: '2026-07-20' },
      { id: 'c', dateEmprunt: '2026-01-02' },
    ])
    assert.deepEqual(
      grouped.map((g) => g.year),
      ['2026', '2024'],
    )
    assert.equal(grouped[0].loans.length, 2)
  })
})

describe('formatDate', () => {
  it('affiche seulement le jour, même avec un horodatage ISO', () => {
    assert.equal(formatDate('2026-08-15T18:00:00.000Z'), '2026-08-15')
    assert.equal(formatDate(''), '')
  })
})

describe('displayDate', () => {
  it('formate une date ISO en jour/mois/année', () => {
    assert.equal(displayDate('2026-08-15T18:00:00.000Z'), '15/08/2026')
  })
})
