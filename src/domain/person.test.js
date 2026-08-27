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
  personLegalName,
  personRolesLabel,
  sortPeople,
  memberSelfProfile,
  isCurrentMember,
  setPaidSeason,
  hasPaidSeason,
  canHaveSeasons,
  adhesionPeople,
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
    assert.equal(person.nomUsage, '')
    assert.equal(person.mesures.tourTaille, 70)
    assert.equal(person.mesures.tourTete, null)
    assert.equal(person.images.length, 0)
    assert.deepEqual(person.roles, [])
    assert.deepEqual(person.tags, [])
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
        tags: ['ca_president', 'inconnu'],
        anneeMembre: 2026,
      },
      { id: 'p2' },
    )
    assert.deepEqual(person.roles, ['membre', 'danseur_loisir', 'couture'])
    assert.deepEqual(person.tags, ['ca_president'])
    assert.equal(person.anneeMembre, '2026-2027')
    assert.deepEqual(person.saisons, ['2026-2027'])
    assert.equal(person.nouveau, true)
    assert.equal(
      personRolesLabel(person, new Date('2026-08-25T12:00:00')),
      'Membre 2026-2027 · Danseur loisir · Groupe Vêtement · NEW',
    )
    assert.equal(isCurrentMember(person, new Date('2026-08-25T12:00:00')), false)
    assert.equal(isCurrentMember(person, new Date('2026-10-02T12:00:00')), true)
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
    assert.equal(person.anneeMembre, '2024-2025')
    assert.deepEqual(person.saisons, ['2024-2025'])
    assert.equal(person.nouveau, false)
    assert.equal(personRolesLabel(person, new Date('2026-08-25T12:00:00')), 'Danseur concours')
    assert.equal(isCurrentMember(person, new Date('2026-08-25T12:00:00')), false)
  })

  it('reprend un ancien rôle texte connu', () => {
    assert.deepEqual(normalizeRoles({ role: 'Invité' }), ['invite'])
    const person = normalizePerson({ nom: 'Le Roux', prenom: 'Maïwenn', role: 'Couture' }, { id: 'p3' })
    assert.deepEqual(person.roles, ['couture'])
    assert.equal(personRolesLabel(person), 'Groupe Vêtement')
    assert.deepEqual(person.saisons, [])
    assert.equal(person.nouveau, false)
  })

  it('refuse les saisons pour un invité', () => {
    const person = normalizePerson(
      {
        nom: 'Hamon',
        prenom: 'Loeiza',
        roles: ['invite'],
        saisons: ['2026-2027'],
        nouveau: true,
      },
      { id: 'p-invite' },
    )
    assert.deepEqual(person.saisons, [])
    assert.equal(person.nouveau, false)
    assert.equal(person.anneeMembre, '')
    assert.equal(canHaveSeasons(person), false)
  })

  it('conserve les adhésions hors rôle de danse, y compris Groupe Vêtement', () => {
    const couture = normalizePerson(
      {
        nom: 'Le Roux',
        prenom: 'Maïwenn',
        roles: ['couture'],
        saisons: ['2025-2026'],
      },
      { id: 'p-couture' },
    )
    assert.deepEqual(couture.saisons, ['2025-2026'])
    assert.equal(isCurrentMember(couture, new Date('2026-08-25T12:00:00')), true)
    assert.equal(
      personRolesLabel(couture, new Date('2026-08-25T12:00:00')),
      'Membre 2025-2026 · Groupe Vêtement',
    )
    const sansRole = normalizePerson(
      { nom: 'Hamon', prenom: 'Nolwenn', saisons: ['2024-2025', '2025-2026'] },
      { id: 'p-plain' },
    )
    assert.deepEqual(sansRole.saisons, ['2024-2025', '2025-2026'])
    assert.equal(canHaveSeasons(sansRole), true)
  })

  it('ajoute ou retire une saison d’adhésion', () => {
    const person = { roles: ['danseur_loisir'], saisons: ['2024-2025'] }
    assert.deepEqual(setPaidSeason(person, '2025-2026', true), ['2024-2025', '2025-2026'])
    assert.deepEqual(setPaidSeason({ saisons: ['2025-2026'] }, '2025-2026', false), [])
    assert.equal(hasPaidSeason({ saisons: ['2025-2026'] }, '2025'), true)
  })

  it('liste les personnes éligibles à une adhésion, sans les invités', () => {
    const people = [
      { id: '1', prenom: 'Anna', nom: 'A', roles: ['danseur_loisir'] },
      { id: '2', prenom: 'Bob', nom: 'B', roles: ['invite'] },
      { id: '3', prenom: 'Claire', nom: 'C', roles: ['couture'] },
    ]
    assert.deepEqual(
      adhesionPeople(people).map((person) => person.id),
      ['1', '3'],
    )
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
    assert.equal(filterPeople(people, { annee: '2024-2025' }).length, 2)
    assert.equal(filterPeople(people, { role: 'danseur_ado' }).length, 1)
  })

  it('filtre par tag d’organigramme', () => {
    const list = [
      { id: '1', prenom: 'Anna', nom: 'A', tags: ['ca_president'] },
      { id: '2', prenom: 'Bob', nom: 'B', tags: ['ca_membre'] },
    ]
    assert.equal(filterPeople(list, { tag: 'ca_president' }).length, 1)
    assert.equal(filterPeople(list, { search: 'president' }).length, 1)
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

describe('memberSelfProfile', () => {
  it('expose la note atelier et les mesures pour l’espace membre', () => {
    const person = normalizePerson(
      {
        nom: 'Le Gall',
        prenom: 'Anna',
        noteAtelier: '  Housse au local FLG  ',
        tailleLettre: 'M',
        mesures: { pointure: 38 },
      },
      { id: 'p-note' },
    )
    assert.equal(person.noteAtelier, 'Housse au local FLG')
    const profile = memberSelfProfile(person)
    assert.equal(profile.noteAtelier, 'Housse au local FLG')
    assert.equal(profile.tailleLettre, 'M')
    assert.equal(profile.mesures.pointure, 38)
    assert.equal(profile.id, 'p-note')
  })

  it('normalise la biographie', () => {
    const person = normalizePerson(
      { nom: 'Le Gall', prenom: 'Anna', bio: '  Danse depuis 2019.  ' },
      { id: 'p-bio' },
    )
    assert.equal(person.bio, 'Danse depuis 2019.')
    assert.equal(memberSelfProfile(person).bio, 'Danse depuis 2019.')
  })

  it('affiche le nom d’usage à la place du nom d’état civil', () => {
    const person = normalizePerson(
      { nom: 'Dupont', prenom: 'Léa', nomUsage: 'Martin' },
      { id: 'p-usage' },
    )
    assert.equal(person.nom, 'DUPONT')
    assert.equal(person.nomUsage, 'MARTIN')
    assert.equal(personDisplayName(person), 'Léa MARTIN')
    assert.equal(personLegalName(person), 'Léa DUPONT')
    assert.equal(memberSelfProfile(person).nomUsage, 'MARTIN')
    assert.equal(filterPeople([person], { search: 'martin' }).length, 1)
    assert.equal(filterPeople([person], { search: 'dupont' }).length, 1)
  })
})
