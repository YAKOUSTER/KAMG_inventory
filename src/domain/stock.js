const MAX_MOVEMENTS = 50

export const DEFAULT_STOCK_UNITS = ['pièce', 'm', 'cm', 'bobine', 'rouleau', 'carte', 'g', 'kg', 'lot']

const DEFAULT_UNIT_BY_TYPE = {
  Fil: 'bobine',
  Bouton: 'pièce',
  Tissu: 'm',
  Bobine: 'bobine',
  Cannetille: 'm',
  'Ruban / galon': 'm',
  Dentelle: 'm',
  Élastique: 'm',
  Fermeture: 'pièce',
  Outil: 'pièce',
  Mercerie: 'pièce',
}

export function isFourniture(item) {
  return item?.categorie === 'fourniture'
}

export function defaultStockUnit(type = '') {
  return DEFAULT_UNIT_BY_TYPE[type] || 'pièce'
}

export function normalizeStockMovement(entry = {}, index = 0) {
  if (!entry) return null
  return {
    id: entry.id || `mov-${index}`,
    at: entry.at || entry.date || new Date().toISOString(),
    delta: Number(entry.delta) || 0,
    quantiteApres: Number(entry.quantiteApres ?? entry.after) || 0,
    motif: String(entry.motif || entry.comment || '').trim(),
    auteur: String(entry.auteur || entry.actor || '').trim(),
  }
}

export function normalizeStockFields(item) {
  if (!isFourniture(item)) {
    item.stockQuantite = null
    item.stockUnite = ''
    item.stockSeuil = null
    item.stockReference = ''
    item.stockMouvements = []
    return item
  }

  const quantite = item.stockQuantite
  item.stockQuantite =
    quantite == null || quantite === '' ? 0 : Math.max(0, Number(quantite) || 0)
  item.stockUnite = String(item.stockUnite || defaultStockUnit(item.type)).trim() || 'pièce'
  item.stockSeuil =
    item.stockSeuil == null || item.stockSeuil === '' ? null : Math.max(0, Number(item.stockSeuil) || 0)
  item.stockReference = String(item.stockReference || '').trim()
  item.stockMouvements = (Array.isArray(item.stockMouvements) ? item.stockMouvements : [])
    .map(normalizeStockMovement)
    .filter(Boolean)
    .slice(0, MAX_MOVEMENTS)
  syncFournitureDisponibilite(item)
  return item
}

export function syncFournitureDisponibilite(item) {
  if (!isFourniture(item)) return item
  const qty = Number(item.stockQuantite) || 0
  const seuil = item.stockSeuil == null ? null : Number(item.stockSeuil)
  if (qty <= 0) item.disponibilite = 'Rupture'
  else if (seuil != null && qty <= seuil) item.disponibilite = 'Stock bas'
  else item.disponibilite = 'En stock'
  return item
}

export function isStockBas(item) {
  if (!isFourniture(item)) return false
  const qty = Number(item.stockQuantite) || 0
  const seuil = item.stockSeuil == null ? null : Number(item.stockSeuil)
  if (qty <= 0) return true
  if (seuil != null && qty <= seuil) return true
  return false
}

export function formatStock(item) {
  if (!isFourniture(item)) return ''
  const qty = Number(item.stockQuantite) || 0
  const unit = item.stockUnite || 'pièce'
  const label = Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '')
  return `${label} ${unit}`
}

export function appendStockMovement(item, { delta, motif = '', auteur = '' } = {}) {
  if (!isFourniture(item)) throw new Error('Stock réservé aux fournitures')
  const change = Number(delta) || 0
  if (!change) throw new Error('Mouvement nul')
  const before = Number(item.stockQuantite) || 0
  const after = Math.max(0, before + change)
  item.stockQuantite = after
  item.stockMouvements.unshift(
    normalizeStockMovement({
      id: `mov-${Date.now()}`,
      at: new Date().toISOString(),
      delta: change,
      quantiteApres: after,
      motif,
      auteur,
    }),
  )
  item.stockMouvements = item.stockMouvements.slice(0, MAX_MOVEMENTS)
  syncFournitureDisponibilite(item)
  item.updatedAt = new Date().toISOString()
  return item
}

export function countLowStock(items = []) {
  return items.filter(isStockBas).length
}
