import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { eventCreateBatchKey, eventsInCreateBatch } from './eventBatches.js'

describe('lots de dates créées ensemble', () => {
  it('regroupe par identifiant de lot', () => {
    const events = [
      { id: 'a', titre: 'Rep', createdBatchId: 'lot-1', createdAt: '2026-10-02T09:13:59.100Z' },
      { id: 'b', titre: 'Rep', createdBatchId: 'lot-1', createdAt: '2026-10-02T09:13:59.104Z' },
      { id: 'c', titre: 'Rep', createdBatchId: 'lot-2', createdAt: '2026-10-02T09:13:59.100Z' },
    ]
    assert.deepEqual(
      eventsInCreateBatch(events, events[0]).map((entry) => entry.id),
      ['a', 'b'],
    )
  })

  it('regroupe une ancienne série sans identifiant, à la seconde près', () => {
    const events = [
      {
        id: 'a',
        titre: 'Répétition Korrigan/Bugale',
        kinds: ['repetition_bugale', 'repetition_korrigan'],
        createdAt: '2026-10-02T09:13:59.100Z',
      },
      {
        id: 'b',
        titre: 'Répétition Korrigan/Bugale',
        kinds: ['repetition_korrigan', 'repetition_bugale'],
        createdAt: '2026-10-02T09:13:59.107Z',
      },
      {
        id: 'c',
        titre: 'Répétition Korrigan #1',
        kinds: ['repetition_korrigan'],
        createdAt: '2026-10-02T09:13:59.100Z',
      },
    ]
    assert.equal(eventCreateBatchKey(events[0]), eventCreateBatchKey(events[1]))
    assert.deepEqual(
      eventsInCreateBatch(events, events[0]).map((entry) => entry.id),
      ['a', 'b'],
    )
  })
})
