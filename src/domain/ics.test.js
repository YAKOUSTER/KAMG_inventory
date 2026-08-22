import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseIcsEvents, inferEventType } from './ics.js'
import { googleCalendarAddEventUrl, buildSingleEventIcs } from './agendaSettings.js'

const sample = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20251101T163000Z
DTEND:20251101T173000Z
UID:test@google.com
SUMMARY:Répétition Ado+Tremplin #4
LOCATION:Brit Hotel Keraudet
DESCRIPTION:Répétition mixte
END:VEVENT
END:VCALENDAR`

describe('parseIcsEvents', () => {
  it('parse un VEVENT Google', () => {
    const events = parseIcsEvents(sample)
    assert.equal(events.length, 1)
    assert.equal(events[0].source, 'google')
    assert.equal(events[0].type, 'repetition')
    assert.ok(events[0].groupes.includes('ado'))
    assert.ok(events[0].groupes.includes('tremplin'))
  })
})

describe('inferEventType', () => {
  it('détecte sortie et répétition', () => {
    assert.equal(inferEventType('Gwennyn spectacle'), 'sortie')
    assert.equal(inferEventType('Répétition hommes'), 'repetition')
  })
})

describe('calendar links', () => {
  it('génère une URL Google et un fichier ICS', () => {
    const event = {
      id: 'evt-1',
      titre: 'Test',
      debut: '2026-09-10T17:30:00.000Z',
      fin: '2026-09-10T19:30:00.000Z',
      lieu: 'Quimper',
      description: 'Infos',
    }
    assert.match(googleCalendarAddEventUrl(event), /calendar\.google\.com/)
    assert.match(buildSingleEventIcs(event), /BEGIN:VEVENT/)
  })
})
