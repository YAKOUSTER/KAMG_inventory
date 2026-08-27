import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'
import { canReceivePushNotifications, publicUser } from '../src/domain/auth.js'

const DEFAULT_SUBJECT = 'mailto:sterenn.fonseca@gmail.com'

function dataDir() {
  return process.env.KAMG_DATA_DIR
    ? path.resolve(process.env.KAMG_DATA_DIR)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data')
}

export function vapidFilePath() {
  return path.join(dataDir(), 'vapid.env')
}

function parseEnvFile(text) {
  const out = {}
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

function keysFromSource(source = {}) {
  const publicKey = String(source.KAMG_VAPID_PUBLIC_KEY || '').trim()
  const privateKey = String(source.KAMG_VAPID_PRIVATE_KEY || '').trim()
  const subject = String(source.KAMG_VAPID_SUBJECT || '').trim() || DEFAULT_SUBJECT
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject }
}

export function getVapidConfig() {
  const fromEnv = keysFromSource(process.env)
  if (fromEnv) return fromEnv
  const file = vapidFilePath()
  if (!existsSync(file)) return null
  try {
    return keysFromSource(parseEnvFile(readFileSync(file, 'utf8')))
  } catch {
    return null
  }
}

export function isPushEnabled() {
  return Boolean(getVapidConfig())
}

export function ensureVapidKeys() {
  const existing = getVapidConfig()
  if (existing) return existing
  const generated = webpush.generateVAPIDKeys()
  const subject = String(process.env.KAMG_VAPID_SUBJECT || '').trim() || DEFAULT_SUBJECT
  const file = vapidFilePath()
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(
    file,
    [
      `KAMG_VAPID_PUBLIC_KEY=${generated.publicKey}`,
      `KAMG_VAPID_PRIVATE_KEY=${generated.privateKey}`,
      `KAMG_VAPID_SUBJECT=${subject}`,
      '',
    ].join('\n'),
    { encoding: 'utf8', mode: 0o640 },
  )
  return getVapidConfig()
}

function subscriptionPayload(entry) {
  return {
    endpoint: entry.endpoint,
    keys: entry.keys,
  }
}

export async function sendPushNotification(subscription, payload) {
  const vapid = getVapidConfig()
  if (!vapid) return false
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
  await webpush.sendNotification(subscription, JSON.stringify(payload))
  return true
}

export function managerSubscriptions(db) {
  const usersById = new Map((db.users || []).map((user) => [user.id, user]))
  return (db.pushSubscriptions || []).filter((entry) => {
    const user = usersById.get(entry.userId)
    return user && canReceivePushNotifications(publicUser(user))
  })
}

export async function notifyManagers(db, payload) {
  if (!isPushEnabled()) return { sent: 0, skipped: 'disabled' }
  const targets = managerSubscriptions(db)
  let sent = 0
  const stale = []

  for (const entry of targets) {
    try {
      await sendPushNotification(subscriptionPayload(entry), payload)
      sent += 1
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        stale.push(entry.id)
      }
    }
  }

  if (stale.length) {
    db.pushSubscriptions = (db.pushSubscriptions || []).filter((entry) => !stale.includes(entry.id))
  }

  return { sent, stale: stale.length }
}

export function normalizePushSubscription(input = {}, { id, userId } = {}) {
  const endpoint = String(input.endpoint || '').trim()
  const p256dh = String(input.keys?.p256dh || '').trim()
  const auth = String(input.keys?.auth || '').trim()
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Abonnement push invalide')
  }
  return {
    id: id || input.id,
    userId,
    endpoint,
    keys: { p256dh, auth },
    userAgent: String(input.userAgent || '').slice(0, 240),
    createdAt: input.createdAt || new Date().toISOString(),
  }
}
