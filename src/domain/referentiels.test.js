import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  categoriesWithMeta,
  normalizeReferentiels,
  slugCategoryId,
  validateReferentiels,
} from './referentiels.js'

describe('normalizeReferentiels', () => {
  it('complète les listes manquantes avec les valeurs par défaut', () => {
    const refs = normalizeReferentiels({ epoques: ['2000'] })
    assert.deepEqual(refs.epoques, ['2000'])
    assert.ok(refs.etats.length > 0)
    assert.ok(refs.categories.length >= 5)
    assert.ok(Array.isArray(refs.typesParCategorie.piece_costume))
  })

  it('dédoublonne les valeurs', () => {
    const refs = normalizeReferentiels({ couleurs: ['Rouge', ' rouge ', 'Bleu'] })
    assert.deepEqual(refs.couleurs, ['Rouge', 'Bleu'])
  })
})

describe('categoriesWithMeta', () => {
  it('ajoute icône et pluriel connus', () => {
    const cats = categoriesWithMeta({})
    const costume = cats.find((cat) => cat.id === 'piece_costume')
    assert.equal(costume.label, 'Pièce de costume')
    assert.equal(costume.icon, 'mdi-tshirt-crew')
    assert.equal(costume.plural, 'Pièces de costume')
  })
})

describe('validateReferentiels', () => {
  it('exige Disponible et Emprunté', () => {
    assert.throws(
      () => validateReferentiels({ disponibilites: ['Archivé'] }),
      /Disponible/,
    )
  })

  it('empêche de retirer une catégorie utilisée', () => {
    const refs = normalizeReferentiels({})
    assert.throws(
      () =>
        validateReferentiels(
          {
            ...refs,
            categories: refs.categories.filter((cat) => cat.id !== 'tissu'),
          },
          { items: [{ categorie: 'tissu' }] },
        ),
      /tissu/,
    )
  })
})

describe('slugCategoryId', () => {
  it('génère un identifiant stable', () => {
    assert.equal(slugCategoryId('Pièce spéciale'), 'piece_speciale')
  })
})
