import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { addDays, displayDate, displayTime, formatDate, todayLocal } from './dates.js'

describe('todayLocal', () => {
  it('utilise le calendrier local, pas UTC', () => {
    const winter = new Date(2026, 0, 15, 0, 30)
    assert.equal(todayLocal(winter), '2026-01-15')
    const late = new Date(2026, 7, 15, 23, 30)
    assert.equal(todayLocal(late), '2026-08-15')
  })
})

describe('addDays', () => {
  it('ajoute des jours sans passer par UTC', () => {
    assert.equal(addDays('2026-08-15', 7), '2026-08-22')
    assert.equal(addDays('2026-08-30', 2), '2026-09-01')
  })
})

describe('displayDate', () => {
  it('affiche jour/mois/année', () => {
    assert.equal(formatDate('2026-08-15T18:00:00.000Z'), '2026-08-15')
    assert.equal(displayDate('2026-08-15T18:00:00.000Z'), '15/08/2026')
  })
})

describe('displayTime', () => {
  it('affiche l’heure locale', () => {
    const stamp = new Date(2026, 7, 15, 18, 5).toISOString()
    assert.equal(displayTime(stamp), '18:05')
  })
})
