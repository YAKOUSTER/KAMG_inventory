import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeContentPage } from '../src/domain/content.js'
import { SUPERSEDED_BY_GLIDE_IMPORT } from './glideSujetsImport.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const MEMBER_CONTENT_VERSION = 9

/** Anciennes pages du jeu d'exemple remplacées par member-pages.json */
export const LEGACY_SUPERSEDED_PAGE_IDS = new Set([
  'page-presentation',
  'page-coiffe',
  'page-vocab-brago',
])

export { SUPERSEDED_BY_GLIDE_IMPORT }

export async function readMemberPagesSeed(options = {}) {
  const base = options.dataDir || path.resolve(__dirname, '../data')
  const memberPagesPath = options.memberPagesPath || path.join(base, 'member-pages.json')
  const seedPath = options.seedPath || path.join(base, 'seed.json')
  try {
    const raw = JSON.parse(await readFile(memberPagesPath, 'utf8'))
    if (Array.isArray(raw.pages) && raw.pages.length) return raw.pages
  } catch {
    /* fallback seed */
  }
  try {
    const seed = JSON.parse(await readFile(seedPath, 'utf8'))
    return Array.isArray(seed.pages) ? seed.pages : []
  } catch {
    return []
  }
}

export function normalizeMemberPages(pages = []) {
  return pages
    .map((page) => {
      if (!page?.id) return null
      try {
        return normalizeContentPage(page, { id: page.id })
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export function upsertMemberPage(existing, seed) {
  const seedMedias = seed.medias || []
  const existingMedias = existing.medias || []
  const medias = seedMedias.length > 0 ? seedMedias : existingMedias

  const seedCorps = String(seed.corps ?? '').trim()
  const existingCorps = String(existing.corps ?? '').trim()
  const corps =
    seedCorps.length >= existingCorps.length ? seed.corps : existing.corps

  const seedCover = seed.couverture
  const existingCover = existing.couverture
  const couverture = seedCover?.url ? seedCover : existingCover

  return normalizeContentPage(
    {
      ...existing,
      ...seed,
      corps,
      medias,
      couverture,
      createdAt: existing.createdAt || seed.createdAt,
    },
    { id: seed.id },
  )
}

export function mergeMemberPages(existingPages = [], seedPages = []) {
  const byId = new Map(existingPages.map((page) => [page.id, page]))
  for (const page of normalizeMemberPages(seedPages)) {
    const current = byId.get(page.id)
    byId.set(page.id, current ? upsertMemberPage(current, page) : page)
  }
  return [...byId.values()]
}

export function removeLegacyMemberPages(pages = []) {
  return pages.filter(
    (page) => !LEGACY_SUPERSEDED_PAGE_IDS.has(page.id) && !SUPERSEDED_BY_GLIDE_IMPORT.has(page.id),
  )
}

export function shouldImportMemberContent(db) {
  const version = Number(db.meta?.memberContentVersion || 0)
  return version < MEMBER_CONTENT_VERSION
}

export function applyMemberContent(db, seedPages = []) {
  const normalized = normalizeMemberPages(seedPages)
  if (!normalized.length) return false

  const merged = mergeMemberPages(removeLegacyMemberPages(db.pages || []), normalized)
  db.pages = merged
  db.meta = {
    ...(db.meta || {}),
    memberContentVersion: MEMBER_CONTENT_VERSION,
  }
  return true
}
