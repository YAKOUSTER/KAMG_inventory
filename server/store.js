import { mkdir, readFile, writeFile, copyFile, access, rename } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { DEFAULT_REFERENTIELS } from '../src/domain/taxonomy.js'
import { normalizeReferentiels, validateReferentiels, categoryIds, mergeReferentielsFromItem } from '../src/domain/referentiels.js'
import { isLoanable, normalizeItem } from '../src/domain/item.js'
import { appendStockMovement, countLowStock } from '../src/domain/stock.js'
import { applyReturnUpdate, countOpenTasks } from '../src/domain/itemTasks.js'
import { ROLE_PRESETS, can, publicUser, resolveUserAccess } from '../src/domain/auth.js'
import {
  canRsvpAsPerson,
  displayNameFromSignup,
  findUserByIdentifiant,
  isDisabledUser,
  isPendingPlacement,
  isValidEmail,
  normalizeAccountRecord,
  normalizeEmail,
  normalizePersonIds,
  normalizeSignup,
  passwordResetUrl,
  PASSWORD_RESET_MESSAGE,
  validatePassword,
} from '../src/domain/memberAccount.js'
import { groupLoansByYear, memberSelfProfile, normalizePerson, personDisplayName } from '../src/domain/person.js'
import { todayLocal, formatDate } from '../src/domain/dates.js'
import { normalizeEvent, filterPublishedEvents, upcomingEvents, pastEvents, sortEvents, applyEventOverlay, eventAcceptsInscriptions, publicEventSummary, eventLocalDay, assertCanMutateEvent } from '../src/domain/events.js'
import { kindsAllowRecurrence } from '../src/domain/eventKinds.js'
import { personCanRsvpToEvent, loansVisibleToMember } from '../src/domain/eventGroups.js'
import { loansOfPeople } from '../src/domain/loans.js'
import { expandRecurringDates, shiftEventTimes } from '../src/domain/recurrence.js'
import { normalizeContentPage, filterPublishedPages, sortContentPages, publicContentSummary } from '../src/domain/content.js'
import { normalizePresenceRecord, publicPerson, isClearedPresenceStatut } from '../src/domain/presence.js'
import { normalizeAgendaSettings, DEFAULT_AGENDA_SETTINGS, publishedCalendarName } from '../src/domain/agendaSettings.js'
import { applyEventCatalog, normalizeEventCatalog } from '../src/domain/eventCatalog.js'
import { buildCalendarIcs } from '../src/domain/ics.js'
import { fetchGoogleCalendarEvents, resetGoogleCalendarCache } from './googleCalendar.js'
import {
  readMemberPagesSeed,
  shouldImportMemberContent,
  applyMemberContent,
} from './memberContent.js'
import {
  isPushEnabled,
  getVapidConfig,
  notifyManagers,
  normalizePushSubscription,
} from './push.js'
import { canReceivePushNotifications } from '../src/domain/auth.js'
import { hashPassword, hashToken, randomToken, verifyPassword } from './password.js'
import { passwordResetEmail, sendMail } from './mail.js'
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
    events: [],
    eventOverlays: {},
    presences: [],
    pages: [],
    settings: structuredClone({ agenda: DEFAULT_AGENDA_SETTINGS, eventCatalog: normalizeEventCatalog() }),
    pushSubscriptions: [],
    users: [],
    sessions: [],
    passwordResets: [],
    auditLog: [],
  }
}

function ensureShape(raw) {
  const db = emptyDb()
  if (!raw || typeof raw !== 'object') return db
  db.meta = { ...db.meta, ...(raw.meta || {}) }
  db.referentiels = normalizeReferentiels({ ...DEFAULT_REFERENTIELS, ...(raw.referentiels || {}) })
  const allowedCategories = categoryIds(db.referentiels)
  db.items = (Array.isArray(raw.items) ? raw.items : []).map((item) => {
    if (!item?.id) return item
    try {
      return normalizeItem({ ...item }, { id: item.id, categoryIds: allowedCategories })
    } catch {
      return item
    }
  })
  db.people = Array.isArray(raw.people) ? raw.people : []
  db.loans = Array.isArray(raw.loans) ? raw.loans : []
  db.events = (Array.isArray(raw.events) ? raw.events : []).map((event) => {
    if (!event?.id) return event
    try {
      return normalizeEvent(event, { id: event.id })
    } catch {
      return event
    }
  })
  db.eventOverlays =
    raw.eventOverlays && typeof raw.eventOverlays === 'object' && !Array.isArray(raw.eventOverlays)
      ? raw.eventOverlays
      : {}
  db.presences = Array.isArray(raw.presences) ? raw.presences : []
  db.pages = (Array.isArray(raw.pages) ? raw.pages : []).map((page) => {
    if (!page?.id) return page
    try {
      return normalizeContentPage(page, { id: page.id })
    } catch {
      return page
    }
  })
  db.settings = {
    agenda: normalizeAgendaSettings({ ...DEFAULT_AGENDA_SETTINGS, ...(raw.settings?.agenda || {}) }),
    eventCatalog: normalizeEventCatalog(raw.settings?.eventCatalog),
  }
  applyEventCatalog(db.settings.eventCatalog)
  db.pushSubscriptions = Array.isArray(raw.pushSubscriptions) ? raw.pushSubscriptions : []
  db.users = (Array.isArray(raw.users) ? raw.users : []).map(normalizeAccountRecord)
  db.sessions = Array.isArray(raw.sessions) ? raw.sessions : []
  db.passwordResets = Array.isArray(raw.passwordResets) ? raw.passwordResets : []
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
    if (shouldImportMemberContent(db)) {
      const seedPages = await readMemberPagesSeed({ dataDir: path.dirname(dbPath), seedPath, memberPagesPath: path.join(path.dirname(dbPath), 'member-pages.json') })
      if (applyMemberContent(db, seedPages)) dirty = true
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
  return { ...db, sessions: [], passwordResets: [] }
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

export async function clearAudit(options = {}) {
  return withDb((db) => {
    const count = (db.auditLog || []).length
    db.auditLog = []
    appendAudit(db, options.actor, {
      action: 'audit.clear',
      entityType: 'settings',
      entityId: 'audit',
      entityLabel: 'Journal d’activité',
      summary: `Journal d’activité vidé (${count} entrée(s) supprimée(s))`,
    })
    return { cleared: count }
  }, options)
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
    db.referentiels = mergeReferentielsFromItem(db.referentiels, item)
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
    db.referentiels = mergeReferentielsFromItem(db.referentiels, item)
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

function detectNewGoogleEvents(db, googleEvents = []) {
  const known = new Set(db.settings?.agenda?.knownGoogleEventUids || [])
  const today = todayLocal()
  const upcoming = googleEvents.filter((event) => eventLocalDay(event) >= today)
  const allUids = upcoming.map((event) => event.googleUid).filter(Boolean)
  if (!known.size) {
    return { baseline: true, newEvents: [], allUids }
  }
  const newEvents = upcoming.filter((event) => event.googleUid && !known.has(event.googleUid))
  return { baseline: false, newEvents, allUids }
}

async function deliverManagerNotification(payload, options = {}) {
  if (!isPushEnabled() || !payload) return { sent: 0 }
  return withDb(async (db) => notifyManagers(db, payload), options)
}

export async function getPushConfig(user, options = {}) {
  if (!canReceivePushNotifications(user)) {
    throw Object.assign(new Error('Réservé aux gestionnaires'), { status: 403 })
  }
  const db = await readDb(options)
  const subscribed = (db.pushSubscriptions || []).some((entry) => entry.userId === user.id)
  const vapid = getVapidConfig()
  return {
    enabled: isPushEnabled(),
    publicKey: vapid?.publicKey || '',
    subscribed,
  }
}

export async function subscribePush(user, payload, options = {}) {
  if (!canReceivePushNotifications(user)) {
    throw Object.assign(new Error('Réservé aux gestionnaires'), { status: 403 })
  }
  if (!isPushEnabled()) {
    throw Object.assign(new Error('Notifications non configurées sur le serveur'), { status: 503 })
  }
  return withDb((db) => {
    const entry = normalizePushSubscription(
      { ...payload, userAgent: options.userAgent || payload.userAgent },
      { id: randomUUID(), userId: user.id },
    )
    db.pushSubscriptions = [
      ...(db.pushSubscriptions || []).filter((item) => item.endpoint !== entry.endpoint),
      entry,
    ]
    return { ok: true, subscribed: true }
  }, options)
}

export async function unsubscribePush(user, payload, options = {}) {
  if (!canReceivePushNotifications(user)) {
    throw Object.assign(new Error('Réservé aux gestionnaires'), { status: 403 })
  }
  const endpoint = String(payload?.endpoint || '').trim()
  return withDb((db) => {
    db.pushSubscriptions = (db.pushSubscriptions || []).filter((entry) => {
      if (entry.userId !== user.id) return true
      if (endpoint) return entry.endpoint !== endpoint
      return false
    })
    return { ok: true, subscribed: false }
  }, options)
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
    const archiveReturn = formatDate(payload.dateRetour || '')
    const isArchive = Boolean(archiveReturn)
    const lines = []
    for (const itemId of itemIds) {
      const item = db.items.find((i) => i.id === itemId)
      if (!item) throw Object.assign(new Error('Pièce introuvable'), { status: 400 })
      const comment = (payload.items || []).find((i) => (i.itemId || i.id) === itemId)?.comment || ''
      if (isArchive) {
        lines.push({ itemId, comment, returnedAt: archiveReturn })
        continue
      }
      if (!isLoanable(item)) {
        throw Object.assign(new Error(`${item.code} n'est pas disponible à l'emprunt`), { status: 409 })
      }
      item.disponibilite = 'Emprunté'
      item.updatedAt = new Date().toISOString()
      lines.push({ itemId, comment, returnedAt: null })
    }
    const loan = {
      id: randomUUID(),
      titre: (payload.titre || '').trim() || `Emprunt ${personDisplayName(person)}`,
      personId: person.id,
      dateEmprunt: formatDate(payload.dateEmprunt) || todayLocal(),
      dateRetourPrevue: formatDate(payload.dateRetourPrevue) || '',
      dateRetour: isArchive ? archiveReturn : null,
      statut: isArchive ? 'retourne' : 'en_cours',
      chequeCaution: payload.chequeCaution === true,
      nomChequeCaution:
        payload.chequeCaution === true ? String(payload.nomChequeCaution || '').trim() : '',
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
    return { loan: decorateLoan(loan, db), isArchive }
  }, options).then(async (result) => {
    if (!result.isArchive) {
      deliverManagerNotification(
        {
          title: 'Nouvel emprunt',
          body: `${result.loan.personName} — ${result.loan.titre}`,
          url: `/emprunts/${result.loan.id}`,
        },
        options,
      ).catch(() => {})
    }
    return result.loan
  })
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
  }, options).then(async (loan) => {
    deliverManagerNotification(
      {
        title: loan.statut === 'retourne' ? 'Emprunt clôturé' : 'Retour de pièce(s)',
        body: `${loan.personName} — ${loan.titre}`,
        url: `/emprunts/${loan.id}`,
      },
      options,
    ).catch(() => {})
    return loan
  })
}

function syncLoanStatus(loan) {
  const open = loan.items.filter((line) => !line.returnedAt)
  if (!open.length) {
    loan.statut = 'retourne'
    if (!loan.dateRetour) {
      const dates = loan.items.map((line) => line.returnedAt).filter(Boolean).sort()
      loan.dateRetour = dates.at(-1) || null
    }
    return
  }
  if (loan.items.some((line) => line.returnedAt)) {
    loan.statut = 'retour_partiel'
    loan.dateRetour = null
    return
  }
  loan.statut = 'en_cours'
  loan.dateRetour = null
}

export async function updateLoan(id, payload, options = {}) {
  return withDb((db) => {
    const loan = db.loans.find((l) => l.id === id)
    if (!loan) throw Object.assign(new Error('Emprunt introuvable'), { status: 404 })

    if (payload.personId != null) {
      const person = db.people.find((p) => p.id === payload.personId)
      if (!person) throw Object.assign(new Error('Personne introuvable'), { status: 400 })
      loan.personId = person.id
    }
    if (payload.titre != null) {
      loan.titre = String(payload.titre).trim() || loan.titre
    }
    if (payload.dateEmprunt != null) {
      loan.dateEmprunt = formatDate(payload.dateEmprunt) || loan.dateEmprunt
    }
    if (payload.dateRetourPrevue != null) {
      loan.dateRetourPrevue = formatDate(payload.dateRetourPrevue)
    }
    if (payload.chequeCaution != null) {
      loan.chequeCaution = payload.chequeCaution === true
      if (!loan.chequeCaution) loan.nomChequeCaution = ''
    }
    if (payload.nomChequeCaution != null) {
      loan.nomChequeCaution = loan.chequeCaution
        ? String(payload.nomChequeCaution || '').trim()
        : ''
    }

    if (payload.dateRetour != null) {
      const dateRetour = formatDate(payload.dateRetour)
      if (dateRetour) {
        for (const line of loan.items) {
          if (line.returnedAt) continue
          line.returnedAt = dateRetour
          const item = db.items.find((i) => i.id === line.itemId)
          if (item && item.disponibilite === 'Emprunté') {
            item.disponibilite = 'Disponible'
            item.updatedAt = new Date().toISOString()
          }
        }
        loan.dateRetour = dateRetour
        loan.statut = 'retourne'
      } else {
        loan.dateRetour = null
        syncLoanStatus(loan)
      }
    } else {
      syncLoanStatus(loan)
    }

    const person = db.people.find((p) => p.id === loan.personId)
    appendAudit(db, options.actor, {
      action: 'loan.update',
      entityType: 'loan',
      entityId: loan.id,
      entityLabel: loanLabel(loan, person),
      summary: `Emprunt modifié — ${loanLabel(loan, person)}`,
      meta: {
        personId: loan.personId,
        personName: personLabel(person),
        dateEmprunt: loan.dateEmprunt,
        dateRetour: loan.dateRetour,
        statut: loan.statut,
      },
    })
    return decorateLoan(loan, db)
  }, options)
}

export async function cancelLoan(id, options = {}) {
  return withDb((db) => {
    const loan = db.loans.find((l) => l.id === id)
    if (!loan) throw Object.assign(new Error('Emprunt introuvable'), { status: 404 })
    if (loan.items.some((line) => line.returnedAt)) {
      throw Object.assign(
        new Error('Impossible d’annuler un emprunt avec des retours déjà enregistrés'),
        { status: 409 },
      )
    }
    const person = db.people.find((p) => p.id === loan.personId)
    for (const line of loan.items) {
      const item = db.items.find((i) => i.id === line.itemId)
      if (item && item.disponibilite === 'Emprunté') {
        item.disponibilite = 'Disponible'
        item.updatedAt = new Date().toISOString()
      }
    }
    db.loans = db.loans.filter((entry) => entry.id !== id)
    appendAudit(db, options.actor, {
      action: 'loan.cancel',
      entityType: 'loan',
      entityId: loan.id,
      entityLabel: loanLabel(loan, person),
      summary: `Emprunt annulé — ${loanLabel(loan, person)}`,
      meta: {
        personId: loan.personId,
        personName: personLabel(person),
        itemIds: loan.items.map((line) => line.itemId),
        itemCodes: codesForItems(db, loan.items.map((line) => line.itemId)),
      },
    })
    return { id: loan.id, cancelled: true }
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
    pendingMembers: (db.users || []).filter((user) => user.status === 'pending').length,
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
    eventCatalog: normalizeEventCatalog(db.settings?.eventCatalog),
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

export async function getPublicMemberSpace(options = {}) {
  const db = await readDb(options)
  const merged = listLocalEvents(db)
  const publishedEvents = filterPublishedEvents(merged)
  const now = new Date()
  const upcoming = upcomingEvents(publishedEvents, now).map((event) =>
    publicEventSummary(event, { includeDescription: true }),
  )
  const past = pastEvents(publishedEvents, now)
    .slice(0, 12)
    .map((event) => publicEventSummary(event, { includeDescription: false }))
  const inscriptionIds = new Set(
    upcoming.filter((event) => eventAcceptsInscriptions(event)).map((event) => event.id),
  )
  const loans = db.loans
    .filter((loan) => loan.statut !== 'retourne')
    .map((loan) => decorateLoan(loan, db))
    .sort((a, b) => (b.dateEmprunt || '').localeCompare(a.dateEmprunt || ''))
  return {
    agenda: db.settings?.agenda || normalizeAgendaSettings({}),
    eventCatalog: normalizeEventCatalog(db.settings?.eventCatalog),
    events: {
      upcoming,
      past,
    },
    pages: filterPublishedPages(db.pages || []).map(publicContentSummary).filter(Boolean),
    people: (db.people || []).map(publicPerson).filter(Boolean),
    presences: (Array.isArray(db.presences) ? db.presences : []).filter((entry) =>
      inscriptionIds.has(entry.eventId),
    ),
    loans,
  }
}

export async function getMemberSpace(user, options = {}) {
  if (!user) throw Object.assign(new Error('Connexion requise'), { status: 401 })
  if (isDisabledUser(user)) throw Object.assign(new Error('Compte désactivé'), { status: 403 })
  if (isPendingPlacement(user)) {
    return { pending: true, user: publicUser(user) }
  }
  const space = await getPublicMemberSpace(options)
  const allowed = new Set(normalizePersonIds(user.personIds))
  const db = await readDb(options)
  const profiles = (db.people || []).map(memberSelfProfile).filter((person) => person && allowed.has(person.id))
  return {
    ...space,
    pending: false,
    profiles,
    tailles: Array.isArray(db.referentiels?.tailles) ? db.referentiels.tailles : [],
    loans: loansVisibleToMember(space.loans || [], space.people || [], [...allowed]),
    selfLoans: loansOfPeople(space.loans || [], [...allowed]),
  }
}

export async function updateMemberProfile(user, personId, payload = {}, options = {}) {
  if (!user) throw Object.assign(new Error('Connexion requise'), { status: 401 })
  if (isPendingPlacement(user)) {
    throw Object.assign(new Error('Votre inscription est en attente de rangement'), { status: 403 })
  }
  const allowed = new Set(normalizePersonIds(user.personIds))
  const id = String(personId || '').trim()
  if (!id || !allowed.has(id)) {
    throw Object.assign(new Error('Cette fiche ne vous est pas liée'), { status: 403 })
  }
  return withDb((db) => {
    const index = db.people.findIndex((person) => person.id === id)
    if (index === -1) throw Object.assign(new Error('Personne introuvable'), { status: 404 })
    const current = db.people[index]
    const next = {
      ...current,
      images: payload.images != null ? payload.images : current.images,
      mesures: payload.mesures != null ? { ...current.mesures, ...payload.mesures } : current.mesures,
      tailleLettre: payload.tailleLettre != null ? payload.tailleLettre : current.tailleLettre,
      noteAtelier: payload.noteAtelier != null ? payload.noteAtelier : current.noteAtelier,
      bio: payload.bio != null ? payload.bio : current.bio,
    }
    const person = runDomain(normalizePerson, next, { id })
    db.people[index] = person
    appendAudit(db, user, {
      action: 'person.profile',
      entityType: 'person',
      entityId: person.id,
      entityLabel: personLabel(person),
      summary: `Profil membre mis à jour — ${personLabel(person)}`,
    })
    return memberSelfProfile(person)
  }, options)
}

function listLocalEvents(db) {
  const overlays = db.eventOverlays || {}
  return (db.events || []).map((event) => applyEventOverlay(event, overlays[event.id]))
}

export async function listEvents(options = {}) {
  const db = await readDb(options)
  return sortEvents(listLocalEvents(db))
}

export async function getPublicCalendarIcs(options = {}) {
  const db = await readDb(options)
  const groupes = Array.isArray(options.groupes) ? options.groupes : []
  const calName = publishedCalendarName(db.settings?.agenda || {})
  const suffix = groupes.length ? ` — ${groupes.join(', ')}` : ''
  return buildCalendarIcs(filterPublishedEvents(listLocalEvents(db)), {
    calName: `${calName}${suffix}`,
    groupes,
  })
}

export async function getAgendaSettings(options = {}) {
  const db = await readDb(options)
  return normalizeAgendaSettings(db.settings?.agenda || {})
}

export async function updateAgendaSettings(payload, options = {}) {
  return withDb((db) => {
    db.settings = db.settings || {}
    const current = db.settings.agenda || {}
    db.settings.agenda = normalizeAgendaSettings({ ...current, ...payload })
    resetGoogleCalendarCache()
    appendAudit(db, options.actor, {
      action: 'agenda.settings.update',
      entityType: 'settings',
      entityId: 'agenda',
      entityLabel: 'Agenda',
      summary: 'Mise à jour des paramètres d’agenda',
    })
    return db.settings.agenda
  }, options)
}

export async function getEventCatalog(options = {}) {
  const db = await readDb(options)
  return normalizeEventCatalog(db.settings?.eventCatalog)
}

export async function updateEventCatalog(payload, options = {}) {
  return withDb((db) => {
    db.settings = db.settings || {}
    db.settings.eventCatalog = normalizeEventCatalog(payload)
    applyEventCatalog(db.settings.eventCatalog)
    appendAudit(db, options.actor, {
      action: 'eventCatalog.update',
      entityType: 'settings',
      entityId: 'event-catalog',
      entityLabel: 'Types et groupes',
      summary: 'Mise à jour des types d’événement et des noms de groupes',
    })
    return db.settings.eventCatalog
  }, options)
}

function eventAlreadyStored(db, googleEvent) {
  return (db.events || []).some(
    (event) =>
      event.id === googleEvent.id ||
      (googleEvent.googleUid && event.googleUid === googleEvent.googleUid),
  )
}

function toStoredLocalEvent(googleEvent, overlay) {
  const merged = applyEventOverlay(googleEvent, overlay)
  return normalizeEvent(
    {
      ...merged,
      source: 'local',
      googleUid: googleEvent.googleUid || merged.googleUid,
    },
    { id: googleEvent.id },
  )
}

export async function importGoogleCalendarEvents(options = {}) {
  const current = await readDb(options)
  if (options.onlyIfNeeded && current.settings?.agenda?.googleImportedAt) {
    return {
      count: 0,
      imported: 0,
      skipped: (current.events || []).length,
      newCount: 0,
      syncedAt: current.settings.agenda.googleImportedAt,
    }
  }
  resetGoogleCalendarCache()
  const settings = (await readDb(options)).settings?.agenda || {}
  const googleEvents = await fetchGoogleCalendarEvents(settings, options)
  const detectionPreview = detectNewGoogleEvents(await readDb(options), googleEvents)

  return withDb(async (db) => {
    db.events = db.events || []
    db.eventOverlays = db.eventOverlays || {}
    let imported = 0
    let skipped = 0
    const importedEvents = []
    for (const googleEvent of googleEvents) {
      if (!googleEvent?.debut || Date.parse(googleEvent.debut) < Date.parse('1980-01-01T00:00:00Z')) {
        skipped += 1
        continue
      }
      if (eventAlreadyStored(db, googleEvent)) {
        skipped += 1
        continue
      }
      const overlay = db.eventOverlays[googleEvent.id]
      const local = toStoredLocalEvent(googleEvent, overlay)
      db.events.push(local)
      if (overlay) delete db.eventOverlays[googleEvent.id]
      imported += 1
      importedEvents.push(local)
    }
    db.settings = db.settings || {}
    db.settings.agenda = normalizeAgendaSettings({
      ...(db.settings.agenda || {}),
      googleImportedAt: new Date().toISOString(),
      knownGoogleEventUids: detectionPreview.allUids,
    })
    appendAudit(db, options.actor, {
      action: 'agenda.google.import',
      entityType: 'settings',
      entityId: 'agenda',
      entityLabel: 'Agenda',
      summary: `Import Google Agenda : ${imported} nouveau(x), ${skipped} déjà présent(s)`,
    })
    if (!detectionPreview.baseline) {
      for (const event of importedEvents) {
        await notifyManagers(db, {
          title: 'Nouvelle date au calendrier',
          body: `${event.titre} — ${event.lieu || 'lieu à préciser'}`,
          url: '/espace-membre?onglet=agenda',
        })
      }
    }
    return {
      count: googleEvents.length,
      imported,
      skipped,
      newCount: imported,
      syncedAt: db.settings.agenda.googleImportedAt,
    }
  }, options)
}

export async function syncGoogleCalendar(options = {}) {
  return importGoogleCalendarEvents(options)
}

export async function getEvent(id, options = {}) {
  const db = await readDb(options)
  return listLocalEvents(db).find((entry) => entry.id === id) || null
}

export async function createEvent(payload, options = {}) {
  const { recurrence, ...rest } = payload && typeof payload === 'object' ? payload : {}
  const shouldExpand =
    kindsAllowRecurrence(rest.kinds) &&
    recurrence &&
    (recurrence.freq === 'weekly' || recurrence.freq === 'biweekly')
  const dates = shouldExpand ? expandRecurringDates(rest.debut, recurrence) : rest.debut ? [rest.debut] : []
  if (!dates.length) {
    throw Object.assign(new Error('Aucune date à créer. Vérifiez la récurrence et les dates exclues.'), {
      status: 400,
    })
  }
  const starts = dates
  const preview = runDomain(normalizeEvent, { ...rest, source: 'local' }, { id: 'preview' })
  assertCanMutateEvent(options.actor, preview)

  return withDb((db) => {
    db.events = db.events || []
    const created = []
    for (const nextStart of starts) {
      const times =
        starts.length > 1 ? shiftEventTimes(rest.debut, rest.fin || rest.debut, nextStart) : {}
      const event = runDomain(
        normalizeEvent,
        { ...rest, ...times, source: 'local' },
        { id: randomUUID() },
      )
      db.events.push(event)
      created.push(event)
    }
    const first = created[0]
    appendAudit(db, options.actor, {
      action: 'event.create',
      entityType: 'event',
      entityId: first.id,
      entityLabel: first.titre,
      summary:
        created.length > 1
          ? `Création de ${created.length} dates « ${first.titre} »`
          : `Création de l’événement « ${first.titre} »`,
    })
    return { ...first, createdCount: created.length, createdIds: created.map((event) => event.id) }
  }, options).then(async (event) => {
    if (event.publie !== false) {
      deliverManagerNotification(
        {
          title: event.createdCount > 1 ? 'Nouvelles dates au calendrier' : 'Nouvelle date au calendrier',
          body: `${event.titre}${event.lieu ? ` — ${event.lieu}` : ''}`,
          url: '/agenda',
        },
        options,
      ).catch(() => {})
    }
    return event
  })
}

export async function updateEvent(id, payload, options = {}) {
  return withDb((db) => {
    db.events = db.events || []
    const index = db.events.findIndex((entry) => entry.id === id)
    if (index === -1) throw Object.assign(new Error('Événement introuvable'), { status: 404 })
    const current = applyEventOverlay(db.events[index], db.eventOverlays?.[id])
    assertCanMutateEvent(options.actor, current)
    const event = runDomain(
      normalizeEvent,
      { ...current, ...payload, id, source: 'local', googleUid: current.googleUid },
      { id },
    )
    assertCanMutateEvent(options.actor, event)
    db.events[index] = event
    if (db.eventOverlays?.[id]) delete db.eventOverlays[id]
    appendAudit(db, options.actor, {
      action: 'event.update',
      entityType: 'event',
      entityId: event.id,
      entityLabel: event.titre,
      summary: `Modification de l’événement « ${event.titre} »`,
    })
    return event
  }, options)
}

export async function deleteEvent(id, options = {}) {
  return withDb((db) => {
    db.events = db.events || []
    const index = db.events.findIndex((entry) => entry.id === id)
    if (index === -1) throw Object.assign(new Error('Événement introuvable'), { status: 404 })
    const current = applyEventOverlay(db.events[index], db.eventOverlays?.[id])
    assertCanMutateEvent(options.actor, current)
    const [removed] = db.events.splice(index, 1)
    if (db.eventOverlays?.[id]) delete db.eventOverlays[id]
    db.presences = (db.presences || []).filter((entry) => entry.eventId !== id)
    appendAudit(db, options.actor, {
      action: 'event.delete',
      entityType: 'event',
      entityId: removed.id,
      entityLabel: removed.titre,
      summary: `Suppression de l’événement « ${removed.titre} »`,
    })
    return { id, deleted: true }
  }, options)
}

export async function listEventPresences(eventId, options = {}) {
  const db = await readDb(options)
  return (db.presences || []).filter((entry) => entry.eventId === eventId)
}

export async function listPresences(options = {}) {
  const db = await readDb(options)
  return Array.isArray(db.presences) ? db.presences : []
}

export async function setEventPresence(eventId, payload, options = {}) {
  return withDb(async (db) => {
    const event = listLocalEvents(db).find((entry) => entry.id === eventId)
    if (!event) throw Object.assign(new Error('Événement introuvable'), { status: 404 })
    if (!eventAcceptsInscriptions(event)) {
      throw Object.assign(new Error('Les inscriptions ne sont pas ouvertes pour cet événement'), { status: 400 })
    }
    const personId = String(payload?.personId ?? '').trim()
    if (!personId || personId.length > 80) {
      throw Object.assign(new Error('Personne introuvable'), { status: 400 })
    }
    const person = (db.people || []).find((entry) => entry.id === personId)
    if (!person) throw Object.assign(new Error('Personne introuvable'), { status: 400 })
    if (options.linkedOnly && !canRsvpAsPerson(options.actor, personId)) {
      throw Object.assign(new Error('Vous ne pouvez répondre que pour vos fiches'), { status: 403 })
    }
    if (!personCanRsvpToEvent(person, event)) {
      throw Object.assign(
        new Error("Vous n'êtes pas concerné par cet événement ou vous n'avez pas de compte"),
        { status: 403 },
      )
    }

    db.presences = db.presences || []
    const index = db.presences.findIndex(
      (entry) => entry.eventId === eventId && entry.personId === personId,
    )

    if (isClearedPresenceStatut(payload?.statut)) {
      if (index >= 0) db.presences.splice(index, 1)
      if (options.actor) {
        appendAudit(db, options.actor, {
          action: 'event.presence',
          entityType: 'event',
          entityId: eventId,
          entityLabel: event.titre,
          summary: `Présence effacée pour ${personLabel(person)}`,
        })
      }
      return { eventId, personId, statut: '', deleted: true }
    }

    const record = runDomain(normalizePresenceRecord, {
      eventId,
      personId,
      statut: payload.statut,
    })
    if (index === -1) db.presences.push(record)
    else db.presences[index] = record
    if (options.actor) {
      appendAudit(db, options.actor, {
        action: 'event.presence',
        entityType: 'event',
        entityId: eventId,
        entityLabel: event.titre,
        summary: `Présence ${record.statut} pour ${personLabel(person)}`,
      })
    }
    return record
  }, options)
}

export async function listContentPages(options = {}) {
  const db = await readDb(options)
  return sortContentPages(db.pages || [])
}

export async function getContentPage(id, options = {}) {
  const db = await readDb(options)
  const page = (db.pages || []).find((entry) => entry.id === id)
  return page || null
}

export async function getPublicContentPage(id, options = {}) {
  const page = await getContentPage(id, options)
  if (!page || page.publie === false) {
    throw Object.assign(new Error('Contenu introuvable'), { status: 404 })
  }
  return page
}

export async function createContentPage(payload, options = {}) {
  return withDb((db) => {
    const page = runDomain(normalizeContentPage, payload, { id: randomUUID() })
    db.pages = db.pages || []
    db.pages.push(page)
    appendAudit(db, options.actor, {
      action: 'content.create',
      entityType: 'content',
      entityId: page.id,
      entityLabel: page.titre,
      summary: `Création du contenu « ${page.titre} »`,
    })
    return page
  }, options)
}

export async function updateContentPage(id, payload, options = {}) {
  return withDb((db) => {
    db.pages = db.pages || []
    const index = db.pages.findIndex((entry) => entry.id === id)
    if (index === -1) throw Object.assign(new Error('Contenu introuvable'), { status: 404 })
    const page = runDomain(normalizeContentPage, { ...db.pages[index], ...payload, id }, { id })
    db.pages[index] = page
    appendAudit(db, options.actor, {
      action: 'content.update',
      entityType: 'content',
      entityId: page.id,
      entityLabel: page.titre,
      summary: `Modification du contenu « ${page.titre} »`,
    })
    return page
  }, options)
}

export async function deleteContentPage(id, options = {}) {
  return withDb((db) => {
    db.pages = db.pages || []
    const index = db.pages.findIndex((entry) => entry.id === id)
    if (index === -1) throw Object.assign(new Error('Contenu introuvable'), { status: 404 })
    const [removed] = db.pages.splice(index, 1)
    appendAudit(db, options.actor, {
      action: 'content.delete',
      entityType: 'content',
      entityId: removed.id,
      entityLabel: removed.titre,
      summary: `Suppression du contenu « ${removed.titre} »`,
    })
    return { id, deleted: true }
  }, options)
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
      email: '',
      nom: spec.nom,
      role: spec.role,
      status: 'active',
      personIds: [],
      custom: false,
      permissions: [...ROLE_PRESETS[spec.role]],
      passwordHash: await hashPassword(spec.password),
      createdAt: now,
    })),
  )
}

function issueSession(db, user) {
  const token = randomToken()
  const now = Date.now()
  db.sessions = (db.sessions || []).filter((session) => new Date(session.expiresAt).getTime() > now)
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_MS).toISOString(),
  })
  const safe = publicUser(user)
  return { token, user: safe, ...publicSnapshot(db, safe) }
}

function revokeUserSessions(db, userId) {
  db.sessions = (db.sessions || []).filter((session) => session.userId !== userId)
}

function revokePasswordResets(db, userId) {
  db.passwordResets = (db.passwordResets || []).filter((entry) => entry.userId !== userId)
}

let dummyPasswordHashPromise
function dummyPasswordHash() {
  dummyPasswordHashPromise ||= hashPassword(randomToken())
  return dummyPasswordHashPromise
}

export async function login(loginName, password, options = {}) {
  const identifiant = String(loginName || '').trim().toLowerCase()
  if (!identifiant || !password) {
    throw Object.assign(new Error('Identifiant et mot de passe requis'), { status: 400 })
  }
  return withDb(async (db) => {
    const user = findUserByIdentifiant(db.users, identifiant)
    const matches = await verifyPassword(password, user?.passwordHash || (await dummyPasswordHash()))
    if (!user || !matches) {
      throw Object.assign(new Error('Identifiant ou mot de passe incorrect'), { status: 401 })
    }
    if (isDisabledUser(user)) {
      throw Object.assign(new Error('Ce compte a été refusé ou désactivé'), { status: 403 })
    }
    return issueSession(db, user)
  }, options)
}

export async function registerMember(payload, options = {}) {
  const email = normalizeEmail(payload?.email)
  if (!isValidEmail(email)) throw Object.assign(new Error('Adresse e-mail invalide'), { status: 400 })
  const password = (() => {
    try {
      return validatePassword(payload?.password)
    } catch (error) {
      throw Object.assign(error, { status: 400 })
    }
  })()
  const signup = runDomain(normalizeSignup, payload || {})
  return withDb(async (db) => {
    if (findUserByIdentifiant(db.users, email)) {
      throw Object.assign(new Error('Un compte existe déjà avec cet e-mail'), { status: 409 })
    }
    const now = new Date().toISOString()
    const user = {
      id: randomUUID(),
      login: email,
      email,
      nom: displayNameFromSignup(signup, email),
      role: 'membre',
      status: 'pending',
      personIds: [],
      custom: false,
      permissions: [],
      signup,
      passwordHash: await hashPassword(password),
      createdAt: now,
    }
    db.users.push(user)
    appendAudit(db, publicUser(user), {
      action: 'user.register',
      entityType: 'user',
      entityId: user.id,
      entityLabel: userLabel(user),
      summary: `Inscription en attente : ${userLabel(user)}`,
    })
    return { ...issueSession(db, user), pending: true }
  }, options)
}

export async function listPendingMembers(options = {}) {
  const db = await readDb(options)
  return db.users.filter((user) => user.status === 'pending').map(publicUser)
}

function accountEmail(user) {
  const email = normalizeEmail(user?.email || '')
  if (email) return email
  const login = String(user?.login || '').trim()
  return login.includes('@') ? normalizeEmail(login) : ''
}

function applyAccountEmailToPeople(db, user, personIds) {
  const email = accountEmail(user)
  if (!email) return
  for (const personId of personIds) {
    const index = (db.people || []).findIndex((person) => person.id === personId)
    if (index === -1) continue
    const current = db.people[index]
    if (normalizeEmail(current.email) === email) continue
    db.people[index] = runDomain(normalizePerson, { ...current, email }, { id: current.id })
  }
}

export async function placeMember(id, payload = {}, options = {}) {
  return withDb(async (db) => {
    const user = db.users.find((entry) => entry.id === id)
    if (!user) throw Object.assign(new Error('Compte introuvable'), { status: 404 })

    if (payload.refuse) {
      user.status = 'disabled'
      user.personIds = []
      revokeUserSessions(db, id)
      revokePasswordResets(db, id)
      appendAudit(db, options.actor, {
        action: 'user.refuse',
        entityType: 'user',
        entityId: user.id,
        entityLabel: userLabel(user),
        summary: `Inscription refusée : ${userLabel(user)}`,
      })
      return publicUser(user)
    }

    const personIds = normalizePersonIds(payload.personIds)
    if (payload.createPerson) {
      const source = user.signup || {}
      const person = runDomain(normalizePerson, {
        prenom: source.prenom || user.nom,
        nom: source.nom || '',
        email: user.email,
        telephone: source.telephone || '',
        roles: Array.isArray(payload.roles) ? payload.roles : [],
      }, { id: randomUUID() })
      db.people.push(person)
      personIds.push(person.id)
      appendAudit(db, options.actor, {
        action: 'person.create',
        entityType: 'person',
        entityId: person.id,
        entityLabel: personLabel(person),
        summary: `Fiche créée depuis l’inscription ${userLabel(user)}`,
      })
    }

    const uniqueIds = normalizePersonIds(personIds)
    if (!uniqueIds.length) {
      throw Object.assign(new Error('Liez au moins une fiche personne (danseur ou enfant)'), { status: 400 })
    }
    const unknown = uniqueIds.filter((personId) => !(db.people || []).some((person) => person.id === personId))
    if (unknown.length) {
      throw Object.assign(new Error('Fiche personne introuvable'), { status: 400 })
    }

    user.status = 'active'
    user.personIds = uniqueIds
    applyAccountEmailToPeople(db, user, uniqueIds)
    const access = resolveUserAccess({
      role: user.role,
      custom: user.custom,
      permissions: user.permissions,
    })
    user.role = access.role
    user.custom = access.custom
    user.permissions = access.permissions
    appendAudit(db, options.actor, {
      action: 'user.place',
      entityType: 'user',
      entityId: user.id,
      entityLabel: userLabel(user),
      summary: `Compte rangé : ${userLabel(user)} (${uniqueIds.length} fiche(s))`,
    })
    return publicUser(user)
  }, options)
}

export async function logout(token, options = {}) {
  if (!token) return { ok: true }
  return withDb((db) => {
    db.sessions = (db.sessions || []).filter((session) => session.token !== token)
    return { ok: true }
  }, options)
}

const PASSWORD_RESET_MS = 60 * 60 * 1000

function prunePasswordResets(db, now = Date.now()) {
  db.passwordResets = (db.passwordResets || []).filter(
    (entry) => new Date(entry.expiresAt).getTime() > now,
  )
}

function issuePasswordReset(db, userId) {
  prunePasswordResets(db)
  const token = randomToken()
  const now = Date.now()
  db.passwordResets = db.passwordResets.filter((entry) => entry.userId !== userId)
  db.passwordResets.push({
    userId,
    tokenHash: hashToken(token),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PASSWORD_RESET_MS).toISOString(),
  })
  return token
}

export async function requestPasswordReset(identifiant, options = {}) {
  const generic = { ok: true, message: PASSWORD_RESET_MESSAGE }
  const ident = String(identifiant || '').trim().toLowerCase()
  if (!ident) return generic
  return withDb(async (db) => {
    const user = findUserByIdentifiant(db.users, ident)
    if (!user || isDisabledUser(user)) return generic
    const token = issuePasswordReset(db, user.id)
    const resetUrl = passwordResetUrl(options.origin, token)
    const to = user.email || (String(user.login || '').includes('@') ? user.login : '')
    if (to) {
      const mail = passwordResetEmail({ nom: user.nom, resetUrl })
      await sendMail({ to, subject: mail.subject, text: mail.text })
    }
    await notifyManagers(db, {
      title: 'Mot de passe oublié',
      body: `${userLabel(user)} a demandé une réinitialisation.`,
      url: '/utilisateurs',
    }).catch(() => {})
    appendAudit(db, { id: user.id, login: user.login, nom: user.nom }, {
      action: 'user.password-reset-request',
      entityType: 'user',
      entityId: user.id,
      entityLabel: userLabel(user),
      summary: `Demande de mot de passe oublié : ${userLabel(user)}`,
    })
    if (options.includeUrl) return { ...generic, resetUrl }
    return generic
  }, options)
}

export async function createPasswordResetLink(userId, options = {}) {
  return withDb((db) => {
    const user = db.users.find((entry) => entry.id === userId)
    if (!user) throw Object.assign(new Error('Compte introuvable'), { status: 404 })
    if (isDisabledUser(user)) throw Object.assign(new Error('Ce compte est désactivé'), { status: 400 })
    const token = issuePasswordReset(db, user.id)
    appendAudit(db, options.actor, {
      action: 'user.password-reset-link',
      entityType: 'user',
      entityId: user.id,
      entityLabel: userLabel(user),
      summary: `Lien de réinitialisation créé pour ${userLabel(user)}`,
    })
    return {
      ok: true,
      url: passwordResetUrl(options.origin, token),
      expiresAt: db.passwordResets.find((entry) => entry.userId === user.id)?.expiresAt,
    }
  }, options)
}

export async function resetPassword(token, password, options = {}) {
  const raw = String(token || '').trim()
  if (!raw) throw Object.assign(new Error('Lien invalide ou expiré'), { status: 400 })
  const nextPassword = runDomain(validatePassword, password)
  return withDb(async (db) => {
    prunePasswordResets(db)
    const tokenHash = hashToken(raw)
    const reset = (db.passwordResets || []).find((entry) => entry.tokenHash === tokenHash)
    if (!reset) throw Object.assign(new Error('Lien invalide ou expiré'), { status: 400 })
    const user = db.users.find((entry) => entry.id === reset.userId)
    if (!user || isDisabledUser(user)) {
      throw Object.assign(new Error('Lien invalide ou expiré'), { status: 400 })
    }
    user.passwordHash = await hashPassword(nextPassword)
    revokePasswordResets(db, user.id)
    revokeUserSessions(db, user.id)
    appendAudit(db, { id: user.id, login: user.login, nom: user.nom }, {
      action: 'user.password-reset',
      entityType: 'user',
      entityId: user.id,
      entityLabel: userLabel(user),
      summary: `Mot de passe réinitialisé : ${userLabel(user)}`,
    })
    return { ok: true }
  }, options)
}

export async function userFromToken(token, options = {}) {
  if (!token) return null
  const db = await readDb(options)
  const session = (db.sessions || []).find((s) => s.token === token)
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null
  const user = db.users.find((u) => u.id === session.userId)
  if (!user || isDisabledUser(user)) return null
  return publicUser(user)
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
    const access = resolveUserAccess({
      role: payload.role,
      custom: payload.custom,
      permissions: payload.permissions,
    })
    const email = normalizeEmail(payload.email || (loginName.includes('@') ? loginName : ''))
    if (email && db.users.some((entry) => normalizeEmail(entry.email) === email)) {
      throw Object.assign(new Error('Cet e-mail existe déjà'), { status: 409 })
    }
    const user = {
      id: randomUUID(),
      login: loginName,
      email,
      nom: (payload.nom || loginName).trim(),
      role: access.role,
      status: payload.status === 'pending' ? 'pending' : 'active',
      personIds: normalizePersonIds(payload.personIds),
      custom: access.custom,
      permissions: access.permissions,
      passwordHash: await hashPassword(payload.password),
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    applyAccountEmailToPeople(db, user, user.personIds)
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
    if (payload.email != null) {
      const email = normalizeEmail(payload.email)
      if (email && db.users.some((entry) => entry.id !== id && normalizeEmail(entry.email) === email)) {
        throw Object.assign(new Error('Cet e-mail existe déjà'), { status: 409 })
      }
      user.email = email
    }
    if (payload.status === 'pending' || payload.status === 'active' || payload.status === 'disabled') {
      user.status = payload.status
    }
    if (Array.isArray(payload.personIds)) {
      user.personIds = normalizePersonIds(payload.personIds)
      applyAccountEmailToPeople(db, user, user.personIds)
    }
    const access = resolveUserAccess({
      role: payload.role || user.role,
      custom: payload.custom != null ? payload.custom : user.custom,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : user.permissions,
    })
    user.role = access.role
    user.custom = access.custom
    user.permissions = access.permissions
    if (payload.password) user.passwordHash = await hashPassword(payload.password)
    if (user.status === 'disabled' || payload.password) {
      revokeUserSessions(db, user.id)
    }
    if (user.status === 'disabled') revokePasswordResets(db, user.id)
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
    revokeUserSessions(db, id)
    revokePasswordResets(db, id)
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
