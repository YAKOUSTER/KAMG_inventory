export const CONTENT_CATEGORIES = [
  { id: 'presentation', label: 'Présentation', icon: 'mdi-information-outline' },
  { id: 'newsletter', label: 'Infos & newsletter', icon: 'mdi-bullhorn-outline' },
  { id: 'tuto_coiffure', label: 'Tuto coiffure', icon: 'mdi-face-woman-shimmer' },
  { id: 'tuto_habillage', label: 'Tuto habillage', icon: 'mdi-tshirt-crew' },
  { id: 'vocabulaire', label: 'Vocabulaire', icon: 'mdi-book-alphabet' },
  { id: 'autre', label: 'Autre', icon: 'mdi-file-document-outline' },
]

const CONTENT_CATEGORY_IDS = new Set(CONTENT_CATEGORIES.map((entry) => entry.id))

export function contentCategoryMeta(category) {
  return CONTENT_CATEGORIES.find((entry) => entry.id === category) || CONTENT_CATEGORIES.at(-1)
}

export function contentCategoryLabel(category) {
  return contentCategoryMeta(category).label
}

function trim(value) {
  return String(value ?? '').trim()
}

function normalizeIsoDate(value) {
  const raw = trim(value)
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toISOString()
}

function normalizeMedia(entry = {}, index = 0) {
  if (!entry) return null
  const type = entry.type === 'video' ? 'video' : 'image'
  const url = trim(entry.url)
  if (!url) return null
  return {
    type,
    url,
    legende: trim(entry.legende),
    ordre: Number.isFinite(Number(entry.ordre)) ? Number(entry.ordre) : index,
  }
}

export function normalizeContentPage(input = {}, { id } = {}) {
  const nextId = trim(id || input.id)
  if (!nextId) throw new Error('Identifiant de page requis')

  const categorie = CONTENT_CATEGORY_IDS.has(input.categorie) ? input.categorie : 'autre'
  const titre = trim(input.titre)
  if (!titre) throw new Error('Le titre est requis')

  const medias = (Array.isArray(input.medias) ? input.medias : [])
    .map((entry, index) => normalizeMedia(entry, index))
    .filter(Boolean)
    .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))

  return {
    id: nextId,
    categorie,
    titre,
    corps: String(input.corps ?? ''),
    medias,
    ordre: Number.isFinite(Number(input.ordre)) ? Number(input.ordre) : 0,
    publie: input.publie !== false,
    createdAt: normalizeIsoDate(input.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function sortContentPages(pages = []) {
  return [...pages].sort((a, b) => {
    const categoryDiff =
      CONTENT_CATEGORIES.findIndex((entry) => entry.id === a.categorie) -
      CONTENT_CATEGORIES.findIndex((entry) => entry.id === b.categorie)
    if (categoryDiff !== 0) return categoryDiff
    const orderDiff = (a.ordre || 0) - (b.ordre || 0)
    if (orderDiff !== 0) return orderDiff
    return (a.titre || '').localeCompare(b.titre || '', 'fr')
  })
}

export function filterPublishedPages(pages = []) {
  return sortContentPages(pages.filter((page) => page.publie !== false))
}

export function groupPagesByCategory(pages = []) {
  const grouped = new Map()
  for (const page of filterPublishedPages(pages)) {
    if (!grouped.has(page.categorie)) grouped.set(page.categorie, [])
    grouped.get(page.categorie).push(page)
  }
  return CONTENT_CATEGORIES.filter((category) => grouped.has(category.id)).map((category) => ({
    ...category,
    pages: grouped.get(category.id),
  }))
}
