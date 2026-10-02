import { randomUUID } from 'node:crypto'
import { personDisplayName } from '../src/domain/person.js'

export const MAX_AUDIT_ENTRIES = 2000

export function ensureAuditLog(db) {
  if (!Array.isArray(db.auditLog)) db.auditLog = []
}

export function appendAudit(db, actor, entry) {
  if (!actor?.id && !actor?.userId) return
  ensureAuditLog(db)
  db.auditLog.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    actor: {
      userId: actor.id || actor.userId,
      login: actor.login,
      nom: actor.nom || actor.login,
    },
    ...entry,
  })
  if (db.auditLog.length > MAX_AUDIT_ENTRIES) {
    db.auditLog.length = MAX_AUDIT_ENTRIES
  }
}

export function itemLabel(item) {
  if (!item) return 'Pièce'
  return `${item.code} — ${item.nom}`
}

export function personLabel(person) {
  return personDisplayName(person) || 'Personne'
}

export function loanLabel(loan, person) {
  if (!loan) return 'Emprunt'
  return (loan.titre || '').trim() || `Emprunt — ${personLabel(person)}`
}

export function userLabel(user) {
  if (!user) return 'Compte'
  return user.nom || user.login
}

export function codesForItems(db, itemIds = []) {
  return itemIds
    .map((id) => db.items.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => item.code)
}
