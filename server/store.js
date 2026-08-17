import { mkdir, readFile, writeFile, copyFile, access, rename } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { DEFAULT_REFERENTIELS } from '../src/domain/taxonomy.js'
import { normalizeReferentiels, validateReferentiels, categoryIds } from '../src/domain/referentiels.js'
import { isLoanable, normalizeItem } from '../src/domain/item.js'
import { appendStockMovement, countLowStock } from '../src/domain/stock.js'
import { applyReturnUpdate, countOpenTasks } from '../src/domain/itemTasks.js'
import { ROLE_PRESETS, can, publicUser } from '../src/domain/auth.js'
import { groupLoansByYear, normalizePerson, personDisplayName } from '../src/domain/person.js'
import { todayLocal, formatDate } from '../src/domain/dates.js'
import { hashPassword, randomToken, verifyPassword } from './password.js'
import {
  appendAudit,
  codesForItems,
  itemLabel,
  loanLabel,
  personLabel,
  userLabel,
} from './audit.js'
import { runDomain } from './errors.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveDataDir() {
  return process.env.KAMG_DATA_DIR
    ? path.resolve(process.env.KAMG_DATA_DIR)
    : path.resolve(__dirname, '../data')
}

export function dataPaths(options = {}) {
  const base = options.dataDir || resolveDataDir()
  return {
    dataDir: base,
    seedPath: options.seedPath || path.join(base, 'seed.json'),
    dbPath: options.dbPath || path.join(base, 'db.json'),
    uploadsDir: options.uploadsDir || path.join(base, 'uploads'),
  }
}

export const DATA_DIR = resolveDataDir()
export const SEED_PATH = path.join(DATA_DIR, 'seed.json')
export const DB_PATH = path.join(DATA_DIR, 'db.json')
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function emptyDb() {
  return {
    meta: { version: 1, updatedAt: new Date().toISOString() },
    referentiels: structuredClone(DEFAULT_REFERENTIELS),
    items: [],
    people: [],
    loans: [],
    users: [],
    sessions: [],
    auditLog: [],
  }
}

function ensureShape(raw) {
  const db = emptyDb()
  if (!raw || typeof raw !== 'object') return db
  db.meta = { ...db.meta, ...(raw.meta || {}) }
  db.referentiels = normalizeReferentiels({ ...DEFAULT_REFERENTIELS, ...(raw.referentiels || {}) })
  db.items = Array.isArray(raw.items) ? raw.items : []
  db.people = Array.isArray(raw.people) ? raw.people : []
  db.loans = Array.isArray(raw.loans) ? raw.loans : []
  db.users = Array.isArray(raw.users) ? raw.users : []
  db.sessions = Array.isArray(raw.sessions) ? raw.sessions : []
  db.auditLog = Array.isArray(raw.auditLog) ? raw.auditLog : []
  return db
}

async function exists(file) {
  try {
    await access(file, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const cacheByPath = new Map()
const ensureByPath = new Map()

export async function ensureDb(options = {}) {
  const paths = dataPaths(options)
  const { seedPath, dbPath, uploadsDir } = paths
  if (cacheByPath.has(dbPath)) return
  if (ensureByPath.has(dbPath)) {
    await ensureByPath.get(dbPath)
    return
  }
  const job = (async () => {
    await mkdir(path.dirname(dbPath), { recursive: true })
    await mkdir(uploadsDir, { recursive: true })
    if (!(await exists(dbPath))) {
      if (await exists(seedPath)) {
        await copyFile(seedPath, dbPath)
      } else {
        await writeJson(dbPath, emptyDb())
      }
    }
    const db = ensureShape(await readJson(dbPath))
    let dirty = false
    if (!db.users.length) {
      db.users = await defaultUsers()
      dirty = true
    }
    if (!Array.isArray(db.sessions)) {
      db.sessions = []
      dirty = true
    }
    if (!Array.isArray(db.auditLog)) {
      db.auditLog = []
      dirty = true
    }
    if (dirty) await writeJson(dbPath, db)
    cacheByPath.set(dbPath, db)
  })()
  ensureByPath.set(dbPath, job)
  try {
    await job
  } catch (error) {
    ensureByPath.delete(dbPath)
    throw error
  }
}

async function readJson(file) {
  const text = await readFile(file, 'utf8')
  return JSON.parse(text)
}

async function writeJson(file, data) {
  const tmp = `${file}.tmp`
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  await rename(tmp, file)
}

let queue = Promise.resolve()

export function resetStoreCache() {
  cacheByPath.clear()
  ensureByPath.clear()
  queue = Promise.resolve()
}

function enqueue(task) {
  const run = queue.then(task, task)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function readDb(options = {}) {
  const dbPath = options.dbPath || dataPaths(options).dbPath
  if (!cacheByPath.has(dbPath)) await ensureDb(options)
  return cacheByPath.get(dbPath)
}

export async function writeDb(db, options = {}) {
  const dbPath = options.dbPath || dataPaths(options).dbPath
  db.meta = { ...(db.meta || {}), version: 1, updatedAt: new Date().toISOString() }
  await writeJson(dbPath, db)
  cacheByPath.set(dbPath, db)
  return db
}

export function withDb(mutator, options = {}) {
  return enqueue(async () => {
    const db = structuredClone(await readDb(options))
    const result = await mutator(db)
    await writeDb(db, options)
    return result
  })
}

export async function exportDb(options = {}) {
  const db = await readDb(options)
  return { ...db, sessions: [] }
}

export async function importDb(payload, options = {}) {
  const current = await readDb(options)
  const db = ensureShape(payload)
  if (!db.users.length && current.users.length) {
    db.users = current.users
  }
  db.sessions = current.sessions || []
  db.auditLog = Array.isArray(current.auditLog) ? current.auditLog : []
  appendAudit(db, options.actor, {
    action: 'db.import',
    entityType: 'db',
    entityId: 'db',
    entityLabel: 'Base JSON',
    summary: `Import de la base (${db.items.length} pièce(s), ${db.people.length} personne(s), ${db.loans.length} emprunt(s))`,
    meta: {
      counts: { items: db.items.length, people: db.people.length, loans: db.loans.length },
    },
  })
  await writeDb(db, options)
  return db
}

export async function listAudit(query = {}, options = {}) {
  const db = await readDb(options)
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const entries = (db.auditLog || []).filter((entry) => {
    if (query.action && entry.action !== query.action) return false
    if (query.entityType && entry.entityType !== query.entityType) return false
    return true
  })
  return {
    total: entries.length,
    entries: entries.slice(offset, offset + limit),
  }
}

export async function listItems(options = {}) {
  const db = await readDb(options)
  return db.items
}

export async function getItem(id, options = {}) {
  const db = await readDb(options)
  const item = db.items.find((i) => i.id === id)
  if (!item) return null
  const linked = db.items.filter((i) => item.linkedItemIds?.includes(i.id) || i.linkedItemIds?.includes(item.id))
  const history = db.loans
    .filter((loan) => loan.items?.some((li) => li.itemId === id))
    .map((loan) => {
      const person = db.people.find((p) => p.id === loan.personId)
      const line = loan.items.find((li) => li.itemId === id)
      return {
        loanId: loan.id,
        titre: loan.titre,
        personName: personDisplayName(person),
        dateEmprunt: loan.dateEmprunt,
        dateRetour: line?.returnedAt || loan.dateRetour,
        comment: line?.comment || '',
        statut: loan.statut,
      }
    })
  return { ...item, linkedItems: linked.filter((i) => i.id !== id), loanHistory: history, photoSource: photoSourceSummary(db, item) }
}

function photoSourceSummary(db, item) {
  const sourceId = String(item.photoSourceId || '').trim()
  if (!sourceId || sourceId === item.id) return null
  const source = db.items.find((i) => i.id === sourceId)
  if (!source) return null
  return { id: source.id, code: source.code, nom: source.nom }
}

function referentielCategoryIds(db) {
  return categoryIds(db.referentiels)
}

export async function createItem(payload, options = {}) {
  return withDb((db) => {
    const item = runDomain(normalizeItem, payload, {
      id: randomUUID(),
      categoryIds: referentielCategoryIds(db),
    })
    if (db.items.some((i) => i.code.toLowerCase() === item.code.toLowerCase())) {
      throw Object.assign(new Error(`Le code ${item.code} existe déjà`), { status: 409 })
    }
    db.items.push(item)
    appendAudit(db, options.actor, {
      action: 'item.create',
      entityType: 'item',
      entityId: item.id,
      entityLabel: itemLabel(item),
      summary: `Création de la pièce ${itemLabel(item)}`,
    })
    return item
  }, options)
}

export async function updateItem(id, payload, options = {}) {
  return withDb((db) => {
    const index = db.items.findIndex((i) => i.id === id)
    if (index === -1) throw Object.assign(new Error('Pièce introuvable'), { status: 404 })
    const item = runDomain(normalizeItem, { ...db.items[index], ...payload, id }, {
      id,
      categoryIds: referentielCategoryIds(db),
    })
    const clash = db.items.find((i) => i.id !== id && i.code.toLowerCase() === item.code.toLowerCase())
    if (clash) throw Object.assign(new Error(`Le code ${item.code} existe déjà`), { status: 409 })
    db.items[index] = item
    appendAudit(db, options.actor, {
      action: 'item.update',
      entityType: 'item',
      entityId: item.id,
      entityLabel: itemLabel(item),
      summary: `Modification de la pièce ${itemLabel(item)}`,
    })
    return item
  }, options)
}

export async function adjustStock(id, payload, options = {}) {
  return withDb((db) => {
    const index = db.items.findIndex((i) => i.id === id)
    if (index === -1) throw Object.assign(new Error('Pièce introuvable'), { status: 404 })
    const current = db.items[index]
    if (current.categorie !== 'fourniture' && current.categorie !== 'tissu') {
      throw Object.assign(new Error('Le stock ne concerne que les tissus et fournitures'), { status: 400 })
    }
    const motif = String(payload?.motif || '').trim()
    let delta = Number(payload?.delta)
    if (payload?.quantite != null && payload?.quantite !== '') {
      delta = Number(payload.quantite) - (Number(current.stockQuantite) || 0)
    }
    if (!delta) throw Object.assign(new Error('Indiquez une quantité à ajouter ou retirer'), { status: 400 })
    const item = runDomain(normalizeItem, { ...current }, { id, categoryIds: referentielCategoryIds(db) })
    appendStockMovement(item, {
      delta,
      motif,
      auteur: options.actor?.nom || options.actor?.login || '',
    })
    db.items[index] = item
    appendAudit(db, options.actor, {
      action: 'stock.adjust',
      entityType: 'item',
      entityId: item.id,
      entityLabel: itemLabel(item),
      summary: `Stock ${item.code} : ${delta > 0 ? '+' : ''}${delta} → ${formatStockSummary(item)}`,
      meta: { delta, quantiteApres: item.stockQuantite, motif },
    })
    return item
  }, options)
}

function formatStockSummary(item) {
  const qty = Number(item.stockQuantite) || 0
  const unit = item.stockUnite || 'pièce'
  return `${qty} ${unit}`
}

export async function deleteItem(id, options = {}) {
  return withDb((db) => {
    const index = db.items.findIndex((i) => i.id === id)
    if (index === -1) throw Object.assign(new Error('Pièce introuvable'), { status: 404 })
    const activeLoan = db.loans.find(
      (loan) => loan.statut !== 'retourne' && loan.items?.some((li) => li.itemId === id && !li.returnedAt),
    )
    if (activeLoan) {
      throw Object.assign(new Error('Impossible de supprimer une pièce actuellement empruntée'), { status: 409 })
    }
    const photoSourceFor = db.items.filter((item) => item.photoSourceId === id)
    if (photoSourceFor.length) {
      const codes = photoSourceFor.map((item) => item.code).join(', ')
      throw Object.assign(
        new Error(`Impossible de supprimer cette fiche : photos par défaut pour ${codes}`),
        { status: 409 },
      )
    }
    const [removed] = db.items.splice(index, 1)
    db.items.forEach((item) => {
      item.linkedItemIds = (item.linkedItemIds || []).filter((x) => x !== id)
    })
    appendAudit(db, options.actor, {
      action: 'item.delete',
      entityType: 'item',
      entityId: removed.id,
      entityLabel: itemLabel(removed),
      summary: `Suppression de la pièce ${itemLabel(removed)}`,
    })
    return removed
  }, options)
}

export async function listPeople(options = {}) {
  const db = await readDb(options)
  return db.people
}

export async function getPerson(id, options = {}) {
  const db = await readDb(options)
  const person = db.people.find((p) => p.id === id)
  if (!person) return null
  const loans = db.loans
    .filter((loan) => loan.personId === id)
    .map((loan) => decorateLoan(loan, db))
    .sort((a, b) => (b.dateEmprunt || '').localeCompare(a.dateEmprunt || ''))
  return {
    ...person,
    loans,
    loansByYear: groupLoansByYear(loans),
  }
}

export async function createPerson(payload, options = {}) {
  return withDb((db) => {
    const person = runDomain(normalizePerson, payload, { id: randomUUID() })
    db.people.push(person)
    appendAudit(db, options.actor, {
      action: 'person.create',
      entityType: 'person',
      entityId: person.id,
      entityLabel: personLabel(person),
      summary: `Création de la personne ${personLabel(person)}`,
    })
    return person
  }, options)
}

export async function updatePerson(id, payload, options = {}) {
  return withDb((db) => {
    const index = db.people.findIndex((p) => p.id === id)
    if (index === -1) throw Object.assign(new Error('Personne introuvable'), { status: 404 })
    const person = runDomain(normalizePerson, { ...db.people[index], ...payload, id }, { id })
    db.people[index] = person
    appendAudit(db, options.actor, {
      action: 'person.update',
      entityType: 'person',
      entityId: person.id,
      entityLabel: personLabel(person),
      summary: `Modification de la personne ${personLabel(person)}`,
    })
    return person
  }, options)
}

export async function deletePerson(id, options = {}) {
  return withDb((db) => {
    const index = db.people.findIndex((p) => p.id === id)
    if (index === -1) throw Object.assign(new Error('Personne introuvable'), { status: 404 })
    const used = db.loans.some((loan) => loan.personId === id)
    if (used) throw Object.assign(new Error('Cette personne a des emprunts enregistrés'), { status: 409 })
    const [removed] = db.people.splice(index, 1)
    appendAudit(db, options.actor, {
      action: 'person.delete',
      entityType: 'person',
      entityId: removed.id,
      entityLabel: personLabel(removed),
      summary: `Suppression de la personne ${personLabel(removed)}`,
    })
    return removed
  }, options)
}

function decorateLoan(loan, db) {
  const person = db.people.find((p) => p.id === loan.personId)
  const items = (loan.items || []).map((line) => {
    const item = db.items.find((i) => i.id === line.itemId)
    return {
      ...line,
      code: item?.code,
      nom: item?.nom,
      type: item?.type,
      disponibilite: item?.disponibilite,
      etat: item?.etat,
      propre: item?.propre,
    }
  })
  return {
    ...loan,
    personName: personDisplayName(person),
    items,
  }
}

export async function listLoans(options = {}) {
  const db = await readDb(options)
  return db.loans
    .map((loan) => decorateLoan(loan, db))
    .sort((a, b) => (b.dateEmprunt || '').localeCompare(a.dateEmprunt || ''))
}

export async function getLoan(id, options = {}) {
  const db = await readDb(options)
  const loan = db.loans.find((l) => l.id === id)
  if (!loan) return null
  return decorateLoan(loan, db)
}

export async function createLoan(payload, options = {}) {
  return withDb((db) => {
    const person = db.people.find((p) => p.id === payload.personId)
    if (!person) throw Object.assign(new Error('Personne introuvable'), { status: 400 })
    const itemIds = (payload.items || []).map((i) => i.itemId || i.id)
    if (!itemIds.length) throw Object.assign(new Error('Le panier est vide'), { status: 400 })
    if (new Set(itemIds).size !== itemIds.length) {
      throw Object.assign(new Error('Le panier contient deux fois la même pièce'), { status: 400 })
    }
    const lines = []
    for (const itemId of itemIds) {
      const item = db.items.find((i) => i.id === itemId)
      if (!item) throw Object.assign(new Error('Pièce introuvable'), { status: 400 })
      if (!isLoanable(item)) {
        throw Object.assign(new Error(`${item.code} n'est pas disponible à l'emprunt`), { status: 409 })
      }
      const comment = (payload.items || []).find((i) => (i.itemId || i.id) === itemId)?.comment || ''
      item.disponibilite = 'Emprunté'
      item.updatedAt = new Date().toISOString()
      lines.push({ itemId, comment, returnedAt: null })
    }
    const loan = {
      id: randomUUID(),
      titre: (payload.titre || '').trim() || `Emprunt ${personDisplayName(person)}`,
      personId: person.id,
      dateEmprunt: payload.dateEmprunt || todayLocal(),
      dateRetourPrevue: payload.dateRetourPrevue || '',
      dateRetour: null,
      statut: 'en_cours',
      items: lines,
      createdAt: new Date().toISOString(),
    }
    db.loans.push(loan)
    appendAudit(db, options.actor, {
      action: 'loan.create',
      entityType: 'loan',
      entityId: loan.id,
      entityLabel: loanLabel(loan, person),
      summary: `Emprunt créé pour ${personLabel(person)} (${lines.length} pièce(s))`,
      meta: {
        personId: person.id,
        personName: personLabel(person),
        itemIds: lines.map((line) => line.itemId),
        itemCodes: codesForItems(db, lines.map((line) => line.itemId)),
      },
    })
    return decorateLoan(loan, db)
  }, options)
}

export async function returnLoanItems(loanId, itemIds, options = {}) {
  return withDb((db) => {
    const loan = db.loans.find((l) => l.id === loanId)
    if (!loan) throw Object.assign(new Error('Emprunt introuvable'), { status: 404 })
    const requested = itemIds?.length ? itemIds : loan.items.filter((i) => !i.returnedAt).map((i) => i.itemId)
    const targets = requested.filter((itemId) => {
      const line = loan.items.find((i) => i.itemId === itemId)
      return line && !line.returnedAt
    })
    if (!targets.length) {
      throw Object.assign(new Error('Aucune pièce à retourner'), { status: 400 })
    }
    const dateRetour = formatDate(options.dateRetour || todayLocal())
    for (const itemId of targets) {
      const line = loan.items.find((i) => i.itemId === itemId)
      if (!line || line.returnedAt) continue
      line.returnedAt = dateRetour
      const item = db.items.find((i) => i.id === itemId)
      if (item) {
        applyReturnUpdate(item, (options.updates || {})[itemId] || {}, {
          loanId,
          defaultPersonId: loan.personId,
        })
        item.updatedAt = new Date().toISOString()
      }
    }
    const remaining = loan.items.some((i) => !i.returnedAt)
    loan.statut = remaining ? 'retour_partiel' : 'retourne'
    loan.dateRetour = remaining ? null : dateRetour
    const person = db.people.find((p) => p.id === loan.personId)
    const returnedCodes = codesForItems(db, targets)
    appendAudit(db, options.actor, {
      action: remaining ? 'loan.return' : 'loan.return_all',
      entityType: 'loan',
      entityId: loan.id,
      entityLabel: loanLabel(loan, person),
      summary: remaining
        ? `Retour partiel sur ${loanLabel(loan, person)} (${returnedCodes.join(', ')})`
        : `Emprunt clôturé — ${loanLabel(loan, person)}`,
      meta: {
        itemIds: targets,
        itemCodes: returnedCodes,
        dateRetour,
        personId: loan.personId,
        personName: personLabel(person),
      },
    })
    return decorateLoan(loan, db)
  }, options)
}

function statsFrom(db) {
  const byCategory = db.items.reduce((acc, item) => {
    acc[item.categorie] = (acc[item.categorie] || 0) + 1
    return acc
  }, {})
  return {
    totalItems: db.items.length,
    byCategory,
    available: db.items.filter((i) => i.disponibilite === 'Disponible').length,
    borrowed: db.items.filter((i) => i.disponibilite === 'Emprunté').length,
    lowStock: countLowStock(db.items),
    openTasks: countOpenTasks(db.items),
    people: db.people.length,
    activeLoans: db.loans.filter((l) => l.statut !== 'retourne').length,
  }
}

export async function getStats(options = {}) {
  return statsFrom(await readDb(options))
}

export function publicSnapshot(db, user) {
  const loans = can(user, 'loans.read')
    ? db.loans
        .map((loan) => decorateLoan(loan, db))
        .sort((a, b) => (b.dateEmprunt || '').localeCompare(a.dateEmprunt || ''))
    : []
  return {
    items: can(user, 'items.read') ? db.items : [],
    people: can(user, 'people.read') ? db.people : [],
    loans,
    stats: can(user, 'items.read') ? statsFrom(db) : null,
    referentiels: normalizeReferentiels(db.referentiels),
  }
}

export async function getReferentiels(options = {}) {
  const db = await readDb(options)
  return normalizeReferentiels(db.referentiels)
}

export async function updateReferentiels(payload, options = {}) {
  return withDb((db) => {
    const next = validateReferentiels(payload, { items: db.items })
    db.referentiels = next
    appendAudit(db, options.actor, {
      action: 'referentiels.update',
      entityType: 'settings',
      entityId: 'referentiels',
      entityLabel: 'Listes de paramétrage',
      summary: 'Mise à jour des listes (catégories, époques, états…)',
    })
    return next
  }, options)
}

export async function getBootstrap(user, options = {}) {
  return publicSnapshot(await readDb(options), user)
}

function slug(value) {
  return String(value || 'photo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .toLowerCase() || 'photo'
}

const UPLOAD_MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
}

function uploadExtension(mimeType) {
  const mime = String(mimeType || '').toLowerCase().split(';')[0].trim()
  return UPLOAD_MIME_EXT[mime] || null
}

export async function saveUpload({ filename, dataUrl, prefix }, options = {}) {
  await mkdir(options.uploadsDir || dataPaths(options).uploadsDir, { recursive: true })
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '')
  if (!match) throw Object.assign(new Error('Fichier invalide'), { status: 400 })
  const safeExt = uploadExtension(match[1])
  if (!safeExt) {
    throw Object.assign(new Error('Type de fichier non pris en charge (JPG, PNG, WEBP, GIF, PDF)'), {
      status: 400,
    })
  }
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw Object.assign(new Error('Fichier trop volumineux (10 Mo max)'), { status: 413 })
  }
  const id = `${slug(prefix || filename)}-${Date.now()}-${randomUUID().slice(0, 6)}.${safeExt}`
  const dest = path.join(options.uploadsDir || dataPaths(options).uploadsDir, id)
  await writeFile(dest, buffer)
  const mimeType = match[1].toLowerCase()
  return { src: `/uploads/${id}`, filename: id, mimeType }
}

export { emptyDb, ensureShape }

const SESSION_MS = 30 * 24 * 60 * 60 * 1000

async function defaultUsers() {
  const now = new Date().toISOString()
  const specs = [
    { login: 'admin', nom: 'Administrateur', role: 'admin', password: 'admin' },
    { login: 'gestion', nom: 'Gestion', role: 'gestion', password: 'gestion' },
    { login: 'lecteur', nom: 'Lecture', role: 'lecteur', password: 'lecteur' },
  ]
  return Promise.all(
    specs.map(async (spec) => ({
      id: randomUUID(),
      login: spec.login,
      nom: spec.nom,
      role: spec.role,
      custom: false,
      permissions: [...ROLE_PRESETS[spec.role]],
      passwordHash: await hashPassword(spec.password),
      createdAt: now,
    })),
  )
}

export async function login(loginName, password, options = {}) {
  const identifiant = String(loginName || '').trim().toLowerCase()
  if (!identifiant || !password) {
    throw Object.assign(new Error('Identifiant et mot de passe requis'), { status: 400 })
  }
  return withDb(async (db) => {
    const user = db.users.find((u) => u.login.toLowerCase() === identifiant)
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw Object.assign(new Error('Identifiant ou mot de passe incorrect'), { status: 401 })
    }
    const token = randomToken()
    const now = Date.now()
    db.sessions = (db.sessions || []).filter((session) => new Date(session.expiresAt).getTime() > now)
    db.sessions.push({
      token,
      userId: user.id,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_MS).toISOString(),
    })
    return { token, user: publicUser(user), ...publicSnapshot(db, publicUser(user)) }
  }, options)
}

export async function logout(token, options = {}) {
  if (!token) return { ok: true }
  return withDb((db) => {
    db.sessions = (db.sessions || []).filter((session) => session.token !== token)
    return { ok: true }
  }, options)
}

export async function userFromToken(token, options = {}) {
  if (!token) return null
  const db = await readDb(options)
  const session = (db.sessions || []).find((s) => s.token === token)
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null
  const user = db.users.find((u) => u.id === session.userId)
  return user ? publicUser(user) : null
}

export async function listUsers(options = {}) {
  const db = await readDb(options)
  return db.users.map(publicUser)
}

export async function createUser(payload, options = {}) {
  return withDb(async (db) => {
    const loginName = String(payload.login || '').trim().toLowerCase()
    if (!loginName) throw Object.assign(new Error('L’identifiant est requis'), { status: 400 })
    if (!payload.password) throw Object.assign(new Error('Le mot de passe est requis'), { status: 400 })
    if (db.users.some((u) => u.login.toLowerCase() === loginName)) {
      throw Object.assign(new Error('Cet identifiant existe déjà'), { status: 409 })
    }
    const role = ROLE_PRESETS[payload.role] ? payload.role : 'lecteur'
    const custom = Boolean(payload.custom)
    const user = {
      id: randomUUID(),
      login: loginName,
      nom: (payload.nom || loginName).trim(),
      role,
      custom,
      permissions: custom && Array.isArray(payload.permissions) ? payload.permissions : [...ROLE_PRESETS[role]],
      passwordHash: await hashPassword(payload.password),
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    appendAudit(db, options.actor, {
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      entityLabel: userLabel(user),
      summary: `Compte créé : ${userLabel(user)} (${user.login})`,
    })
    return publicUser(user)
  }, options)
}

export async function updateUser(id, payload, options = {}) {
  return withDb(async (db) => {
    const user = db.users.find((u) => u.id === id)
    if (!user) throw Object.assign(new Error('Compte introuvable'), { status: 404 })
    if (payload.login) {
      const loginName = String(payload.login).trim().toLowerCase()
      const clash = db.users.find((u) => u.id !== id && u.login.toLowerCase() === loginName)
      if (clash) throw Object.assign(new Error('Cet identifiant existe déjà'), { status: 409 })
      user.login = loginName
    }
    if (payload.nom != null) user.nom = String(payload.nom).trim() || user.nom
    if (payload.role && ROLE_PRESETS[payload.role]) user.role = payload.role
    if (payload.custom != null) user.custom = Boolean(payload.custom)
    if (Array.isArray(payload.permissions)) user.permissions = payload.permissions
    if (!user.custom) user.permissions = [...ROLE_PRESETS[user.role]]
    if (payload.password) user.passwordHash = await hashPassword(payload.password)
    appendAudit(db, options.actor, {
      action: 'user.update',
      entityType: 'user',
      entityId: user.id,
      entityLabel: userLabel(user),
      summary: `Compte modifié : ${userLabel(user)}${payload.password ? ' (mot de passe)' : ''}`,
    })
    return publicUser(user)
  }, options)
}

export async function deleteUser(id, options = {}) {
  return withDb((db) => {
    const index = db.users.findIndex((u) => u.id === id)
    if (index === -1) throw Object.assign(new Error('Compte introuvable'), { status: 404 })
    const admins = db.users.filter((u) => u.role === 'admin' && can(u, 'users.manage'))
    const target = db.users[index]
    if (target.role === 'admin' && admins.length <= 1) {
      throw Object.assign(new Error('Impossible de supprimer le dernier administrateur'), { status: 409 })
    }
    db.users.splice(index, 1)
    db.sessions = (db.sessions || []).filter((session) => session.userId !== id)
    appendAudit(db, options.actor, {
      action: 'user.delete',
      entityType: 'user',
      entityId: target.id,
      entityLabel: userLabel(target),
      summary: `Compte supprimé : ${userLabel(target)} (${target.login})`,
    })
    return { ok: true }
  }, options)
}

export { can }
