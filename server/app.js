import express from 'express'
import path from 'node:path'
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  listPeople,
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
  listLoans,
  getLoan,
  createLoan,
  returnLoanItems,
  updateLoan,
  cancelLoan,
  getStats,
  exportDb,
  importDb,
  saveUpload,
  readDb,
  login,
  logout,
  userFromToken,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  adjustStock,
  getBootstrap,
  getReferentiels,
  updateReferentiels,
  listAudit,
  clearAudit,
  getPublicMemberSpace,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  listEventPresences,
  setEventPresence,
  listContentPages,
  getContentPage,
  createContentPage,
  updateContentPage,
  deleteContentPage,
  getAgendaSettings,
  updateAgendaSettings,
  syncGoogleCalendar,
  getPushConfig,
  subscribePush,
  unsubscribePush,
  dataPaths,
} from './store.js'
import { can, canReceivePushNotifications } from '../src/domain/auth.js'
import { securityHeaders } from './security.js'
import { createRateLimiter, loginRateLimitKey, resetRateLimits } from './rateLimit.js'

export { resetRateLimits }

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

function bearer(req) {
  const header = req.headers.authorization || ''
  const [, token] = header.match(/^Bearer\s+(.+)$/i) || []
  return token || ''
}

function authManagerPush(req, res, next) {
  return auth()(req, res, () => {
    if (!canReceivePushNotifications(req.user)) {
      res.status(403).json({ error: 'Réservé aux gestionnaires' })
      return
    }
    next()
  })
}

function auth(permission) {
  return async (req, res, next) => {
    try {
      const user = await userFromToken(bearer(req))
      if (!user) {
        res.status(401).json({ error: 'Connexion requise' })
        return
      }
      req.user = user
      if (permission && !can(user, permission)) {
        res.status(403).json({ error: 'Accès refusé' })
        return
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

function authUpload(req, res, next) {
  return auth()(req, res, () => {
    if (can(req.user, 'items.create') || can(req.user, 'items.update') || can(req.user, 'people.write')) {
      next()
      return
    }
    res.status(403).json({ error: 'Accès refusé' })
  })
}

export function createApiApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(securityHeaders)
  app.use(express.json({ limit: '15mb' }))
  app.use('/uploads', (req, res, next) => {
    express.static(dataPaths().uploadsDir)(req, res, next)
  })

  app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'json' }))
  app.get(
    '/api/public/espace-membre',
    createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 120,
      keyFn: (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'public-member',
    }),
    handle(() => getPublicMemberSpace()),
  )
  app.post(
    '/api/public/events/:id/presence',
    createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 60,
      keyFn: (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'public-presence',
    }),
    handle((req) => setEventPresence(req.params.id, req.body || {})),
  )
  app.post(
    '/api/auth/login',
    createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, keyFn: loginRateLimitKey }),
    handle((req) => login(req.body?.login, req.body?.password)),
  )
  app.post(
    '/api/auth/logout',
    handle((req) => logout(bearer(req))),
  )
  app.get(
    '/api/auth/me',
    auth(),
    handle((req) => req.user),
  )
  app.get(
    '/api/bootstrap',
    auth(),
    handle(async (req) => ({ user: req.user, ...(await getBootstrap(req.user)) })),
  )

  app.get('/api/stats', auth('items.read'), handle(() => getStats()))
  app.get('/api/db', auth('settings.manage'), handle(() => exportDb()))
  app.put(
    '/api/db',
    auth('settings.manage'),
    handle((req) => importDb(req.body, { actor: req.user })),
  )
  app.get(
    '/api/referentiels',
    auth('items.read'),
    handle(() => getReferentiels()),
  )
  app.put(
    '/api/referentiels',
    auth('settings.manage'),
    handle((req) => updateReferentiels(req.body, { actor: req.user })),
  )

  app.get('/api/items', auth('items.read'), handle(() => listItems()))
  app.get(
    '/api/items/:id',
    auth('items.read'),
    handle(async (req) => {
      const item = await getItem(req.params.id)
      if (!item) throw Object.assign(new Error('Pièce introuvable'), { status: 404 })
      return item
    }),
  )
  app.post(
    '/api/items',
    auth('items.create'),
    handle((req) => createItem(req.body, { actor: req.user })),
  )
  app.put(
    '/api/items/:id',
    auth('items.update'),
    handle((req) => updateItem(req.params.id, req.body, { actor: req.user })),
  )
  app.post(
    '/api/items/:id/stock',
    auth('items.update'),
    handle((req) => adjustStock(req.params.id, req.body, { actor: req.user })),
  )
  app.delete(
    '/api/items/:id',
    auth('items.delete'),
    handle((req) => deleteItem(req.params.id, { actor: req.user })),
  )

  app.get('/api/people', auth('people.read'), handle(() => listPeople()))
  app.get(
    '/api/people/:id',
    auth('people.read'),
    handle(async (req) => {
      const person = await getPerson(req.params.id)
      if (!person) throw Object.assign(new Error('Personne introuvable'), { status: 404 })
      return person
    }),
  )
  app.post(
    '/api/people',
    auth('people.write'),
    handle((req) => createPerson(req.body, { actor: req.user })),
  )
  app.put(
    '/api/people/:id',
    auth('people.write'),
    handle((req) => updatePerson(req.params.id, req.body, { actor: req.user })),
  )
  app.delete(
    '/api/people/:id',
    auth('people.write'),
    handle((req) => deletePerson(req.params.id, { actor: req.user })),
  )

  app.get('/api/loans', auth('loans.read'), handle(() => listLoans()))
  app.get(
    '/api/loans/:id',
    auth('loans.read'),
    handle(async (req) => {
      const loan = await getLoan(req.params.id)
      if (!loan) throw Object.assign(new Error('Emprunt introuvable'), { status: 404 })
      return loan
    }),
  )
  app.post(
    '/api/loans',
    auth('loans.write'),
    handle((req) => createLoan(req.body, { actor: req.user })),
  )
  app.put(
    '/api/loans/:id/return',
    auth('loans.write'),
    handle((req) =>
      returnLoanItems(req.params.id, req.body?.itemIds, {
        dateRetour: req.body?.dateRetour,
        updates: req.body?.updates,
        actor: req.user,
      }),
    ),
  )
  app.put(
    '/api/loans/:id',
    auth('loans.manage'),
    handle((req) => updateLoan(req.params.id, req.body, { actor: req.user })),
  )
  app.delete(
    '/api/loans/:id',
    auth('loans.manage'),
    handle((req) => cancelLoan(req.params.id, { actor: req.user })),
  )

  app.get('/api/events', auth('agenda.read'), handle(() => listEvents()))
  app.get(
    '/api/events/:id',
    auth('agenda.read'),
    handle(async (req) => {
      const event = await getEvent(req.params.id)
      if (!event) throw Object.assign(new Error('Événement introuvable'), { status: 404 })
      return event
    }),
  )
  app.post(
    '/api/events',
    auth('agenda.write'),
    handle((req) => createEvent(req.body, { actor: req.user })),
  )
  app.put(
    '/api/events/:id',
    auth('agenda.write'),
    handle((req) => updateEvent(req.params.id, req.body, { actor: req.user })),
  )
  app.delete(
    '/api/events/:id',
    auth('agenda.write'),
    handle((req) => deleteEvent(req.params.id, { actor: req.user })),
  )
  app.get(
    '/api/events/:id/presences',
    auth('agenda.read'),
    handle((req) => listEventPresences(req.params.id)),
  )
  app.put(
    '/api/events/:id/presences',
    auth('agenda.write'),
    handle((req) => setEventPresence(req.params.id, req.body || {}, { actor: req.user })),
  )

  app.get('/api/pages', auth('content.read'), handle(() => listContentPages()))
  app.get(
    '/api/pages/:id',
    auth('content.read'),
    handle(async (req) => {
      const page = await getContentPage(req.params.id)
      if (!page) throw Object.assign(new Error('Contenu introuvable'), { status: 404 })
      return page
    }),
  )
  app.post(
    '/api/pages',
    auth('content.write'),
    handle((req) => createContentPage(req.body, { actor: req.user })),
  )
  app.put(
    '/api/pages/:id',
    auth('content.write'),
    handle((req) => updateContentPage(req.params.id, req.body, { actor: req.user })),
  )
  app.delete(
    '/api/pages/:id',
    auth('content.write'),
    handle((req) => deleteContentPage(req.params.id, { actor: req.user })),
  )

  app.get('/api/settings/agenda', auth('settings.manage'), handle(() => getAgendaSettings()))
  app.put(
    '/api/settings/agenda',
    auth('settings.manage'),
    handle((req) => updateAgendaSettings(req.body, { actor: req.user })),
  )
  app.post('/api/agenda/sync', auth('agenda.write'), handle(() => syncGoogleCalendar()))

  app.get('/api/push/config', authManagerPush, handle((req) => getPushConfig(req.user)))
  app.post(
    '/api/push/subscribe',
    authManagerPush,
    handle((req) =>
      subscribePush(req.user, req.body, { userAgent: req.headers['user-agent'] || '' }),
    ),
  )
  app.delete(
    '/api/push/subscribe',
    authManagerPush,
    handle((req) => unsubscribePush(req.user, req.body)),
  )

  app.get(
    '/api/audit',
    auth('audit.read'),
    handle((req) =>
      listAudit({
        limit: req.query.limit,
        offset: req.query.offset,
        action: req.query.action,
        entityType: req.query.entityType,
      }),
    ),
  )
  app.delete('/api/audit', auth('audit.manage'), handle(() => clearAudit({ actor: req.user })))

  app.post('/api/uploads', authUpload, handle((req) => saveUpload(req.body)))

  app.get('/api/users', auth('users.manage'), handle(() => listUsers()))
  app.post(
    '/api/users',
    auth('users.manage'),
    handle((req) => createUser(req.body, { actor: req.user })),
  )
  app.put(
    '/api/users/:id',
    auth('users.manage'),
    handle((req) => updateUser(req.params.id, req.body, { actor: req.user })),
  )
  app.delete(
    '/api/users/:id',
    auth('users.manage'),
    handle((req) => deleteUser(req.params.id, { actor: req.user })),
  )

  app.use((error, _req, res, _next) => {
    const status = error.status || 500
    res.status(status).json({ error: error.message || 'Erreur interne' })
  })

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
