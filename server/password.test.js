import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, randomToken } from './password.js'

test('hashPassword et verifyPassword', async () => {
  const hash = await hashPassword('secret-test')
  assert.match(hash, /^[0-9a-f]+:[0-9a-f]+$/)
  assert.equal(await verifyPassword('secret-test', hash), true)
  assert.equal(await verifyPassword('wrong', hash), false)
  assert.equal(await verifyPassword('secret-test', ''), false)
})

test('randomToken produit des valeurs uniques', () => {
  const a = randomToken()
  const b = randomToken()
  assert.notEqual(a, b)
  assert.equal(a.length, 64)
})
