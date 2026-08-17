import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  displayDate,
  filterPeople,
  formatDate,
  groupLoansByYear,
  groupPeopleByPromotion,
  normalizePerson,
  normalizeRoles,
  personDisplayName,
  personRolesLabel,
  sortPeople,
} from './person.js'

describe('normalizePerson', () => {
  it('exige un nom, un prénom et normalise les mensurations', () => {
    const person = normalizePerson(
      { nom: 'Le Gall', prenom: 'Anna', mesures: { tourTaille: 70 } },
      { id: 'p1' },
    )
    assert.equal(person.nom, 'LE GALL')
    assert.equal(person.prenom, 'Anna')
    assert.equal(personDisplayName(person), 'Anna LE GALL')
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
    assert.equal(personRolesLabel(person), 'Membre 2026 · Danseur loisir 2026 · Couture')
    assert.equal(person.role, undefined)
  })

  it('conserve l’année pour un danseur concours', () => {
    const person = normalizePerson(
      {
        nom: 'Dupont',
        prenom: 'Léa',
        roles: ['danseur_concours'],
        anneeMembre: '2024',
      },
      { id: 'p4' },
    )
    assert.equal(person.anneeMembre, '2024')
    assert.equal(personRolesLabel(person), 'Danseur concours 2024')
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

describe('filterPeople et promotions', () => {
  const people = [
    { id: '1', prenom: 'Anna', nom: 'A', roles: ['danseur_concours'], anneeMembre: '2024' },
    { id: '2', prenom: 'Bob', nom: 'B', roles: ['danseur_ado'], anneeMembre: '2024' },
    { id: '3', prenom: 'Claire', nom: 'C', roles: ['danseur_enfant'], anneeMembre: '2025' },
    { id: '4', prenom: 'David', nom: 'D', roles: ['couture'], anneeMembre: '' },
  ]

  it('filtre par année et rôle', () => {
    assert.equal(filterPeople(people, { annee: '2024' }).length, 2)
    assert.equal(filterPeople(people, { role: 'danseur_ado' }).length, 1)
  })

  it('recherche insensible à la casse et aux accents', () => {
    const list = [{ id: '5', prenom: 'Léa', nom: 'LE GALL', roles: ['couture'], email: 'lea@exemple.fr' }]
    assert.equal(filterPeople(list, { search: 'le gall' }).length, 1)
    assert.equal(filterPeople(list, { search: 'LE GALL' }).length, 1)
    assert.equal(filterPeople(list, { search: 'lea' }).length, 1)
    assert.equal(filterPeople(list, { search: 'LEA' }).length, 1)
  })

  it('regroupe une promotion par catégories pour une année', () => {
    const sections = groupPeopleByPromotion(people, { annee: '2024' })
    assert.equal(sections.length, 1)
    assert.equal(sections[0].year, '2024')
    assert.deepEqual(
      sections[0].groups.map((group) => group.role),
      ['danseur_concours', 'danseur_ado'],
    )
    assert.equal(sections[0].groups[0].people.length, 1)
  })

  it('trie par groupe puis nom', () => {
    const sorted = sortPeople(people, 'groupe')
    assert.equal(sorted[0].roles[0], 'danseur_concours')
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
