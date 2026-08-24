import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseIcsEvents,
  inferEventType,
  buildCalendarIcs,
  buildSingleEventIcs,
  eventIcsUid,
  foldIcsLine,
} from './ics.js'
import {
  googleCalendarAddEventUrl,
  appCalendarIcsUrl,
  appCalendarWebcalUrl,
  googleCalendarSubscribeFromIcsUrl,
} from './agendaSettings.js'

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
    assert.equal(events[0].titre, 'Répétition Ado+Tremplin #4')
    assert.deepEqual(events[0].kinds, [])
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

  it('pointe l’abonnement Google et iOS vers le flux de l’app', () => {
    const ics = appCalendarIcsUrl('https://kamg.sterennfonseca.fr')
    assert.equal(ics, 'https://kamg.sterennfonseca.fr/api/public/calendar.ics')
    assert.equal(
      appCalendarWebcalUrl('https://kamg.sterennfonseca.fr'),
      'webcal://kamg.sterennfonseca.fr/api/public/calendar.ics',
    )
    assert.match(googleCalendarSubscribeFromIcsUrl(ics), /calendar\.google\.com/)
    assert.ok(googleCalendarSubscribeFromIcsUrl(ics).includes(encodeURIComponent(ics)))
  })
})

describe('buildCalendarIcs', () => {
  it('publie seulement les événements visibles et conserve un UID stable', () => {
    const ics = buildCalendarIcs(
      [
        {
          id: 'evt-1',
          titre: 'Fest-noz',
          debut: '2026-09-10T17:30:00.000Z',
          fin: '2026-09-10T19:30:00.000Z',
          lieu: 'Quimper',
          publie: true,
          googleUid: 'stable@google.com',
        },
        {
          id: 'evt-draft',
          titre: 'Brouillon',
          debut: '2026-09-11T17:30:00.000Z',
          publie: false,
        },
      ],
      { calName: 'KAMG' },
    )
    assert.match(ics, /BEGIN:VCALENDAR/)
    assert.match(ics, /X-WR-CALNAME:KAMG/)
    assert.match(ics, /SUMMARY:Fest-noz/)
    assert.match(ics, /UID:stable@google.com/)
    assert.doesNotMatch(ics, /Brouillon/)
    assert.doesNotMatch(
      buildCalendarIcs([
        { id: 'bad', titre: 'Sans titre', debut: '1970-01-01T00:00:00.000Z', publie: true },
      ]),
      /Sans titre/,
    )
    assert.equal(eventIcsUid({ id: 'abc', googleUid: '' }), 'kamg-abc@kamg.sterennfonseca.fr')
  })

  it('plie les lignes trop longues', () => {
    const folded = foldIcsLine(`SUMMARY:${'A'.repeat(90)}`)
    assert.ok(folded.includes('\r\n '))
  })
})
