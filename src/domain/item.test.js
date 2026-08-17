import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isLoanable } from './item.js'

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
})
