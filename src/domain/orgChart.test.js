import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  orgChartFromPeople,
  normalizeOrgTags,
  orgFormSections,
  ORG_LEFTOVER_SECTION_ID,
} from './orgChart.js'

const NOW = new Date('2026-08-27T12:00:00')

function active(person, extra = {}) {
  return { saisons: ['2025-2026'], adhesions: [{ seasonId: '2025-2026', methode: 'cheque' }], ...person, ...extra }
}

describe('normalizeOrgTags', () => {
  it('ne garde que les tags d’organigramme connus', () => {
    assert.deepEqual(normalizeOrgTags({ tags: ['ca_president', 'inconnu', 'ca_president'] }), ['ca_president'])
  })
})

describe('orgChartFromPeople', () => {
  it('place les responsabilités et les danseurs dans l’ordre demandé', () => {
    const people = [
      active({ id: '1', prenom: 'Anna', nom: 'P', tags: ['ca_president'] }),
      active({ id: '2', prenom: 'Yan', nom: 'V', tags: ['ca_membre'] }),
      active({ id: '3', prenom: 'Léa', nom: 'L', roles: ['danseur_loisir'] }),
      active({ id: '4', prenom: 'Mael', nom: 'K', tags: ['enfants_korrigan'], roles: ['danseur_enfant'] }),
      active({ id: '5', prenom: 'Nora', nom: 'B', roles: ['danseur_enfant'] }),
      active({ id: '6', prenom: 'Paul', nom: 'C', roles: ['danseur_concours'] }),
      active({ id: '7', prenom: 'Rozen', nom: 'T', roles: ['danseur_tremplin'] }),
      active({ id: '8', prenom: 'Soazig', nom: 'A', tags: ['art_penn'] }),
    ]
    const chart = orgChartFromPeople(people, NOW)
    assert.deepEqual(
      chart.map((section) => section.id),
      ['ca', 'loisir', 'enfants', 'tremplin', 'concours'],
    )

    const ca = chart.find((section) => section.id === 'ca')
    assert.deepEqual(ca.slots.map((slot) => slot.id), ['ca_president', 'ca_membre'])
    assert.deepEqual(ca.slots[0].people.map((person) => person.id), ['1'])

    const loisir = chart.find((section) => section.id === 'loisir')
    assert.deepEqual(loisir.slots.at(-1).people.map((person) => person.id), ['3'])

    const enfants = chart.find((section) => section.id === 'enfants')
    const korrigan = enfants.slots.find((slot) => slot.id === 'enfants_korrigan')
    const bugale = enfants.slots.find((slot) => slot.id === 'enfants_bugale')
    assert.deepEqual(korrigan.people.map((person) => person.id), ['4'])
    assert.deepEqual(bugale.people.map((person) => person.id), ['5'])

    const concours = chart.find((section) => section.id === 'concours')
    const art = concours.children.find((child) => child.id === 'artistique')
    assert.equal(art.slots[0].id, 'art_penn')
    const danseurs = concours.afterSlots.find((slot) => slot.id === 'concours_danseur')
    assert.deepEqual(danseurs.people.map((person) => person.id), ['6', '7'])
  })

  it('n’affiche que les adhérents actifs et range les autres en bas', () => {
    const people = [
      active({ id: 'ca', prenom: 'Sterenn', nom: 'F', tags: ['ca_president'] }),
      {
        id: 'old',
        prenom: 'Ancien',
        nom: 'Membre',
        tags: ['ca_membre'],
        saisons: ['2024-2025'],
        adhesions: [{ seasonId: '2024-2025', methode: 'cheque' }],
      },
      active({ id: 'hors', prenom: 'Anne-Marie', nom: 'Gibelot', roles: ['membre'] }),
    ]
    const chart = orgChartFromPeople(people, NOW)
    assert.deepEqual(
      chart.map((section) => section.id),
      ['ca', ORG_LEFTOVER_SECTION_ID],
    )
    const ca = chart.find((section) => section.id === 'ca')
    assert.deepEqual(ca.slots.flatMap((slot) => slot.people.map((person) => person.id)), ['ca'])
    const leftover = chart.find((section) => section.id === ORG_LEFTOVER_SECTION_ID)
    assert.equal(leftover.label, 'Adhérents actifs hors groupes, commissions ou CA')
    assert.deepEqual(leftover.slots[0].people.map((person) => person.id), ['hors'])
  })
})

describe('orgFormSections', () => {
  it('masque les listes de danseurs déjà couvertes par un rôle', () => {
    const form = orgFormSections()
    const loisir = form.find((section) => section.id === 'loisir')
    assert.equal(loisir.slots.some((slot) => slot.id === 'loisir_danseur'), false)
    assert.equal(loisir.slots.some((slot) => slot.id === 'loisir_resp_a'), true)
    const concours = form.find((section) => section.id === 'concours')
    assert.equal(concours.afterSlots.some((slot) => slot.id === 'concours_musicien'), true)
    assert.equal(concours.afterSlots.some((slot) => slot.id === 'concours_danseur'), false)
  })
})
