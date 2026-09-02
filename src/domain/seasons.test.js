import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  adhesionSeasonItems,
  currentSeasonId,
  membershipSeasons,
  newSeasonId,
  normalizeSeasons,
  parseSeasonId,
  seasonLabel,
} from './seasons.js'

describe('saisons du cercle', () => {
  it('coupe la saison en octobre', () => {
    assert.equal(seasonLabel('2025-10-08T12:00:00'), '2025-2026')
    assert.equal(seasonLabel('2026-08-20T12:00:00'), '2025-2026')
    assert.equal(seasonLabel('2026-09-15T12:00:00'), '2025-2026')
    assert.equal(seasonLabel('2026-10-01T12:00:00'), '2026-2027')
  })

  it('prépare la rentrée NEW de juillet à septembre', () => {
    assert.equal(newSeasonId(new Date('2026-08-25T12:00:00')), '2026-2027')
    assert.equal(newSeasonId(new Date('2026-09-10T12:00:00')), '2026-2027')
    assert.equal(newSeasonId(new Date('2026-10-02T12:00:00')), '2026-2027')
    assert.equal(newSeasonId(new Date('2027-01-10T12:00:00')), '2026-2027')
    assert.equal(newSeasonId(new Date('2027-07-02T12:00:00')), '2027-2028')
  })

  it('reste sur la saison en cours hors rentrée', () => {
    assert.equal(currentSeasonId(new Date('2026-08-25T12:00:00')), '2025-2026')
    assert.equal(currentSeasonId(new Date('2026-09-10T12:00:00')), '2025-2026')
    assert.equal(currentSeasonId(new Date('2026-10-02T12:00:00')), '2026-2027')
  })

  it('marque la saison en cours et la rentrée dans la liste d’adhésion', () => {
    const items = adhesionSeasonItems(new Date('2026-08-25T12:00:00'))
    assert.equal(items.find((item) => item.value === '2025-2026')?.title, 'Membre 2025-2026 · en cours')
    assert.equal(items.find((item) => item.value === '2026-2027')?.title, 'Membre 2026-2027 · rentrée')
  })

  it('migre une année civile vers une saison', () => {
    assert.equal(parseSeasonId('2026'), '2026-2027')
    assert.deepEqual(normalizeSeasons(undefined, '2025'), ['2025-2026'])
    assert.deepEqual(normalizeSeasons([], '2025'), [])
    assert.deepEqual(normalizeSeasons(['2024-2025', '2025-2026']), ['2024-2025', '2025-2026'])
  })

  it('propose une liste de saisons depuis 2000', () => {
    const list = membershipSeasons(new Date('2026-08-25T12:00:00'))
    assert.ok(list.includes('2026-2027'))
    assert.ok(list.includes('2025-2026'))
    assert.equal(list.at(-1), '2000-2001')
    assert.ok(!list.includes('1999-2000'))
  })
})
