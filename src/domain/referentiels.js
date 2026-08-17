import { CATEGORIES, DEFAULT_REFERENTIELS } from './taxonomy.js'

const CATEGORY_META = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, { icon: cat.icon, plural: cat.plural }]),
)

const REQUIRED_DISPONIBILITES = ['Disponible', 'Emprunté']

export function slugCategoryId(label) {
  return (
    String(label || 'categorie')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .slice(0, 40) || 'categorie'
  )
}

function uniqueStrings(list = []) {
  const seen = new Set()
  return list
    .map((value) => String(value || '').trim())
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) return false
      seen.add(value.toLowerCase())
      return true
    })
}

function normalizeCategories(categories = []) {
  const seen = new Set()
  return categories
    .map((entry, index) => {
      if (!entry) return null
      if (typeof entry === 'string') {
        return {
          id: slugCategoryId(entry),
          label: String(entry).trim(),
          plural: CATEGORY_META[slugCategoryId(entry)]?.plural || String(entry).trim(),
        }
      }
      const label = String(entry.label || entry.nom || '').trim()
      const id = String(entry.id || slugCategoryId(label)).trim() || `categorie_${index}`
      if (!label) return null
      return {
        id,
        label,
        plural: String(entry.plural || CATEGORY_META[id]?.plural || label).trim() || label,
      }
    })
    .filter((entry) => {
      if (!entry || seen.has(entry.id)) return false
      seen.add(entry.id)
      return true
    })
}

export function normalizeReferentiels(input = {}) {
  const base = structuredClone(DEFAULT_REFERENTIELS)
  const merged = {
    ...base,
    ...input,
    typesParCategorie: {
      ...base.typesParCategorie,
      ...(input.typesParCategorie || {}),
    },
  }

  merged.categories = normalizeCategories(input.categories?.length ? input.categories : base.categories)
  merged.epoques = uniqueStrings(input.epoques?.length ? input.epoques : base.epoques)
  merged.etats = uniqueStrings(input.etats?.length ? input.etats : base.etats)
  merged.disponibilites = uniqueStrings(
    input.disponibilites?.length ? input.disponibilites : base.disponibilites,
  )
  merged.couleurs = uniqueStrings(input.couleurs?.length ? input.couleurs : base.couleurs)
  merged.tailles = uniqueStrings(input.tailles?.length ? input.tailles : base.tailles)
  merged.modesAcquisition = uniqueStrings(
    input.modesAcquisition?.length ? input.modesAcquisition : base.modesAcquisition,
  )
  merged.unitesStock = uniqueStrings(input.unitesStock?.length ? input.unitesStock : base.unitesStock || [])

  const types = { ...merged.typesParCategorie }
  for (const category of merged.categories) {
    types[category.id] = uniqueStrings(types[category.id] || [])
  }
  merged.typesParCategorie = types
  return merged
}

export function categoriesWithMeta(referentiels) {
  const refs = normalizeReferentiels(referentiels)
  return refs.categories.map((category) => ({
    ...category,
    icon: CATEGORY_META[category.id]?.icon || 'mdi-tag',
    plural: category.plural || CATEGORY_META[category.id]?.plural || category.label,
  }))
}

export function categoryIds(referentiels) {
  return normalizeReferentiels(referentiels).categories.map((cat) => cat.id)
}

export function validateReferentiels(input, { items = [] } = {}) {
  const refs = normalizeReferentiels(input)
  if (!refs.categories.length) {
    throw new Error('Au moins une catégorie est requise')
  }
  for (const required of REQUIRED_DISPONIBILITES) {
    if (!refs.disponibilites.includes(required)) {
      throw new Error(`La disponibilité « ${required} » doit rester dans la liste`)
    }
  }
  const nextIds = new Set(refs.categories.map((cat) => cat.id))
  for (const item of items) {
    if (item.categorie && !nextIds.has(item.categorie)) {
      throw new Error(`Impossible de retirer la catégorie « ${item.categorie} » : des fiches l’utilisent encore`)
    }
  }
  return refs
}
