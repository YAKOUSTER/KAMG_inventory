import { normalizeMediaUrl } from './mediaUrls.js'

export const CONTENT_CATEGORIES = [
  { id: 'newsletter', label: 'Actualité du groupe', icon: 'mdi-bullhorn-outline' },
  { id: 'vie_associative', label: 'Découvrir la vie associative', icon: 'mdi-account-heart-outline' },
  { id: 'commencer_danse', label: 'Commencer la danse', icon: 'mdi-human-female-dance' },
  { id: 'terroir', label: 'Notre terroir', icon: 'mdi-map-outline' },
  { id: 'culture_collectage', label: 'Culture et collectage', icon: 'mdi-music-clef-treble' },
  { id: 'tuto_coiffure', label: 'Tuto coiffure', icon: 'mdi-face-woman-shimmer' },
  { id: 'autre', label: 'Autre', icon: 'mdi-file-document-outline' },
]

const CONTENT_CATEGORY_IDS = new Set(CONTENT_CATEGORIES.map((entry) => entry.id))

const CATEGORY_ALIASES = {
  presentation: 'vie_associative',
  tuto_habillage: 'terroir',
  vocabulaire: 'culture_collectage',
}

const PAGE_CATEGORY_BY_ID = {
  'page-bienvenue': 'vie_associative',
  'page-inscription': 'vie_associative',
  'page-communication': 'vie_associative',
  'page-fournitures-danseurs': 'commencer_danse',
  'page-fournitures-danseuses': 'commencer_danse',
  'page-mener-animation': 'commencer_danse',
  'page-pays-glazig': 'terroir',
  'page-costume-petit-dimanche': 'terroir',
  'page-costume-velour': 'terroir',
  'page-liste-danses': 'culture_collectage',
  'page-ridee-6-temps': 'culture_collectage',
  'page-pile-menu': 'culture_collectage',
  'page-rond-pagan': 'culture_collectage',
}

const PAGE_ORDER_BY_ID = {
  'page-bienvenue': 1,
  'page-inscription': 2,
  'page-communication': 3,
  'page-fournitures-danseurs': 1,
  'page-fournitures-danseuses': 2,
  'page-mener-animation': 3,
  'page-pays-glazig': 1,
  'page-costume-petit-dimanche': 2,
  'page-costume-velour': 3,
  'page-liste-danses': 1,
  'page-ridee-6-temps': 2,
  'page-pile-menu': 3,
  'page-rond-pagan': 4,
}

function foldLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function categoryFromTitle(titre) {
  const text = foldLabel(titre)
  if (!text) return ''
  if (text.includes('bienvenue')) return 'vie_associative'
  if (text.includes('inscrire')) return 'vie_associative'
  if (text.includes('communication')) return 'vie_associative'
  if (text.includes('danseur') && text.includes('fourniture')) return 'commencer_danse'
  if (text.includes('danseuse') && text.includes('fourniture')) return 'commencer_danse'
  if (text.includes('animation')) return 'commencer_danse'
  if (text.includes('glazig') || text.includes('glazik')) return 'terroir'
  if (text.includes('petit dimanche') || text.includes('petits dimanche')) return 'terroir'
  if (text.includes('velour')) return 'terroir'
  if (text.includes('liste des danses')) return 'culture_collectage'
  if (text.includes('ridee') && text.includes('6')) return 'culture_collectage'
  if (text.includes('pile')) return 'culture_collectage'
  if (text.includes('pagan')) return 'culture_collectage'
  return ''
}

export function resolveContentCategory(input = {}) {
  const id = String(input.id || '').trim()
  if (PAGE_CATEGORY_BY_ID[id]) return PAGE_CATEGORY_BY_ID[id]
  const fromTitle = categoryFromTitle(input.titre)
  if (fromTitle) return fromTitle
  const raw = String(input.categorie || '').trim()
  if (CATEGORY_ALIASES[raw]) return CATEGORY_ALIASES[raw]
  if (CONTENT_CATEGORY_IDS.has(raw)) return raw
  return 'autre'
}

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

  const titre = trim(input.titre)
  if (!titre) throw new Error('Le titre est requis')
  const categorie = resolveContentCategory({ id: nextId, titre, categorie: input.categorie })

  const medias = (Array.isArray(input.medias) ? input.medias : [])
    .map((entry, index) => normalizeMedia(entry, index))
    .filter(Boolean)
    .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))

  const ordre =
    PAGE_ORDER_BY_ID[nextId] != null
      ? PAGE_ORDER_BY_ID[nextId]
      : Number.isFinite(Number(input.ordre))
        ? Number(input.ordre)
        : 0

  return {
    id: nextId,
    categorie,
    titre,
    corps: String(input.corps ?? ''),
    couverture: normalizeMedia(input.couverture, 0),
    medias,
    ordre,
    publie: input.publie !== false,
    datePublication: normalizeIsoDate(input.datePublication) || normalizeIsoDate(input.createdAt) || new Date().toISOString(),
    createdAt: normalizeIsoDate(input.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function sortContentPages(pages = []) {
  return [...pages].sort((a, b) => {
    const catA = resolveContentCategory(a)
    const catB = resolveContentCategory(b)
    const categoryDiff =
      CONTENT_CATEGORIES.findIndex((entry) => entry.id === catA) -
      CONTENT_CATEGORIES.findIndex((entry) => entry.id === catB)
    if (categoryDiff !== 0) return categoryDiff
    if (catA === 'newsletter' && catB === 'newsletter') {
      return String(b.datePublication || b.createdAt || '').localeCompare(
        String(a.datePublication || a.createdAt || ''),
      )
    }
    const orderA = PAGE_ORDER_BY_ID[a.id] ?? a.ordre ?? 0
    const orderB = PAGE_ORDER_BY_ID[b.id] ?? b.ordre ?? 0
    const orderDiff = orderA - orderB
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
  let imageIndex = 0

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
    const images = attached.filter((media) => media.type === 'image')
    return {
      heading: block.heading,
      lines: hasEmbed ? block.lines.filter((line) => line.kind !== 'video') : block.lines,
      images,
      videos: attached.filter((media) => media.type !== 'image'),
      imageSide: images.length ? (imageIndex++ % 2 === 0 ? 'right' : 'left') : null,
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
    datePublication: page.datePublication || page.createdAt || '',
    publie: true,
  }
}

export function circleNewsPages(pages = [], { limit = 3 } = {}) {
  return filterPublishedPages(pages)
    .filter((page) => page.categorie === 'newsletter')
    .sort((a, b) =>
      String(b.datePublication || b.createdAt || '').localeCompare(String(a.datePublication || a.createdAt || '')),
    )
    .slice(0, limit)
}

export function groupPagesByCategory(pages = []) {
  const grouped = new Map()
  for (const page of filterPublishedPages(pages)) {
    const categorie = resolveContentCategory(page)
    if (!grouped.has(categorie)) grouped.set(categorie, [])
    grouped.get(categorie).push(page)
  }
  return CONTENT_CATEGORIES.filter((category) => grouped.has(category.id)).map((category) => ({
    ...category,
    pages: grouped.get(category.id),
  }))
}
