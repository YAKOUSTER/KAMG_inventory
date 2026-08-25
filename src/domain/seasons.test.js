import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  currentSeasonId,
  membershipSeasons,
  newSeasonId,
  normalizeSeasons,
  parseSeasonId,
  seasonLabel,
} from './seasons.js'

describe('saisons du cercle', () => {
  it('coupe la saison en septembre', () => {
    assert.equal(seasonLabel('2025-10-08T18:00:00.000Z'), '2025-2026')
    assert.equal(seasonLabel('2026-08-20T18:00:00.000Z'), '2025-2026')
    assert.equal(seasonLabel('2026-09-01T18:00:00.000Z'), '2026-2027')
  })

  it('prépare la rentrée NEW en juillet-août', () => {
    assert.equal(newSeasonId(new Date('2026-08-25T12:00:00')), '2026-2027')
    assert.equal(newSeasonId(new Date('2026-09-10T12:00:00')), '2026-2027')
    assert.equal(newSeasonId(new Date('2027-01-10T12:00:00')), '2026-2027')
    assert.equal(newSeasonId(new Date('2027-07-02T12:00:00')), '2027-2028')
  })

  it('reste sur la saison en cours hors rentrée', () => {
    assert.equal(currentSeasonId(new Date('2026-08-25T12:00:00')), '2025-2026')
    assert.equal(currentSeasonId(new Date('2026-09-10T12:00:00')), '2026-2027')
  })

  it('migre une année civile vers une saison', () => {
    assert.equal(parseSeasonId('2026'), '2026-2027')
    assert.deepEqual(normalizeSeasons([], '2025'), ['2025-2026'])
    assert.deepEqual(normalizeSeasons(['2024-2025', '2025-2026']), ['2024-2025', '2025-2026'])
  })

  it('propose une liste de saisons', () => {
    const list = membershipSeasons(new Date('2026-08-25T12:00:00'))
    assert.ok(list.includes('2026-2027'))
    assert.ok(list.includes('2025-2026'))
  })
})
