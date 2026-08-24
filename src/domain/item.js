import { CATEGORY_IDS } from './taxonomy.js'
import { normalizeAttachments } from './attachments.js'
import { normalizeImages } from './images.js'
import { defaultStockUnit, hasStock, normalizeStockFields } from './stock.js'
import { normalizeItemCareFields } from './itemTasks.js'

export function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return [
      ...new Set(
        value.map((entry) => String(entry || '').trim()).filter(Boolean),
      ),
    ]
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function migrateLegacyItemFields(item) {
  if (!item.origines?.length && item.origine) {
    item.origines = normalizeStringList(item.origine)
  }
  if (!item.couleurs?.length && item.couleur) {
    item.couleurs = normalizeStringList(item.couleur)
  }

  item.origines = normalizeStringList(item.origines)
  item.couleurs = normalizeStringList(item.couleurs)
  item.techniques = normalizeStringList(item.techniques)
  item.tags = normalizeStringList(item.tags)

  if (item.perle && !item.techniques.includes('Perlé')) item.techniques.push('Perlé')
  if (item.broderie && !item.techniques.includes('Brodé')) item.techniques.push('Brodé')

  if ('bonneReconstitution' in item && !('erreurReconstitution' in item)) {
    item.erreurReconstitution = false
  }
  item.erreurReconstitution = Boolean(item.erreurReconstitution)

  delete item.origine
  delete item.couleur
  delete item.perle
  delete item.broderie
  delete item.bonneReconstitution
}

export function emptyItem(categorie = 'piece_costume') {
  return {
    id: '',
    code: '',
    categorie,
    type: '',
    nom: '',
    description: '',
    epoque: '',
    origines: [],
    materiau: '',
    composition: '',
    etat: '',
    couleurs: [],
    techniques: [],
    disponibilite: 'Disponible',
    proprietaire: '',
    localisation: '',
    tags: [],
    erreurReconstitution: false,
    motif: '',
    images: [],
    photoSourceId: '',
    attachments: [],
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
    stockQuantite: null,
    stockUnite: '',
    stockSeuil: null,
    stockReference: '',
    stockMouvements: [],
    propre: null,
    pressingPayePar: '',
    pressingPayeParPersonId: '',
    aFaire: [],
    createdAt: '',
    updatedAt: '',
  }
}

export function normalizeItem(input = {}, { id, now, categoryIds: allowedCategories } = {}) {
  const base = emptyItem(input.categorie)
  const item = { ...base, ...input }
  if (id) item.id = id
  if (!item.id) throw new Error('id requis')
  if (!item.code?.trim()) throw new Error('Le code est requis')
  if (!item.nom?.trim()) throw new Error('Le nom est requis')
  const allowed = allowedCategories?.length ? allowedCategories : CATEGORY_IDS
  if (!allowed.includes(item.categorie)) {
    throw new Error(`Catégorie inconnue : ${item.categorie}`)
  }
  migrateLegacyItemFields(item)
  item.code = String(item.code).trim()
  item.nom = String(item.nom).trim()
  item.images = normalizeImages(item.images)
  item.photoSourceId =
    item.photoSourceId && String(item.photoSourceId).trim() !== item.id
      ? String(item.photoSourceId).trim()
      : ''
  item.attachments = normalizeAttachments(item.attachments)
  item.linkedItemIds = Array.isArray(item.linkedItemIds)
    ? [...new Set(item.linkedItemIds.filter((x) => x && x !== item.id))]
    : []
  if (hasStock(item) && !item.stockUnite) {
    item.stockUnite = defaultStockUnit(item.type, item.categorie)
  }
  normalizeStockFields(item)
  normalizeItemCareFields(item)
  const stamp = now || new Date().toISOString()
  item.createdAt = item.createdAt || stamp
  item.updatedAt = stamp
  return item
}

export function itemTagValues(item) {
  const couleurs = item.couleurs?.length ? item.couleurs : item.couleur ? [item.couleur] : []
  const origines = item.origines?.length ? item.origines : item.origine ? [item.origine] : []
  return [
    ...origines,
    ...couleurs,
    ...(item.techniques || []),
    ...(item.tags || []),
  ]
}

export function itemSearchText(item) {
  return [
    item.code,
    item.nom,
    item.type,
    item.description,
    item.materiau,
    item.composition,
    item.proprietaire,
    item.localisation,
    item.motif,
    item.numeroInventaire,
    item.provenance,
    item.stockReference,
    ...itemTagValues(item),
    ...(normalizeImages(item.images).map((img) => img.legende)),
    ...(normalizeAttachments(item.attachments).flatMap((att) => [att.label, att.filename])),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function loanableStatuses() {
  return ['Disponible']
}

export function isLoanable(item) {
  return (
    item?.disponibilite === 'Disponible' &&
    !['echantillon', 'fourniture', 'tissu'].includes(item?.categorie)
  )
}
