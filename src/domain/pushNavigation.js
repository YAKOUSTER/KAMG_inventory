export const PUSH_NAVIGATE_TYPE = 'KAMG_NAVIGATE'
export const PUSH_NAVIGATE_EVENT = 'kamg:push-navigate'

export function appPathFromNotificationUrl(url, origin) {
  const raw = String(url || '/').trim() || '/'
  const fallback = '/'
  try {
    const base = origin || 'https://kamg.fr'
    const parsed = new URL(raw, base)
    const expectedOrigin = new URL(base).origin
    if (parsed.origin !== expectedOrigin) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback
  } catch {
    return fallback
  }
}

export function notificationOpenUrl(path, origin) {
  const safePath = appPathFromNotificationUrl(path, origin)
  try {
    return new URL(safePath, origin).href
  } catch {
    return origin
  }
}

export function pushNavigateMessage(url) {
  return { type: PUSH_NAVIGATE_TYPE, url: appPathFromNotificationUrl(url) }
}
