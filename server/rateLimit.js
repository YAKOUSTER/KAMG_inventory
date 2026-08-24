const buckets = new Map()
const MAX_BUCKETS = 2000

function pruneBuckets(now) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > bucket.windowMs) buckets.delete(key)
  }
  if (buckets.size <= MAX_BUCKETS) return
  const extra = buckets.size - Math.floor(MAX_BUCKETS / 2)
  let removed = 0
  for (const key of buckets.keys()) {
    buckets.delete(key)
    removed += 1
    if (removed >= extra) break
  }
}

export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, keyFn } = {}) {
  return function rateLimit(req, res, next) {
    const key = keyFn(req) || req.ip || 'global'
    const now = Date.now()
    if (buckets.size > 400) pruneBuckets(now)
    let bucket = buckets.get(key)
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0, windowMs }
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

export function rateLimitBucketCount() {
  return buckets.size
}

export function pruneRateLimitBuckets(now = Date.now()) {
  pruneBuckets(now)
}
