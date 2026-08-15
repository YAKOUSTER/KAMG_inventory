import { mkdir, readFile, writeFile, copyFile, access, rename } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { DEFAULT_REFERENTIELS } from '../src/domain/taxonomy.js'
import { normalizeItem } from '../src/domain/item.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.resolve(__dirname, '../data')
export const SEED_PATH = path.join(DATA_DIR, 'seed.json')
export const DB_PATH = path.join(DATA_DIR, 'db.json')
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')

function emptyDb() {
  return {
    meta: { version: 1, updatedAt: new Date().toISOString() },
    referentiels: structuredClone(DEFAULT_REFERENTIELS),
    items: [],
    people: [],
    loans: [],
  }
}

function ensureShape(raw) {
  const db = emptyDb()
  if (!raw || typeof raw !== 'object') return db
  db.meta = { ...db.meta, ...(raw.meta || {}) }
  db.referentiels = { ...db.referentiels, ...(raw.referentiels || {}) }
  db.items = Array.isArray(raw.items) ? raw.items : []
  db.people = Array.isArray(raw.people) ? raw.people : []
  db.loans = Array.isArray(raw.loans) ? raw.loans : []
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

export async function ensureDb({ seedPath = SEED_PATH, dbPath = DB_PATH } = {}) {
  await mkdir(path.dirname(dbPath), { recursive: true })
  await mkdir(UPLOADS_DIR, { recursive: true })
  if (!(await exists(dbPath))) {
    if (await exists(seedPath)) {
      await copyFile(seedPath, dbPath)
    } else {
      await writeJson(dbPath, emptyDb())
    }
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

function enqueue(task) {
  const run = queue.then(task, task)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function readDb(options = {}) {
  await ensureDb(options)
  const dbPath = options.dbPath || DB_PATH
  return ensureShape(await readJson(dbPath))
}

export async function writeDb(db, options = {}) {
  const dbPath = options.dbPath || DB_PATH
  db.meta = { ...(db.meta || {}), version: 1, updatedAt: new Date().toISOString() }
  await writeJson(dbPath, db)
  return db
}

export function withDb(mutator, options = {}) {
  return enqueue(async () => {
    const db = await readDb(options)
    const result = await mutator(db)
    await writeDb(db, options)
    return result
  })
}

export async function exportDb(options = {}) {
  return readDb(options)
}

export async function importDb(payload, options = {}) {
  const db = ensureShape(payload)
  await writeDb(db, options)
  return db
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
        personName: person?.nom || '',
        dateEmprunt: loan.dateEmprunt,
        dateRetour: line?.returnedAt || loan.dateRetour,
        comment: line?.comment || '',
        statut: loan.statut,
      }
    })
  return { ...item, linkedItems: linked.filter((i) => i.id !== id), loanHistory: history }
}

export async function createItem(payload, options = {}) {
  return withDb((db) => {
    const item = normalizeItem(payload, { id: randomUUID() })
    if (db.items.some((i) => i.code.toLowerCase() === item.code.toLowerCase())) {
      throw Object.assign(new Error(`Le code ${item.code} existe déjà`), { status: 409 })
    }
    db.items.push(item)
    return item
  }, options)
}

export async function updateItem(id, payload, options = {}) {
  return withDb((db) => {
    const index = db.items.findIndex((i) => i.id === id)
    if (index === -1) throw Object.assign(new Error('Pièce introuvable'), { status: 404 })
    const item = normalizeItem({ ...db.items[index], ...payload, id }, { id })
    const clash = db.items.find((i) => i.id !== id && i.code.toLowerCase() === item.code.toLowerCase())
    if (clash) throw Object.assign(new Error(`Le code ${item.code} existe déjà`), { status: 409 })
    db.items[index] = item
    return item
  }, options)
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
    const [removed] = db.items.splice(index, 1)
    db.items.forEach((item) => {
      item.linkedItemIds = (item.linkedItemIds || []).filter((x) => x !== id)
    })
    return removed
  }, options)
}

export async function listPeople(options = {}) {
  const db = await readDb(options)
  return db.people
}

export async function createPerson(payload, options = {}) {
  return withDb((db) => {
    if (!payload?.nom?.trim()) throw Object.assign(new Error('Le nom est requis'), { status: 400 })
    const person = {
      id: randomUUID(),
      nom: payload.nom.trim(),
      role: payload.role || 'Membre',
      telephone: payload.telephone || '',
      email: payload.email || '',
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
    }
    db.people.push(person)
    return person
  }, options)
}

export async function updatePerson(id, payload, options = {}) {
  return withDb((db) => {
    const person = db.people.find((p) => p.id === id)
    if (!person) throw Object.assign(new Error('Personne introuvable'), { status: 404 })
    Object.assign(person, {
      nom: payload.nom?.trim() || person.nom,
      role: payload.role ?? person.role,
      telephone: payload.telephone ?? person.telephone,
      email: payload.email ?? person.email,
      notes: payload.notes ?? person.notes,
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
    }
  })
  return {
    ...loan,
    personName: person?.nom || '',
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
    const lines = []
    for (const itemId of itemIds) {
      const item = db.items.find((i) => i.id === itemId)
      if (!item) throw Object.assign(new Error('Pièce introuvable'), { status: 400 })
      if (item.disponibilite !== 'Disponible') {
        throw Object.assign(new Error(`${item.code} n'est pas disponible`), { status: 409 })
      }
      const comment = (payload.items || []).find((i) => (i.itemId || i.id) === itemId)?.comment || ''
      item.disponibilite = 'Emprunté'
      item.updatedAt = new Date().toISOString()
      lines.push({ itemId, comment, returnedAt: null })
    }
    const loan = {
      id: randomUUID(),
      titre: payload.titre || `Emprunt ${person.nom}`,
      personId: person.id,
      dateEmprunt: payload.dateEmprunt || new Date().toISOString().slice(0, 10),
      dateRetourPrevue: payload.dateRetourPrevue || '',
      dateRetour: null,
      statut: 'en_cours',
      items: lines,
      createdAt: new Date().toISOString(),
    }
    db.loans.push(loan)
    return decorateLoan(loan, db)
  }, options)
}

export async function returnLoanItems(loanId, itemIds, options = {}) {
  return withDb((db) => {
    const loan = db.loans.find((l) => l.id === loanId)
    if (!loan) throw Object.assign(new Error('Emprunt introuvable'), { status: 404 })
    const targets = itemIds?.length ? itemIds : loan.items.filter((i) => !i.returnedAt).map((i) => i.itemId)
    const now = new Date().toISOString()
    for (const itemId of targets) {
      const line = loan.items.find((i) => i.itemId === itemId)
      if (!line) continue
      line.returnedAt = now
      const item = db.items.find((i) => i.id === itemId)
      if (item) {
        item.disponibilite = 'Disponible'
        item.updatedAt = now
      }
    }
    const remaining = loan.items.some((i) => !i.returnedAt)
    loan.statut = remaining ? 'retour_partiel' : 'retourne'
    loan.dateRetour = remaining ? null : now.slice(0, 10)
    return decorateLoan(loan, db)
  }, options)
}

export async function getStats(options = {}) {
  const db = await readDb(options)
  const byCategory = db.items.reduce((acc, item) => {
    acc[item.categorie] = (acc[item.categorie] || 0) + 1
    return acc
  }, {})
  return {
    totalItems: db.items.length,
    byCategory,
    available: db.items.filter((i) => i.disponibilite === 'Disponible').length,
    borrowed: db.items.filter((i) => i.disponibilite === 'Emprunté').length,
    people: db.people.length,
    activeLoans: db.loans.filter((l) => l.statut !== 'retourne').length,
  }
}

export async function saveUpload({ filename, dataUrl }, options = {}) {
  await mkdir(options.uploadsDir || UPLOADS_DIR, { recursive: true })
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || '')
  if (!match) throw Object.assign(new Error('Image invalide'), { status: 400 })
  const ext = (filename || 'image').split('.').pop()?.toLowerCase() || 'png'
  const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'png'
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}.${safeExt}`
  const dest = path.join(options.uploadsDir || UPLOADS_DIR, id)
  await writeFile(dest, Buffer.from(match[2], 'base64'))
  return `/uploads/${id}`
}

export { emptyDb, ensureShape }
