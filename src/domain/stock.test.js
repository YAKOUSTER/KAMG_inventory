import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  appendStockMovement,
  formatStock,
  hasStock,
  isStockBas,
  isTissu,
  normalizeStockFields,
  syncStockDisponibilite,
} from './stock.js'
import { normalizeItem } from './item.js'

describe('normalizeStockFields', () => {
  it('calcule le statut selon quantité et seuil', () => {
    const item = normalizeStockFields({
      categorie: 'fourniture',
      type: 'Fil',
      stockQuantite: 2,
      stockSeuil: 5,
      stockUnite: 'bobine',
    })
    assert.equal(item.disponibilite, 'Stock bas')
    assert.equal(formatStock(item), '2 bobine')
  })

  it('signale une rupture', () => {
    const item = normalizeStockFields({
      categorie: 'fourniture',
      stockQuantite: 0,
    })
    assert.equal(item.disponibilite, 'Rupture')
    assert.equal(isStockBas(item), true)
  })
})

describe('appendStockMovement', () => {
  it('ajoute un mouvement et met à jour la quantité', () => {
    const item = normalizeStockFields({
      categorie: 'fourniture',
      stockQuantite: 10,
      stockUnite: 'pièce',
    })
    appendStockMovement(item, { delta: -3, motif: 'Atelier', auteur: 'Admin' })
    assert.equal(item.stockQuantite, 7)
    assert.equal(item.stockMouvements.length, 1)
    assert.equal(item.stockMouvements[0].motif, 'Atelier')
  })
})

describe('normalizeItem fourniture', () => {
  it('n’est pas empruntable', () => {
    const item = normalizeItem({
      id: 'f1',
      code: 'FOU-01',
      nom: 'Fil polyester',
      categorie: 'fourniture',
      type: 'Fil',
      stockQuantite: 4,
    })
    syncStockDisponibilite(item)
    assert.equal(item.disponibilite, 'En stock')
  })
})

describe('stock tissu', () => {
  it('reprend le métrage historique et formate la quantité restante', () => {
    const item = normalizeStockFields({
      categorie: 'tissu',
      type: 'Toile',
      metrage: 8.5,
      stockUnite: '',
    })
    assert.equal(item.stockQuantite, 8.5)
    assert.equal(item.stockUnite, 'm')
    assert.equal(formatStock(item), '8.5 m')
    assert.equal(item.disponibilite, 'Disponible')
  })

  it('signale une rupture de tissu', () => {
    const item = normalizeStockFields({
      categorie: 'tissu',
      stockQuantite: 0,
      stockUnite: 'm',
    })
    assert.equal(item.disponibilite, 'Rupture')
    assert.equal(isStockBas(item), true)
  })

  it('accepte les grammes comme unité', () => {
    const item = normalizeStockFields({
      categorie: 'tissu',
      stockQuantite: 350,
      stockUnite: 'g',
    })
    assert.equal(formatStock(item), '350 g')
    assert.equal(hasStock(item), true)
  })
})
