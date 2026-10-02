import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  EVENT_GROUPS,
  danceGroupSelectItems,
  eventRsvpReservedLabel,
  loansVisibleToMember,
  peopleForEventRsvp,
  personCanRsvpToEvent,
  peopleGroupedForMember,
  personDanceGroups,
} from './eventGroups.js'

describe('eventGroups', () => {
  it('ne propose plus Monitorat', () => {
    assert.ok(!EVENT_GROUPS.some((group) => group.id === 'monitorat'))
    assert.ok(!danceGroupSelectItems().some((item) => item.value === 'monitorat'))
  })

  it('autorise le RSVP seulement aux groupes concernés', () => {
    const ado = { id: 'p1', roles: ['danseur_ado'] }
    const concours = { id: 'p2', roles: ['danseur_concours'] }
    const event = { groupes: ['ado', 'tremplin'] }
    assert.deepEqual(personDanceGroups(ado), ['ado'])
    assert.equal(personCanRsvpToEvent(ado, event), true)
    assert.equal(personCanRsvpToEvent(concours, event), false)
    assert.equal(personCanRsvpToEvent(ado, { groupes: ['sortie'] }), true)
    assert.equal(personCanRsvpToEvent(null, event), false)
    assert.deepEqual(
      peopleForEventRsvp([ado, concours], event).map((person) => person.id),
      ['p1'],
    )
    assert.equal(eventRsvpReservedLabel(event), 'Sondage réservé aux groupes Ado, Tremplin')
    assert.equal(eventRsvpReservedLabel({ groupes: ['ado'] }), 'Sondage réservé au groupe Ado')
    assert.equal(eventRsvpReservedLabel({ groupes: ['sortie'] }), '')
  })

  it('filtre les emprunts du groupe du membre', () => {
    const people = [
      { id: 'a', roles: ['danseur_ado'] },
      { id: 'b', roles: ['danseur_ado'] },
      { id: 'c', roles: ['danseur_concours'] },
    ]
    const loans = [
      { id: 'l1', personId: 'a' },
      { id: 'l2', personId: 'b' },
      { id: 'l3', personId: 'c' },
    ]
    assert.deepEqual(
      loansVisibleToMember(loans, people, ['a']).map((loan) => loan.id),
      ['l1', 'l2'],
    )
    assert.deepEqual(
      loansVisibleToMember(loans, people, ['z']).map((loan) => loan.id),
      [],
    )
  })

  it('liste les membres des mêmes groupes de danse', () => {
    const people = [
      { id: 'a', prenom: 'Léa', nom: 'A', roles: ['danseur_ado'] },
      { id: 'b', prenom: 'Yan', nom: 'B', roles: ['danseur_ado'] },
      { id: 'c', prenom: 'Nora', nom: 'C', roles: ['danseur_concours'] },
    ]
    const groups = peopleGroupedForMember(people, ['a'])
    assert.deepEqual(groups.map((group) => group.id), ['ado'])
    assert.deepEqual(groups[0].people.map((person) => person.id), ['a', 'b'])
    assert.deepEqual(peopleGroupedForMember(people, ['z']), [])
  })
})
