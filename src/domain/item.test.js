import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isLoanable, normalizeItem } from './item.js'
import { normalizeStorageLocal, storageLocalLabel } from './taxonomy.js'

describe('isLoanable', () => {
  it('autorise une pièce de costume disponible', () => {
    assert.equal(isLoanable({ disponibilite: 'Disponible', categorie: 'piece_costume' }), true)
  })

  it('refuse échantillon, fourniture, tissu déjà sorti ou statut non empruntable', () => {
    assert.equal(isLoanable({ disponibilite: 'Disponible', categorie: 'echantillon' }), false)
    assert.equal(isLoanable({ disponibilite: 'En stock', categorie: 'fourniture' }), false)
    assert.equal(isLoanable({ disponibilite: 'Emprunté', categorie: 'piece_costume' }), false)
    assert.equal(isLoanable({ disponibilite: 'Non empruntable', categorie: 'piece_collection' }), false)
    assert.equal(isLoanable(null), false)
  })

  it('autorise le matériel disponible', () => {
    assert.equal(isLoanable({ disponibilite: 'Disponible', categorie: 'materiel' }), true)
  })
})

describe('local de stockage', () => {
  it('normalise Moulin Vert et Local FLG', () => {
    assert.equal(normalizeStorageLocal('Moulin Vert'), 'moulin_vert')
    assert.equal(normalizeStorageLocal('local_flg'), 'local_flg')
    assert.equal(storageLocalLabel('moulin_vert'), 'Moulin Vert')
    assert.equal(storageLocalLabel('local_flg'), 'Local FLG')
  })

  it('enregistre le local sur une fiche matériel', () => {
    const item = normalizeItem(
      {
        code: 'MAC-01',
        nom: 'Machine à coudre',
        categorie: 'materiel',
        type: 'Machine à coudre',
        local: 'Local FLG',
      },
      { id: 'mat-1' },
    )
    assert.equal(item.local, 'local_flg')
    assert.equal(item.categorie, 'materiel')
  })
})
