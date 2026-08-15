import test from 'node:test'
import assert from 'node:assert/strict'
import { APP_SHORT_TITLE, APP_TITLE, GROUP_NAME } from './brand.js'

test('titre de l’application et nom du cercle', () => {
  assert.equal(
    APP_TITLE,
    'Gestion du patrimoine textiles et fournitures du cercle Korriganed Ar Meilhoù Glas',
  )
  assert.equal(GROUP_NAME, 'Korriganed Ar Meilhoù Glas')
  assert.equal(APP_SHORT_TITLE, 'Patrimoine textile')
  assert.match(APP_TITLE, new RegExp(GROUP_NAME))
})
