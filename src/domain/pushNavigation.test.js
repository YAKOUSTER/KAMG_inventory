import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PUSH_NAVIGATE_TYPE,
  appPathFromNotificationUrl,
  notificationOpenUrl,
  pushNavigateMessage,
} from './pushNavigation.js'

describe('navigation depuis une notification', () => {
  const origin = 'https://kamg.fr'

  it('ouvre À ranger sur le même site', () => {
    assert.equal(appPathFromNotificationUrl('/a-ranger', origin), '/a-ranger')
    assert.equal(appPathFromNotificationUrl('https://kamg.fr/a-ranger', origin), '/a-ranger')
    assert.equal(notificationOpenUrl('/a-ranger', origin), 'https://kamg.fr/a-ranger')
    assert.deepEqual(pushNavigateMessage('/a-ranger'), { type: PUSH_NAVIGATE_TYPE, url: '/a-ranger' })
  })

  it('refuse une URL hors site', () => {
    assert.equal(appPathFromNotificationUrl('https://evil.example/a-ranger', origin), '/')
    assert.equal(appPathFromNotificationUrl('//evil.example/a-ranger', origin), '/')
  })
})
