import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  defaultRecurrenceUntil,
  expandRecurringDates,
  recurrenceSummary,
  recurrenceWeekdayLabel,
  shiftEventTimes,
} from './recurrence.js'
import { todayLocal } from './dates.js'

describe('recurrence', () => {
  const friday = new Date(2026, 8, 4, 18, 0, 0).toISOString()

  it('résume une répétition hebdomadaire ou une semaine sur deux', () => {
    assert.equal(recurrenceWeekdayLabel(friday), 'vendredi')
    assert.equal(recurrenceSummary(friday, { freq: 'weekly' }), 'Toutes les semaines le vendredi')
    assert.equal(recurrenceSummary(friday, { freq: 'biweekly' }), '1 semaine sur 2 le vendredi')
  })

  it('étend toutes les semaines jusqu’à une date', () => {
    const dates = expandRecurringDates(friday, { freq: 'weekly', until: '2026-09-18' })
    assert.equal(dates.length, 3)
    assert.equal(recurrenceWeekdayLabel(dates[1]), 'vendredi')
    assert.equal(recurrenceWeekdayLabel(dates[2]), 'vendredi')
  })

  it('saute les dates exclues', () => {
    const all = expandRecurringDates(friday, { freq: 'weekly', until: '2026-09-18' })
    const skipDay = todayLocal(new Date(all[1]))
    const dates = expandRecurringDates(friday, {
      freq: 'weekly',
      until: '2026-09-18',
      except: [skipDay],
    })
    assert.equal(dates.length, 2)
    assert.equal(recurrenceWeekdayLabel(dates[0]), 'vendredi')
    assert.equal(recurrenceWeekdayLabel(dates[1]), 'vendredi')
    assert.ok(!dates.some((iso) => todayLocal(new Date(iso)) === skipDay))
    assert.match(recurrenceSummary(friday, { freq: 'weekly', except: [skipDay] }), /sauf le /)
  })

  it('étend 1 semaine sur 2', () => {
    const dates = expandRecurringDates(friday, { freq: 'biweekly', until: '2026-10-02' })
    assert.equal(dates.length, 3)
  })

  it('décale la fin en conservant la durée', () => {
    const start = new Date(2026, 8, 4, 18, 0, 0).toISOString()
    const end = new Date(2026, 8, 4, 20, 0, 0).toISOString()
    const next = new Date(2026, 8, 11, 18, 0, 0).toISOString()
    const shifted = shiftEventTimes(start, end, next)
    assert.equal(shifted.debut, next)
    assert.equal(new Date(shifted.fin).getHours(), 20)
  })

  it('propose la fin de saison au 30 juin', () => {
    assert.equal(defaultRecurrenceUntil(new Date(2026, 8, 4).toISOString()), '2027-06-30')
    assert.equal(defaultRecurrenceUntil(new Date(2027, 2, 10).toISOString()), '2027-06-30')
  })
})
