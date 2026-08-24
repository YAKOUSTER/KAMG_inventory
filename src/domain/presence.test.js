import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  filterPeopleForPresence,
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
