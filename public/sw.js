self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() || {}
  const title = payload.title || 'KAMG'
  const options = {
    body: payload.body || '',
    icon: '/apple-touch-icon.png',
    badge: '/favicon.png',
    data: { url: payload.url || '/' },
  }
  if (payload.tag) {
    options.tag = payload.tag
    options.renotify = true
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

function appPathFromNotificationUrl(url) {
  const raw = String(url || '/').trim() || '/'
  try {
    const parsed = new URL(raw, self.location.origin)
    if (parsed.origin !== self.location.origin) return '/'
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/'
  } catch {
    return '/'
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = appPathFromNotificationUrl(event.notification.data?.url)
  const target = new URL(path, self.location.origin).href
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const sameOrigin = clientsList.filter((client) => {
        try {
          return new URL(client.url).origin === self.location.origin
        } catch {
          return false
        }
      })
      const client = sameOrigin.find((entry) => entry.focused) || sameOrigin[0]
      if (client) {
        if ('focus' in client) {
          try {
            await client.focus()
          } catch {
            /* iOS peut ignorer focus() */
          }
        }
        client.postMessage({ type: 'KAMG_NAVIGATE', url: path })
        return
      }
      if (self.clients.openWindow) await self.clients.openWindow(target)
    })(),
  )
})
