import webpush from 'web-push'
import { canReceivePushNotifications, publicUser } from '../src/domain/auth.js'

export function getVapidConfig() {
  const publicKey = process.env.KAMG_VAPID_PUBLIC_KEY || ''
  const privateKey = process.env.KAMG_VAPID_PRIVATE_KEY || ''
  const subject = process.env.KAMG_VAPID_SUBJECT || 'mailto:sterenn.fonseca@gmail.com'
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject }
}

export function isPushEnabled() {
  return Boolean(getVapidConfig())
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
