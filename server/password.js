import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(String(password), salt, 32)).toString('hex')
  return `${salt}:${hash}`
}

export async function verifyPassword(password, stored) {
  if (!stored || !String(stored).includes(':')) return false
  const [salt, hash] = String(stored).split(':')
  const check = await scryptAsync(String(password), salt, 32)
  if (check.length !== Buffer.from(hash, 'hex').length) return false
  return timingSafeEqual(Buffer.from(hash, 'hex'), check)
}

export function randomToken() {
  return randomBytes(32).toString('hex')
}
