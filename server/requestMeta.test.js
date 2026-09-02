import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { clientIp, isLoopbackAddress, requestOrigin } from './requestMeta.js'

describe('adresse client', () => {
  it('reconnaît le loopback IPv4 et IPv6', () => {
    assert.equal(isLoopbackAddress('127.0.0.1'), true)
    assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true)
    assert.equal(isLoopbackAddress('::1'), true)
    assert.equal(isLoopbackAddress('203.0.113.9'), false)
  })

  it('ignore X-Forwarded-For hors reverse-proxy local', () => {
    assert.equal(
      clientIp({
        socket: { remoteAddress: '203.0.113.9' },
        headers: { 'x-forwarded-for': '198.51.100.1' },
      }),
      '203.0.113.9',
    )
  })

  it('fait confiance à X-Forwarded-For depuis nginx en local', () => {
    assert.equal(
      clientIp({
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'x-forwarded-for': '198.51.100.1, 127.0.0.1' },
      }),
      '198.51.100.1',
    )
  })
})

describe('origine publique', () => {
  it('privilégie KAMG_PUBLIC_URL', () => {
    const previous = process.env.KAMG_PUBLIC_URL
    process.env.KAMG_PUBLIC_URL = 'https://kamg.example/'
    try {
      assert.equal(
        requestOrigin({
          socket: { remoteAddress: '127.0.0.1' },
          headers: { host: 'evil.test', 'x-forwarded-host': 'phishing.test' },
        }),
        'https://kamg.example',
      )
    } finally {
      if (previous == null) delete process.env.KAMG_PUBLIC_URL
      else process.env.KAMG_PUBLIC_URL = previous
    }
  })

  it('ignore X-Forwarded-Host si la requête n’arrive pas du proxy local', () => {
    const previous = process.env.KAMG_PUBLIC_URL
    delete process.env.KAMG_PUBLIC_URL
    try {
      assert.equal(
        requestOrigin({
          socket: { remoteAddress: '203.0.113.9' },
          headers: { host: 'kamg.example', 'x-forwarded-host': 'phishing.test' },
          secure: true,
        }),
        'https://kamg.example',
      )
    } finally {
      if (previous != null) process.env.KAMG_PUBLIC_URL = previous
    }
  })
})
