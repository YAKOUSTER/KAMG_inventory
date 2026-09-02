import { api } from '@/services/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js')
}

export async function getPushStatus() {
  if (!pushSupported()) {
    return { supported: false, enabled: false, subscribed: false, permission: 'unsupported' }
  }
  const config = await api.pushConfig()
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscribed = Boolean(await registration?.pushManager.getSubscription())
  return {
    supported: true,
    enabled: config.enabled,
    subscribed,
    permission: Notification.permission,
  }
}

export async function enablePushNotifications() {
  if (!pushSupported()) {
    throw new Error('Notifications non supportées sur cet appareil ou navigateur.')
  }
  const config = await api.pushConfig()
  if (!config.enabled) {
    throw new Error('Notifications non configurées sur le serveur (clés VAPID manquantes).')
  }
  await navigator.serviceWorker.register('/sw.js')
  const registration = await navigator.serviceWorker.ready
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Autorisation refusée. Activez les notifications dans les réglages du téléphone.')
  }
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    })
  }
  await api.pushSubscribe(subscription.toJSON())
  return getPushStatus()
}

export async function disablePushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await api.pushUnsubscribe({ endpoint: subscription.endpoint })
    await subscription.unsubscribe()
  }
  return getPushStatus()
}
