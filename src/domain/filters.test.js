import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterItems, countByCategory } from './filters.js'

const items = [
  {
    code: 'JUP-01',
    nom: 'Jupe noire brodée',
    categorie: 'piece_costume',
    type: 'Jupe',
    epoque: '1900',
    disponibilite: 'Disponible',
    etat: 'Bon',
    couleur: 'Noir',
    tailleLettre: 'M',
    longueur: 90,
    tourTailleMin: 70,
    tags: ['bigouden'],
  },
  {
    code: 'ECH-01',
    nom: 'Échantillon lin écru',
    categorie: 'echantillon',
    type: 'Échantillon tissé',
    epoque: '1920',
    disponibilite: 'Non empruntable',
    etat: 'Bon',
    couleur: 'Écru',
    materiau: 'lin',
  },
]

describe('filterItems', () => {
  it('filtre par recherche texte (code, nom, tags, matière)', () => {
    assert.equal(filterItems(items, { search: 'bigouden' }).length, 1)
    assert.equal(filterItems(items, { search: 'lin' })[0].code, 'ECH-01')
    assert.equal(filterItems(items, { search: 'JUP' })[0].code, 'JUP-01')
  })

  it('filtre par catégorie et disponibilité', () => {
    assert.equal(filterItems(items, { categorie: 'echantillon' }).length, 1)
    assert.equal(filterItems(items, { disponibilite: 'Disponible' }).length, 1)
  })

  it('filtre par plage de mesures en ignorant les valeurs vides', () => {
    const result = filterItems(items, { longueur: [80, 100] })
    assert.equal(result.length, 2)
    assert.equal(filterItems(items, { longueur: [95, 120] }).length, 1)
  })
})

describe('countByCategory', () => {
  it('compte les pièces par catégorie', () => {
    assert.deepEqual(countByCategory(items), {
      piece_costume: 1,
      echantillon: 1,
    })
  })
})
