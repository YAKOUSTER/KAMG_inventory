import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  displayDate,
  formatDate,
  groupLoansByYear,
  normalizePerson,
  normalizeRoles,
  personDisplayName,
  personRolesLabel,
} from './person.js'

describe('normalizePerson', () => {
  it('exige un nom, un prénom et normalise les mensurations', () => {
    const person = normalizePerson(
      { nom: 'Le Gall', prenom: 'Anna', mesures: { tourTaille: 70 } },
      { id: 'p1' },
    )
    assert.equal(person.nom, 'Le Gall')
    assert.equal(person.prenom, 'Anna')
    assert.equal(personDisplayName(person), 'Anna Le Gall')
    assert.equal(person.mesures.tourTaille, 70)
    assert.equal(person.mesures.tourTete, null)
    assert.equal(person.images.length, 0)
    assert.deepEqual(person.roles, [])
    assert.throws(() => normalizePerson({}, { id: 'x' }))
    assert.throws(() => normalizePerson({ nom: 'Le Gall' }, { id: 'x' }))
    assert.throws(() => normalizePerson({ prenom: 'Anna' }, { id: 'x' }))
  })

  it('accepte plusieurs rôles et l’année du membre', () => {
    const person = normalizePerson(
      {
        nom: 'Prigent',
        prenom: 'Yann',
        roles: ['membre', 'danseur_loisir', 'couture', 'inconnu'],
        anneeMembre: 2026,
      },
      { id: 'p2' },
    )
    assert.deepEqual(person.roles, ['membre', 'danseur_loisir', 'couture'])
    assert.equal(person.anneeMembre, '2026')
    assert.equal(personRolesLabel(person), 'Membre 2026 · Danseur loisir · Couture')
    assert.equal(person.role, undefined)
  })

  it('reprend un ancien rôle texte connu', () => {
    assert.deepEqual(normalizeRoles({ role: 'Invité' }), ['invite'])
    const person = normalizePerson({ nom: 'Le Roux', prenom: 'Maïwenn', role: 'Couture' }, { id: 'p3' })
    assert.deepEqual(person.roles, ['couture'])
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
