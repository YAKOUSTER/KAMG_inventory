import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  iosNeedsHomeScreen,
  pushToggleSubtitle,
  pushUnsupportedMessage,
} from './pushHints.js'

describe('indications notifications téléphone', () => {
  it('détecte Safari iPhone hors écran d’accueil', () => {
    assert.equal(
      iosNeedsHomeScreen({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        standalone: false,
        displayMode: 'browser',
      }),
      true,
    )
    assert.equal(
      iosNeedsHomeScreen({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        standalone: true,
        displayMode: 'standalone',
      }),
      false,
    )
  })

  it('explique l’écran d’accueil quand iPhone n’a pas installé l’app', () => {
    assert.match(
      pushToggleSubtitle({ supported: false, iosTab: true }),
      /écran d’accueil/,
    )
    assert.match(pushUnsupportedMessage({ iosTab: true }), /kamg\.fr/)
  })

  it('rappelle À ranger une fois les notifications activées', () => {
    assert.match(
      pushToggleSubtitle({ supported: true, enabled: true, subscribed: true }),
      /À ranger/,
    )
    assert.match(
      pushToggleSubtitle({ supported: true, enabled: true, subscribed: false }),
      /À ranger/,
    )
  })
})
