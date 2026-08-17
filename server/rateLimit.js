const buckets = new Map()

export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, keyFn } = {}) {
  return function rateLimit(req, res, next) {
    const key = keyFn(req) || req.ip || 'global'
    const now = Date.now()
    let bucket = buckets.get(key)
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 }
      buckets.set(key, bucket)
    }
    bucket.count += 1
    if (bucket.count > max) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' })
      return
    }
    next()
  }
}

export function loginRateLimitKey(req) {
  const login = String(req.body?.login || '').trim().toLowerCase()
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || ''
  return `${ip}:${login || 'unknown'}`
}

export function resetRateLimits() {
  buckets.clear()
}
