import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { nextHomeEvents, upcomingLibreSorties, memberHomeNews, memberHomeNewcomers } from './memberHome.js'

describe('accueil espace membres', () => {
  const now = new Date('2026-08-25T12:00:00.000Z')

  it('montre les prochains événements hors sorties libres', () => {
    const events = [
      { id: '1', titre: 'Répétition', debut: '2026-09-02T18:00:00.000Z', publie: true, type: 'repetition' },
      {
        id: '2',
        titre: 'Fest-noz',
        debut: '2026-09-03T21:00:00.000Z',
        publie: true,
        kinds: ['fest_noz'],
        horsCercle: true,
      },
      { id: '3', titre: 'Cours', debut: '2026-09-04T18:00:00.000Z', publie: true, type: 'cours' },
    ]
    assert.deepEqual(
      nextHomeEvents(events, { now }).map((event) => event.id),
      ['1', '3'],
    )
    assert.deepEqual(
      upcomingLibreSorties(events, { now }).map((event) => event.id),
      ['2'],
    )
  })

  it('prend les actualités newsletter les plus récentes', () => {
    const pages = [
      { id: 'a', categorie: 'newsletter', titre: 'Ancienne', publie: true, datePublication: '2026-01-01' },
      { id: 'b', categorie: 'tuto_coiffure', titre: 'Tuto', publie: true, datePublication: '2026-08-01' },
      { id: 'c', categorie: 'newsletter', titre: 'Nouvelle', publie: true, datePublication: '2026-08-20' },
    ]
    assert.deepEqual(
      memberHomeNews(pages, { limit: 3 }).map((page) => page.id),
      ['c', 'a'],
    )
  })

  it('regroupe les NEW par catégorie de danse, sans les invités', () => {
    const people = [
      { id: '1', prenom: 'Léa', nom: 'A', roles: ['danseur_enfant'], saisons: ['2026-2027'] },
      { id: '2', prenom: 'Yan', nom: 'B', roles: ['danseur_concours'], saisons: ['2024-2025', '2026-2027'] },
      { id: '3', prenom: 'Nora', nom: 'C', roles: ['invite'], saisons: ['2026-2027'] },
      { id: '4', prenom: 'Mae', nom: 'D', roles: ['danseur_ado'], saisons: ['2026-2027'], nouveau: true },
    ]
    const home = memberHomeNewcomers(people, now)
    assert.equal(home.season, '2026-2027')
    assert.deepEqual(
      home.groups.map((group) => group.role),
      ['danseur_enfant', 'danseur_ado'],
    )
    assert.ok(!home.groups.some((group) => group.people.some((person) => person.id === '3')))
    assert.ok(!home.groups.some((group) => group.people.some((person) => person.id === '2')))
  })
})
