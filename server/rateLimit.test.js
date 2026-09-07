import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createRateLimiter,
  loginRateLimitKey,
  pruneRateLimitBuckets,
  rateLimitBucketCount,
  resetRateLimits,
} from './rateLimit.js'

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

describe('rate limiter', () => {
  it('bloque au-delà du maximum puis se réinitialise', () => {
    resetRateLimits()
    const limit = createRateLimiter({ windowMs: 60_000, max: 2, keyFn: () => 'test' })
    const ok = []
    for (let i = 0; i < 2; i += 1) {
      const res = mockRes()
      limit({ ip: '1' }, res, () => ok.push(true))
      assert.equal(res.statusCode, 200)
    }
    const blocked = mockRes()
    limit({ ip: '1' }, blocked, () => {
      throw new Error('ne devrait pas passer')
    })
    assert.equal(blocked.statusCode, 429)
  })

  it('évince les buckets expirés', () => {
    resetRateLimits()
    const limit = createRateLimiter({ windowMs: 10, max: 5, keyFn: (req) => req.key })
    for (let i = 0; i < 30; i += 1) {
      limit({ key: `k${i}` }, mockRes(), () => {})
    }
    assert.ok(rateLimitBucketCount() >= 30)
    pruneRateLimitBuckets(Date.now() + 50)
    assert.equal(rateLimitBucketCount(), 0)
  })

  it('ne laisse pas X-Forwarded-For inventer une autre clé hors proxy local', () => {
    const spoofed = {
      body: { login: 'admin' },
      socket: { remoteAddress: '203.0.113.9' },
      headers: { 'x-forwarded-for': '198.51.100.1' },
    }
    const other = {
      body: { login: 'admin' },
      socket: { remoteAddress: '203.0.113.9' },
      headers: { 'x-forwarded-for': '192.0.2.8' },
    }
    assert.equal(loginRateLimitKey(spoofed), loginRateLimitKey(other))
    assert.match(loginRateLimitKey(spoofed), /^203\.0\.113\.9:/)
  })
})
