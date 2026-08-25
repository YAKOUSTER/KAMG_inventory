import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  RENNES_ACADEMY,
  RENNES_SCHOOL_HOLIDAYS,
  holidayOnDay,
  holidayShortLabel,
  isSchoolHoliday,
} from './schoolHolidays.js'

describe('vacances scolaires Rennes (zone B)', () => {
  it('identifie l’académie de Rennes en zone B', () => {
    assert.equal(RENNES_ACADEMY.zone, 'B')
    assert.match(RENNES_ACADEMY.legend, /Rennes/)
  })

  it('marque le 25 août 2026 comme vacances d’été jusqu’à la rentrée du 1er septembre', () => {
    assert.equal(holidayOnDay('2026-08-25')?.kind, 'ete')
    assert.equal(isSchoolHoliday('2026-08-31'), true)
    assert.equal(isSchoolHoliday('2026-09-01'), false)
  })

  it('colorie les jours de vacances, pas le lundi de reprise', () => {
    assert.equal(isSchoolHoliday('2026-02-14'), true)
    assert.equal(holidayShortLabel('2026-02-14'), 'Hiver')
    assert.equal(isSchoolHoliday('2026-03-01'), true)
    assert.equal(isSchoolHoliday('2026-03-02'), false)
    assert.equal(holidayOnDay('2026-03-02'), null)
  })

  it('couvre Toussaint, Noël, printemps et été zone B 2026-2027', () => {
    assert.equal(holidayOnDay('2026-10-17')?.kind, 'toussaint')
    assert.equal(isSchoolHoliday('2026-11-02'), false)
    assert.equal(holidayOnDay('2026-12-19')?.kind, 'noel')
    assert.equal(isSchoolHoliday('2027-01-04'), false)
    assert.equal(holidayOnDay('2027-04-17')?.kind, 'printemps')
    assert.equal(holidayOnDay('2027-07-03')?.kind, 'ete')
    assert.equal(isSchoolHoliday('2027-09-01'), true)
    assert.equal(isSchoolHoliday('2027-09-02'), false)
  })

  it('marque le vendredi sans classe du 7 mai 2027', () => {
    assert.equal(holidayOnDay('2027-05-07')?.kind, 'pont')
    assert.equal(isSchoolHoliday('2027-05-08'), false)
  })

  it('a des périodes ordonnées sans trou de dates invalides', () => {
    for (const period of RENNES_SCHOOL_HOLIDAYS) {
      assert.match(period.start, /^\d{4}-\d{2}-\d{2}$/)
      assert.match(period.endExclusive, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(period.start < period.endExclusive, period.id)
    }
  })
})
