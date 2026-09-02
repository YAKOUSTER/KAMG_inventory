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

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
      return undefined
    }),
  )
})
