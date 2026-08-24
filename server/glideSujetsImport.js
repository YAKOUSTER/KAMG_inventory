/** Import des sujets Glide (export CSV) vers les pages espace membres. */

import {
  mediaKind as resolveMediaKind,
  normalizeMediaUrl,
  youtubeEmbedUrl,
} from '../src/domain/mediaUrls.js'

const PAGE_ID_BY_TITLE = {
  Bienvenue: 'page-bienvenue',
  "Comment s'inscrire ?": 'page-inscription',
  'Danseurs : fournitures': 'page-fournitures-danseurs',
  'Danseuses : fournitures': 'page-fournitures-danseuses',
  'Nos outils de communication': 'page-communication',
  'Le Pays Glazig': 'page-pays-glazig',
  'Le costume de "Petit dimanche"': 'page-costume-petit-dimanche',
  'Le costume velour 1935-1938': 'page-costume-velour',
  'Spectacle 2024': 'page-spectacle-2024',
  'Rond de Pagan': 'page-rond-pagan',
  'Pilé-Menu': 'page-pile-menu',
  'Ridée 6 temps': 'page-ridee-6-temps',
  'Tableau excel': 'page-sorties-excel',
  'Mener une animation': 'page-mener-animation',
  'Liste des danses': 'page-liste-danses',
  'Check-List spectacle': 'page-checklist-spectacle',
}

const CATEGORY_BY_TYPE = {
  'Commencer la danse': 'commencer_danse',
  'Le vêtement et les coiffures': 'tuto_habillage',
  'Danses et chants': 'vocabulaire',
  'La saison 2023-2024': 'newsletter',
  'Prendre des responsabilités': 'autre',
}

/** Pages remplacées par l’import CSV (listes danse éclatées, doublons). */
export const SUPERSEDED_BY_GLIDE_IMPORT = new Set([
  'page-kenlieur',
  'page-notre-cercle',
  'page-groupes',
  'page-cercles-quimper',
  'page-ca',
  'page-sorties',
  'page-coiffure',
  'page-danses-branles',
  'page-danses-suites',
  'page-danses-corteges',
  'page-vocab-costume',
  'page-themes-dates',
  'page-sorties-excel',
])

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function pageIdForRow(row) {
  const titre = trim(row.Titre)
  if (PAGE_ID_BY_TITLE[titre]) return PAGE_ID_BY_TITLE[titre]
  const rowId = trim(row['🔒 Row ID'] || row['Row ID'])
  if (rowId) return `page-glide-${slugify(rowId)}`
  return `page-glide-${slugify(titre)}`
}

export function categoryForRow(row) {
  const type = trim(row['Types de sujets'])
  const mapping = CATEGORY_BY_TYPE[type]
  if (typeof mapping === 'string') return mapping
  return 'autre'
}

function trim(value) {
  return String(value ?? '').trim()
}

export function normalizeGlideMediaUrl(raw) {
  return normalizeMediaUrl(raw)
}

export function mediaKind(url) {
  return resolveMediaKind(url)
}

function pushMedia(medias, seen, rawUrl, legende = '') {
  const kind = resolveMediaKind(rawUrl)
  const url =
    kind === 'youtube' ? youtubeEmbedUrl(rawUrl) : normalizeMediaUrl(rawUrl)
  if (!url || seen.has(url)) return
  seen.add(url)
  medias.push({
    type: kind === 'youtube' ? 'youtube' : kind,
    url,
    legende: trim(legende),
    ordre: medias.length,
  })
}

export function buildCorpsFromRow(row) {
  const parts = []
  const sousTitre = trim(row['Sous-titre'])
  const description = trim(row.Description)
  const mainLink = trim(row['LIEN 1 PRINCIPAL'])

  if (sousTitre) parts.push(sousTitre)
  if (description) parts.push(description)
  if (mainLink) parts.push(`Lien : ${mainLink}`)

  for (let zone = 1; zone <= 8; zone += 1) {
    const subtitle = trim(row[`Zone ${zone} : Sous-titre`])
    const paragraph = trim(row[`Zone ${zone} : Paragraphe`] || row[`Zone ${zone} : paragraphe`])
    const link = trim(row[`Zone ${zone} : Lien`])
    const video = trim(row[`Zone ${zone} : vidéo`])

    if (!subtitle && !paragraph && !link && !video) continue

    if (subtitle) parts.push(`\n## ${subtitle}`)
    if (paragraph) parts.push(paragraph)
    if (video) parts.push(`Vidéo : ${video}`)
    if (link) parts.push(`Lien : ${link}`)
  }

  return parts.join('\n\n').trim()
}

export function buildCouvertureFromRow(row) {
  const medias = []
  const seen = new Set()
  pushMedia(medias, seen, row.Photo, trim(row.Titre))
  return medias[0] || null
}

export function buildMediasFromRow(row) {
  const medias = []
  const seen = new Set()

  for (let zone = 1; zone <= 8; zone += 1) {
    const subtitle = trim(row[`Zone ${zone} : Sous-titre`])
    pushMedia(medias, seen, row[`Zone ${zone} : Image`], subtitle)
    pushMedia(medias, seen, row[`Zone ${zone} : vidéo`], subtitle)
  }

  for (let index = 1; index <= 24; index += 1) {
    pushMedia(medias, seen, row[`Image ${index}`])
  }

  return medias
}

export function shouldSkipGlideRow(row) {
  const type = trim(row['Types de sujets'])
  const titre = trim(row.Titre)
  return type === "S'inscrire aux sorties de l'année" || titre === 'Tableau excel'
}

export function rowToContentPage(row, { ordre = 0 } = {}) {
  const titre = trim(row.Titre)
  if (!titre || shouldSkipGlideRow(row)) return null

  return {
    id: pageIdForRow(row),
    categorie: categoryForRow(row),
    titre,
    ordre,
    publie: true,
    corps: buildCorpsFromRow(row),
    couverture: buildCouvertureFromRow(row),
    medias: buildMediasFromRow(row),
  }
}

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(field)
      field = ''
      if (row.some((cell) => trim(cell))) rows.push(row)
      row = []
      if (char === '\r') index += 1
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field.length || row.length) {
    row.push(field)
    if (row.some((cell) => trim(cell))) rows.push(row)
  }

  if (!rows.length) return []

  const headers = rows[0].map((header) => trim(header))
  return rows.slice(1).map((cells) => {
    const record = {}
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? ''
    })
    return record
  })
}

export function importGlideSujetsCsv(csvText) {
  const records = parseCsv(csvText)
  const pages = []
  const ordreByCategory = new Map()

  for (const record of records) {
    const categorie = categoryForRow(record)
    const ordre = (ordreByCategory.get(categorie) || 0) + 1
    ordreByCategory.set(categorie, ordre)
    const page = rowToContentPage(record, { ordre })
    if (page) pages.push(page)
  }

  return pages
}
