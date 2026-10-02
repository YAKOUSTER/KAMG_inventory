import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  cellShortLabel,
  cyclePresenceStatut,
  indexPresences,
  inscriptionEventsForGrid,
  moveGridFocus,
  presenceCellKey,
  presenceColumnMeta,
  statutFromGridKey,
  buildPresenceSheetPrintHtml,
} from './presenceGrid.js'

describe('cyclePresenceStatut', () => {
  it('fait le tour 1 → 0 → ? → vide', () => {
    assert.equal(cyclePresenceStatut(''), 'present')
    assert.equal(cyclePresenceStatut('present'), 'absent')
    assert.equal(cyclePresenceStatut('absent'), 'maybe')
    assert.equal(cyclePresenceStatut('maybe'), '')
  })
})

describe('statutFromGridKey', () => {
  it('mappe le clavier type Excel', () => {
    assert.equal(statutFromGridKey('1'), 'present')
    assert.equal(statutFromGridKey('0'), 'absent')
    assert.equal(statutFromGridKey('?'), 'maybe')
    assert.equal(statutFromGridKey('Delete'), '')
    assert.equal(statutFromGridKey('x'), null)
  })
})

describe('moveGridFocus', () => {
  it('reste dans la grille', () => {
    assert.deepEqual(moveGridFocus(0, 0, 3, 4, -1, -1), { row: 0, col: 0 })
    assert.deepEqual(moveGridFocus(2, 3, 3, 4, 1, 1), { row: 2, col: 3 })
    assert.deepEqual(moveGridFocus(1, 1, 3, 4, 0, 1), { row: 1, col: 2 })
  })
})

describe('inscriptionEventsForGrid', () => {
  it('ne garde que les sorties à venir avec inscriptions', () => {
    const events = [
      { id: 'past', type: 'sortie', debut: '2026-01-01T18:00:00.000Z', inscriptionsOuvertes: true },
      { id: 'rep', type: 'repetition', debut: '2026-12-01T18:00:00.000Z', inscriptionsOuvertes: false },
      { id: 'ok', type: 'sortie', debut: '2026-12-02T18:00:00.000Z', inscriptionsOuvertes: true, titre: 'Fest' },
    ]
    const columns = inscriptionEventsForGrid(events, new Date('2026-08-24T12:00:00.000Z'))
    assert.deepEqual(columns.map((event) => event.id), ['ok'])
    assert.equal(presenceColumnMeta(columns[0]).dateLabel.length, 5)
    assert.equal(cellShortLabel('present'), '1')
  })

  it('crée une colonne par événement, même le même jour', () => {
    const events = [
      { id: 'matin', type: 'sortie', debut: '2026-12-02T10:00:00.000Z', inscriptionsOuvertes: true, titre: 'Défilé' },
      { id: 'soir', type: 'sortie', debut: '2026-12-02T18:00:00.000Z', inscriptionsOuvertes: true, titre: 'Fest-noz' },
    ]
    const columns = inscriptionEventsForGrid(events, new Date('2026-08-24T12:00:00.000Z')).map(presenceColumnMeta)
    assert.equal(columns.length, 2)
    assert.equal(columns[0].day, columns[1].day)
    assert.notEqual(columns[0].id, columns[1].id)
    assert.ok(columns[0].timeLabel)
    assert.notEqual(columns[0].timeLabel, columns[1].timeLabel)
  })
})

describe('indexPresences', () => {
  it('indexe par événement et personne', () => {
    const map = indexPresences([
      { eventId: 'e1', personId: 'p1', statut: 'present' },
      { eventId: 'e1', personId: 'p2', statut: 'absent' },
    ])
    assert.equal(map.get(presenceCellKey('e1', 'p1')).statut, 'present')
    assert.equal(map.has(presenceCellKey('e2', 'p1')), false)
  })
})

describe('export PDF feuille de présences', () => {
  it('inclut les noms, les réponses et échappe le HTML', () => {
    const html = buildPresenceSheetPrintHtml({
      title: 'Feuille <test>',
      groupLabel: 'Tous',
      generatedAt: '27/08/2026',
      columns: [{ id: 'e1', weekday: 'sam.', dateLabel: '12/12', timeLabel: '18:00', titre: 'Fest-noz' }],
      rows: [{ id: 'p1', name: 'Léa <script>' }, { id: 'p2', name: 'Yan' }],
      cells: {
        [presenceCellKey('e1', 'p1')]: '1',
        [presenceCellKey('e1', 'p2')]: '0',
      },
    })
    assert.match(html, /Léa &lt;script&gt;/)
    assert.match(html, /Feuille &lt;test&gt;/)
    assert.match(html, />1</)
    assert.match(html, />0</)
    assert.match(html, /Fest-noz/)
    assert.ok(!html.includes('<script>'))
  })
})
