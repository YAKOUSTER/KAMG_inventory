import express from 'express'
import path from 'node:path'
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  listPeople,
  createPerson,
  updatePerson,
  deletePerson,
  listLoans,
  getLoan,
  createLoan,
  returnLoanItems,
  getStats,
  exportDb,
  importDb,
  saveUpload,
  readDb,
  UPLOADS_DIR,
} from './store.js'

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res)
      if (result !== undefined) res.json(result)
    } catch (error) {
      const status = error.status || 500
      res.status(status).json({ error: error.message || 'Erreur interne' })
    }
  }
}

export function createApiApp() {
  const app = express()
  app.use(express.json({ limit: '15mb' }))
  app.use('/uploads', express.static(UPLOADS_DIR))

  app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'json' }))
  app.get('/api/stats', handle(() => getStats()))
  app.get('/api/db', handle(() => exportDb()))
  app.put(
    '/api/db',
    handle((req) => importDb(req.body)),
  )
  app.get(
    '/api/referentiels',
    handle(async () => (await readDb()).referentiels),
  )

  app.get('/api/items', handle(() => listItems()))
  app.get(
    '/api/items/:id',
    handle(async (req) => {
      const item = await getItem(req.params.id)
      if (!item) throw Object.assign(new Error('Pièce introuvable'), { status: 404 })
      return item
    }),
  )
  app.post(
    '/api/items',
    handle((req) => createItem(req.body)),
  )
  app.put(
    '/api/items/:id',
    handle((req) => updateItem(req.params.id, req.body)),
  )
  app.delete(
    '/api/items/:id',
    handle((req) => deleteItem(req.params.id)),
  )

  app.get('/api/people', handle(() => listPeople()))
  app.post(
    '/api/people',
    handle((req) => createPerson(req.body)),
  )
  app.put(
    '/api/people/:id',
    handle((req) => updatePerson(req.params.id, req.body)),
  )
  app.delete(
    '/api/people/:id',
    handle((req) => deletePerson(req.params.id)),
  )

  app.get('/api/loans', handle(() => listLoans()))
  app.get(
    '/api/loans/:id',
    handle(async (req) => {
      const loan = await getLoan(req.params.id)
      if (!loan) throw Object.assign(new Error('Emprunt introuvable'), { status: 404 })
      return loan
    }),
  )
  app.post(
    '/api/loans',
    handle((req) => createLoan(req.body)),
  )
  app.put(
    '/api/loans/:id/return',
    handle((req) => returnLoanItems(req.params.id, req.body?.itemIds)),
  )

  app.post(
    '/api/uploads',
    handle((req) => saveUpload(req.body)),
  )

  return app
}

export function createProductionApp(distDir) {
  const app = createApiApp()
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
  return app
}
