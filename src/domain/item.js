import { CATEGORY_IDS } from './taxonomy.js'
import { normalizeImages } from './images.js'

export function emptyItem(categorie = 'piece_costume') {
  return {
    id: '',
    code: '',
    categorie,
    type: '',
    nom: '',
    description: '',
    epoque: '',
    origine: '',
    materiau: '',
    composition: '',
    etat: '',
    couleur: '',
    disponibilite: 'Disponible',
    proprietaire: '',
    localisation: '',
    tags: [],
    perle: false,
    broderie: false,
    motif: '',
    images: [],
    linkedItemIds: [],
    tailleLettre: '',
    longueur: null,
    longueurDos: null,
    longueurAvant: null,
    tourTailleMin: null,
    tourTailleMax: null,
    tourJupe: null,
    longueurEpauleEpaule: null,
    longueurManche: null,
    tourTete: null,
    variable: '',
    longueurVariable: null,
    laize: null,
    metrage: null,
    raccordMotif: null,
    grammage: null,
    fournisseur: '',
    largeurEchantillon: null,
    hauteurEchantillon: null,
    armure: '',
    pieceSourceId: '',
    numeroInventaire: '',
    provenance: '',
    notesConservation: '',
    dateAcquisition: '',
    modeAcquisition: '',
    createdAt: '',
    updatedAt: '',
  }
}

export function normalizeItem(input = {}, { id, now } = {}) {
  const base = emptyItem(input.categorie)
  const item = { ...base, ...input }
  if (id) item.id = id
  if (!item.id) throw new Error('id requis')
  if (!item.code?.trim()) throw new Error('Le code est requis')
  if (!item.nom?.trim()) throw new Error('Le nom est requis')
  if (!CATEGORY_IDS.includes(item.categorie)) {
    throw new Error(`Catégorie inconnue : ${item.categorie}`)
  }
  item.code = String(item.code).trim()
  item.nom = String(item.nom).trim()
  item.tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : []
  item.images = normalizeImages(item.images)
  item.linkedItemIds = Array.isArray(item.linkedItemIds)
    ? [...new Set(item.linkedItemIds.filter((x) => x && x !== item.id))]
    : []
  const stamp = now || new Date().toISOString()
  item.createdAt = item.createdAt || stamp
  item.updatedAt = stamp
  return item
}

export function itemSearchText(item) {
  return [
    item.code,
    item.nom,
    item.type,
    item.description,
    item.materiau,
    item.composition,
    item.couleur,
    item.origine,
    item.proprietaire,
    item.localisation,
    item.motif,
    item.numeroInventaire,
    item.provenance,
    ...(item.tags || []),
    ...(normalizeImages(item.images).map((img) => img.legende)),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function loanableStatuses() {
  return ['Disponible']
}

export function isLoanable(item) {
  return item?.disponibilite === 'Disponible' && item?.categorie !== 'echantillon'
}
