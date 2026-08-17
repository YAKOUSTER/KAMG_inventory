import { itemSearchText } from './item.js'
import { isStockBas } from './stock.js'

function inRange(value, range) {
  if (!range || range.length !== 2) return true
  if (value == null || value === '') return true
  const n = Number(value)
  if (Number.isNaN(n)) return true
  return n >= range[0] && n <= range[1]
}

export function filterItems(items, filters = {}) {
  const q = (filters.search || '').trim().toLowerCase()
  return items.filter((item) => {
    if (q && !itemSearchText(item).includes(q)) return false
    if (filters.categorie && filters.categorie !== 'Tout' && item.categorie !== filters.categorie) return false
    if (filters.epoque && filters.epoque !== 'Tout' && item.epoque !== filters.epoque) return false
    if (filters.disponibilite && filters.disponibilite !== 'Tout' && item.disponibilite !== filters.disponibilite) {
      return false
    }
    if (filters.etat && filters.etat !== 'Tout' && item.etat !== filters.etat) return false
    if (filters.couleur && filters.couleur !== 'Tout') {
      const wanted = filters.couleur.toLowerCase()
      if ((item.couleur || '').toLowerCase() !== wanted) return false
    }
    if (filters.taille && filters.taille !== 'Tout' && item.tailleLettre !== filters.taille) return false
    if (filters.type && filters.type !== 'Tout' && item.type !== filters.type) return false
    if (filters.stockBas && !isStockBas(item)) return false
    if (!inRange(item.longueur, filters.longueur)) return false
    if (!inRange(item.tourTailleMin, filters.tourTailleMin)) return false
    if (!inRange(item.tourTailleMax, filters.tourTailleMax)) return false
    if (!inRange(item.longueurDos, filters.longueurDos)) return false
    if (!inRange(item.longueurAvant, filters.longueurAvant)) return false
    if (!inRange(item.tourJupe, filters.tourJupe)) return false
    if (!inRange(item.longueurEpauleEpaule, filters.longueurEpauleEpaule)) return false
    if (!inRange(item.longueurManche, filters.longueurManche)) return false
    if (!inRange(item.tourTete, filters.tourTete)) return false
    return true
  })
}

export function countByCategory(items) {
  return items.reduce((acc, item) => {
    acc[item.categorie] = (acc[item.categorie] || 0) + 1
    return acc
  }, {})
}
