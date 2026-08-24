import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyEventOverlay, normalizeEvent, upcomingEvents, pastEvents, publicEventSummary } from './events.js'

describe('normalizeEvent', () => {
  it('normalise un événement publié', () => {
    const event = normalizeEvent(
      {
        type: 'sortie',
        titre: 'Festival de Lorient',
        debut: '2026-08-10T14:00:00',
        fin: '2026-08-10T18:00:00',
        lieu: 'Scène principale',
        description: 'Défilé',
      },
      { id: 'evt-1' },
    )
    assert.equal(event.type, 'sortie')
    assert.equal(event.publie, true)
    assert.equal(event.inscriptionsOuvertes, true)
    assert.deepEqual(event.kinds, [])
    assert.equal(event.titre, 'Festival de Lorient')
    assert.ok(event.debut.endsWith('Z') || event.debut.includes('T'))
  })

  it('préfixe le titre seulement si les types sont explicites', () => {
    const event = normalizeEvent(
      {
        kinds: ['sortie'],
        titre: 'Festival de Lorient',
        debut: '2026-08-10T14:00:00',
        sortie: { format: 'defile', transport: 'car' },
      },
      { id: 'evt-sortie' },
    )
    assert.equal(event.titre, '[SORTIE] Festival de Lorient')
    assert.deepEqual(event.kinds, ['sortie'])
    assert.equal(event.sortie.format, 'defile')
    assert.equal(event.sortie.transport, 'car')
  })

  it('ne réécrit pas un titre Google inféré', () => {
    const event = normalizeEvent(
      {
        source: 'google',
        type: 'repetition',
        titre: 'Répétition Ado+Tremplin #4',
        debut: '2026-08-10T14:00:00',
      },
      { id: 'google-rep' },
    )
    assert.equal(event.titre, 'Répétition Ado+Tremplin #4')
    assert.deepEqual(event.kinds, [])
  })

  it('ouvre les inscriptions par défaut seulement pour les sorties', () => {
    const repetition = normalizeEvent(
      { type: 'repetition', titre: 'Rep', debut: '2026-08-10T14:00:00' },
      { id: 'evt-rep' },
    )
    assert.equal(repetition.inscriptionsOuvertes, false)
  })

  it('exige un titre', () => {
    assert.throws(
      () => normalizeEvent({ debut: '2026-08-10T14:00:00' }, { id: 'evt-1' }),
      /titre/i,
    )
  })
})

describe('applyEventOverlay', () => {
  it('permet d’annoter un événement Google sans perdre la source', () => {
    const event = normalizeEvent(
      {
        source: 'google',
        type: 'autre',
        titre: 'Fest-noz',
        debut: '2026-08-10T14:00:00',
        publie: true,
      },
      { id: 'google-1' },
    )
    const overlaid = applyEventOverlay(event, {
      type: 'sortie',
      titre: 'Fest-noz KAMG',
      inscriptionsOuvertes: true,
    })
    assert.equal(overlaid.source, 'google')
    assert.equal(overlaid.type, 'sortie')
    assert.equal(overlaid.titre, 'Fest-noz KAMG')
    assert.equal(overlaid.inscriptionsOuvertes, true)
  })
})

describe('event lists', () => {
  const events = [
    { id: '1', titre: 'Past', debut: '2026-01-01T10:00:00.000Z', publie: true },
    { id: '2', titre: 'Future', debut: '2026-12-01T10:00:00.000Z', publie: true },
    { id: '3', titre: 'Draft', debut: '2026-12-02T10:00:00.000Z', publie: false },
  ]

  it('filtre les événements à venir publiés', () => {
    const list = upcomingEvents(events, new Date('2026-08-22T12:00:00.000Z'))
    assert.deepEqual(list.map((event) => event.id), ['2'])
  })

  it('produit un résumé public sans description trop longue', () => {
    const summary = publicEventSummary(
      {
        id: '2',
        type: 'sortie',
        titre: 'Future',
        debut: '2026-12-01T10:00:00.000Z',
        description: 'x'.repeat(500),
      },
      { includeDescription: true },
    )
    assert.equal(summary.description.length, 400)
    assert.equal(summary.inscriptionsOuvertes, true)
    assert.ok(Array.isArray(summary.kinds))
    assert.equal(summary.kinds.includes('sortie'), true)
  })

  it('filtre les événements passés publiés', () => {
    const list = pastEvents(events, new Date('2026-08-22T12:00:00.000Z'))
    assert.deepEqual(list.map((event) => event.id), ['1'])
  })
})
