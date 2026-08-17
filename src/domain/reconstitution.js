import { hasStock } from './stock.js'

export function isReconstitutionGood(item) {
  if (!item || hasStock(item)) return false
  if (item.categorie === 'piece_collection') return true
  return !item.erreurReconstitution
}

export function showReconstitutionErrorField(item) {
  return Boolean(item && !hasStock(item) && item.categorie !== 'piece_collection')
}
