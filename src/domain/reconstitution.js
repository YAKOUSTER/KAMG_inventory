import { hasStock } from './stock.js'

export function isReconstitutionGood(item) {
  if (!item || hasStock(item) || item.categorie === 'materiel') return false
  if (item.categorie === 'piece_collection') return true
  return !item.erreurReconstitution
}

export function showReconstitutionErrorField(item) {
  return Boolean(
    item && !hasStock(item) && item.categorie !== 'piece_collection' && item.categorie !== 'materiel',
  )
}
