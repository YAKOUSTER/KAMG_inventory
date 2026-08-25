import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  eventDateBadge,
  eventsInMonth,
  eventsOnDay,
  groupEventsByDay,
  groupEventsByMonth,
  isAgendaView,
  listGroupsByDay,
  monthCells,
  periodLabel,
  shiftPeriod,
  startOfWeek,
  toLocalDay,
  weekDays,
  yearMonths,
} from './calendarViews.js'

describe('eventDateBadge', () => {
  it('expose le jour façon Spond', () => {
    const badge = eventDateBadge({ debut: '2026-10-08T12:00:00.000Z' })
    assert.ok(badge.day)
    assert.ok(badge.weekday)
    assert.ok(badge.month)
  })
})

describe('toLocalDay', () => {
  it('garde une date calendaire et lit un ISO', () => {
    assert.equal(toLocalDay('2026-04-14'), '2026-04-14')
    assert.equal(toLocalDay('2026-04-14T18:00:00.000Z').length, 10)
  })
})

describe('semaine', () => {
  it('commence le lundi', () => {
    assert.equal(startOfWeek('2026-08-26'), '2026-08-24')
    assert.deepEqual(weekDays('2026-08-26')[0], '2026-08-24')
    assert.deepEqual(weekDays('2026-08-26')[6], '2026-08-30')
  })
})

describe('mois et année', () => {
  it('produit une grille de 42 jours', () => {
    const cells = monthCells(2026, 4)
    assert.equal(cells.length, 42)
    assert.ok(cells.some((cell) => cell.iso === '2026-04-01' && cell.inMonth))
    assert.ok(cells[0].iso <= '2026-04-01')
  })

  it('produit 12 mois', () => {
    assert.equal(yearMonths(2026).length, 12)
    assert.equal(yearMonths(2026)[3].label, 'Avril')
  })
})

describe('événements', () => {
  const events = [
    { id: 'a', titre: 'Sortie', debut: '2026-04-14T18:00:00.000Z' },
    { id: 'b', titre: 'Rep', debut: '2026-04-14T16:00:00.000Z' },
    { id: 'c', titre: 'Mai', debut: '2026-05-02T10:00:00.000Z' },
  ]

  it('regroupe par jour en triant l’heure', () => {
    const byDay = groupEventsByDay(events)
    const day = toLocalDay('2026-04-14T18:00:00.000Z')
    assert.equal(eventsOnDay(byDay, day).length, 2)
    assert.equal(eventsOnDay(byDay, day)[0].id, 'b')
    assert.equal(eventsOnDay(byDay, day)[1].id, 'a')
  })

  it('garde deux événements distincts le même jour dans la liste', () => {
    const groups = listGroupsByDay(events)
    assert.equal(groups[0].events.length, 2)
    assert.deepEqual(
      groups[0].events.map((event) => event.id),
      ['b', 'a'],
    )
  })

  it('regroupe la liste par mois', () => {
    const groups = groupEventsByMonth(events)
    assert.equal(groups.length, 2)
    assert.match(groups[0].label, /Avril 2026/)
    assert.equal(groups[1].events[0].id, 'c')
  })
})

describe('navigation', () => {
  it('décale semaine, mois et année', () => {
    assert.equal(shiftPeriod('semaine', '2026-08-24', 1), '2026-08-31')
    assert.equal(shiftPeriod('mois', '2026-08-15', 1), '2026-09-01')
    assert.equal(shiftPeriod('annee', '2026-08-15', -1).startsWith('2025-'), true)
    assert.match(periodLabel('mois', '2026-04-14'), /Avril 2026/)
    assert.equal(periodLabel('annee', '2026-04-14'), '2026')
    assert.match(periodLabel('semaine', '2026-08-26'), /24/)
    assert.equal(isAgendaView('mois'), true)
    assert.equal(isAgendaView('jour'), false)
  })
})

describe('filtre mois', () => {
  it('ne garde que le mois courant', () => {
    const events = [
      { id: 'a', debut: '2026-04-02T10:00:00.000Z' },
      { id: 'b', debut: '2026-05-02T10:00:00.000Z' },
    ]
    assert.deepEqual(
      eventsInMonth(events, '2026-04-14').map((event) => event.id),
      ['a'],
    )
  })
})
