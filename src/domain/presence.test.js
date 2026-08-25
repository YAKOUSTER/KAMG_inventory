import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyPresenceUpdate,
  filterPeopleForPresence,
  groupPeopleByPresence,
  isClearedPresenceStatut,
  normalizePresenceStatut,
  summarizePresences,
} from './presence.js'

describe('normalizePresenceStatut', () => {
  it('accepte 1, 0 et ? comme dans l’ancien tableur', () => {
    assert.equal(normalizePresenceStatut('1'), 'present')
    assert.equal(normalizePresenceStatut('0'), 'absent')
    assert.equal(normalizePresenceStatut('?'), 'maybe')
    assert.equal(normalizePresenceStatut('present'), 'present')
  })
})

describe('filterPeopleForPresence', () => {
  it('filtre le groupe enfant comme l’onglet Excel', () => {
    const people = [
      { id: 'a', prenom: 'Zoé', nom: 'A', roles: ['danseur_concours'] },
      { id: 'b', prenom: 'Anna', nom: 'B', roles: ['danseur_enfant'] },
    ]
    const filtered = filterPeopleForPresence(people, 'danseur_enfant')
    assert.deepEqual(filtered.map((person) => person.id), ['b'])
  })
})

describe('summarizePresences', () => {
  it('compte par statut pour un événement', () => {
    const summary = summarizePresences(
      [
        { eventId: 'e1', personId: 'a', statut: 'present' },
        { eventId: 'e1', personId: 'b', statut: 'absent' },
        { eventId: 'e2', personId: 'c', statut: 'present' },
      ],
      'e1',
    )
    assert.equal(summary.present, 1)
    assert.equal(summary.absent, 1)
    assert.equal(summary.total, 2)
  })
})

describe('groupPeopleByPresence', () => {
  it('classe les réponses d’un sondage par sortie', () => {
    const people = [
      { id: 'a', prenom: 'Anna', nom: 'A' },
      { id: 'b', prenom: 'Yann', nom: 'B' },
      { id: 'c', prenom: 'Zoé', nom: 'C' },
    ]
    const groups = groupPeopleByPresence(
      people,
      [
        { eventId: 'e1', personId: 'a', statut: 'present' },
        { eventId: 'e1', personId: 'b', statut: 'maybe' },
      ],
      'e1',
    )
    assert.deepEqual(groups.present.map((person) => person.id), ['a'])
    assert.deepEqual(groups.maybe.map((person) => person.id), ['b'])
    assert.deepEqual(groups.unanswered.map((person) => person.id), ['c'])
  })
})

describe('applyPresenceUpdate', () => {
  it('ajoute, remplace et efface une case', () => {
    let list = applyPresenceUpdate([], { eventId: 'e1', personId: 'a', statut: 'present' })
    assert.equal(list.length, 1)
    list = applyPresenceUpdate(list, { eventId: 'e1', personId: 'a', statut: 'absent' })
    assert.equal(list[0].statut, 'absent')
    list = applyPresenceUpdate(list, { eventId: 'e1', personId: 'a', deleted: true })
    assert.equal(list.length, 0)
    assert.equal(isClearedPresenceStatut(''), true)
  })
})
