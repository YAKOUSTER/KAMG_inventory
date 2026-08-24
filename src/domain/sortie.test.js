import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  displayHourLabel,
  emptySortie,
  normalizeSortie,
  seasonLabel,
  sortieHasContent,
} from './sortie.js'

describe('normalizeSortie', () => {
  it('applique les valeurs par défaut et ignore les ids inconnus', () => {
    const sortie = normalizeSortie({ format: 'inconnu', parkingFestival: 'oui', repasMidi: 'pique_nique' })
    assert.equal(sortie.format, '')
    assert.equal(sortie.parkingFestival, 'oui')
    assert.equal(sortie.repasMidi, 'pique_nique')
    assert.equal(sortie.change, 'non_defini')
  })

  it('copie les textes trimés', () => {
    const sortie = normalizeSortie({ rdvLieu: '  Moulin Vert  ', programme: 'Défilé 14h' })
    assert.equal(sortie.rdvLieu, 'Moulin Vert')
    assert.equal(sortie.programme, 'Défilé 14h')
  })
})

describe('sortieHasContent', () => {
  it('ignore les valeurs encore non définies', () => {
    assert.equal(sortieHasContent(emptySortie()), false)
    assert.equal(sortieHasContent(normalizeSortie({ format: 'defile' })), true)
  })
})

describe('seasonLabel', () => {
  it('coupe la saison en septembre', () => {
    assert.equal(seasonLabel('2025-10-08T18:00:00.000Z'), '2025-2026')
    assert.equal(seasonLabel('2026-08-20T18:00:00.000Z'), '2025-2026')
    assert.equal(seasonLabel('2026-09-01T18:00:00.000Z'), '2026-2027')
  })
})

describe('displayHourLabel', () => {
  it('affiche 18h30', () => {
    assert.equal(displayHourLabel('18:30'), '18h30')
    assert.equal(displayHourLabel('9:05'), '09h05')
  })
})
