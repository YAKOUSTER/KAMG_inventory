import { normalizeMediaUrl } from './mediaUrls.js'

export const CONTENT_CATEGORIES = [
  { id: 'commencer_danse', label: 'Commencer la danse', icon: 'mdi-human-female-dance' },
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
  const rawType = trim(entry.type)
  const type =
    rawType === 'youtube' ? 'youtube' : rawType === 'video' ? 'video' : 'image'
  const url = type === 'youtube' ? trim(entry.url) : normalizeMediaUrl(entry.url)
  if (!url) return null
  return {
    type,
    url,
    legende: trim(entry.legende),
    ordre: Number.isFinite(Number(entry.ordre)) ? Number(entry.ordre) : index,
  }
}

export function contentCoverMedia(page) {
  if (!page) return null
  const cover = normalizeMedia(page.couverture, 0)
  if (cover) return cover
  return (page.medias || []).find((media) => media.type === 'image') || null
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
    couverture: normalizeMedia(input.couverture, 0),
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

function parseLine(raw) {
  const text = String(raw || '').trim()
  if (!text) return null
  const linkMatch = text.match(/^Lien\s*:\s*(https?:\/\/\S+)/i)
  if (linkMatch) {
    return { kind: 'link', url: linkMatch[1], label: linkMatch[1] }
  }
  const videoMatch = text.match(/^Vidéo\s*:\s*(https?:\/\/\S+)/i)
  if (videoMatch) {
    return { kind: 'video', url: videoMatch[1] }
  }
  if (/^https?:\/\/\S+$/.test(text)) {
    return { kind: 'link', url: text, label: text }
  }
  return { kind: 'text', text }
}

export function parseContentBlocks(corps) {
  return String(corps || '')
    .split(/\n(?=## )/)
    .map((chunk) => {
      const trimmed = chunk.trim()
      if (!trimmed) return null
      const headingMatch = trimmed.match(/^## (.+?)(?:\n([\s\S]*))?$/)
      if (headingMatch) {
        return {
          heading: headingMatch[1].trim(),
          lines: (headingMatch[2] || '').split('\n').map(parseLine).filter(Boolean),
        }
      }
      return {
        heading: '',
        lines: trimmed.split('\n').map(parseLine).filter(Boolean),
      }
    })
    .filter(Boolean)
}

function headingKey(value) {
  return String(value || '').trim().toLowerCase()
}

/** Associe chaque image/vidéo de zone (légende = sous-titre CSV) à son paragraphe. */
export function articleLayout(page) {
  const coverUrl = contentCoverMedia(page)?.url
  const medias = (page.medias || []).filter((media) => media.url !== coverUrl)
  const used = new Set()

  const sections = parseContentBlocks(page?.corps).map((block) => {
    const attached = []
    if (block.heading) {
      const key = headingKey(block.heading)
      for (const media of medias) {
        if (used.has(media.url)) continue
        if (headingKey(media.legende) === key) {
          attached.push(media)
          used.add(media.url)
        }
      }
    }
    const hasEmbed = attached.some((media) => media.type === 'youtube' || media.type === 'video')
    return {
      heading: block.heading,
      lines: hasEmbed ? block.lines.filter((line) => line.kind !== 'video') : block.lines,
      images: attached.filter((media) => media.type === 'image'),
      videos: attached.filter((media) => media.type !== 'image'),
    }
  })

  return {
    sections,
    gallery: medias.filter((media) => !used.has(media.url)),
  }
}

export function contentExcerpt(corps, max = 180) {
  const text = String(corps || '')
    .replace(/^## .+$/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

export function publicContentSummary(page) {
  if (!page?.id || page.publie === false) return null
  return {
    id: page.id,
    categorie: page.categorie,
    titre: page.titre,
    excerpt: contentExcerpt(page.corps),
    couverture: page.couverture || null,
    ordre: page.ordre || 0,
    publie: true,
  }
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
