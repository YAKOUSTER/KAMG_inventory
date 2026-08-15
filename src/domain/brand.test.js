import test from 'node:test'
import assert from 'node:assert/strict'
import { APP_TITLE, GROUP_NAME } from './brand.js'

test('titre de l’application et nom du cercle', () => {
  assert.equal(APP_TITLE, 'Patrimoine textile')
  assert.equal(GROUP_NAME, 'Korriganed Ar Meilhoù Glas')
})
