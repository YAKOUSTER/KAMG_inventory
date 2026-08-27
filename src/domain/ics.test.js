import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseIcsEvents,
  inferEventType,
  buildCalendarIcs,
  buildSingleEventIcs,
  eventIcsUid,
  foldIcsLine,
  icsLinesRespectOctetLimit,
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
    assert.equal(ics, 'https://kamg.sterennfonseca.fr/calendrier.ics')
    assert.equal(
      appCalendarWebcalUrl('https://kamg.sterennfonseca.fr'),
      'webcal://kamg.sterennfonseca.fr/calendrier.ics',
    )
    const google = googleCalendarSubscribeFromIcsUrl(ics)
    assert.equal(google, ics)
    assert.ok(!google.includes('calendar.google.com'))
    assert.ok(!google.includes('webcal://'))
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

  it('filtre le flux ICS par groupes', () => {
    const events = [
      {
        id: 'ado-1',
        titre: 'Répétition ado',
        debut: '2026-09-10T17:30:00.000Z',
        publie: true,
        groupes: ['ado'],
      },
      {
        id: 'tremplin-1',
        titre: 'Répétition tremplin',
        debut: '2026-09-11T17:30:00.000Z',
        publie: true,
        groupes: ['tremplin'],
      },
    ]
    const all = buildCalendarIcs(events, { calName: 'KAMG' })
    assert.match(all, /Répétition ado/)
    assert.match(all, /Répétition tremplin/)
    const adoOnly = buildCalendarIcs(events, { calName: 'KAMG', groupes: ['ado'] })
    assert.match(adoOnly, /Répétition ado/)
    assert.doesNotMatch(adoOnly, /Répétition tremplin/)
    assert.equal(
      appCalendarIcsUrl('https://kamg.sterennfonseca.fr', ['ado', 'tremplin']),
      'https://kamg.sterennfonseca.fr/calendrier.ics?groupes=ado%2Ctremplin',
    )
  })

  it('plie les lignes trop longues', () => {
    const folded = foldIcsLine(`SUMMARY:${'A'.repeat(90)}`)
    assert.ok(folded.includes('\r\n '))
    assert.ok(icsLinesRespectOctetLimit(folded))
  })

  it('plie les descriptions accentuées sous 75 octets, comme l’exige Google', () => {
    const description = [
      'Initiation à la danse sur un bal de rhuys de 15h40 à 15h55 avec ✨',
      'Programme de l’après-midi pour les intéressé :',
      'Voici le programme entier de l’après-midi pour ceux qui le veulent',
      '- Initiations aux danses bretonnes par les cercles présents',
      'Ouverture des portes : 13h30',
    ].join('\n')
    const ics = buildCalendarIcs([
      {
        id: 'long-1',
        titre: 'Répétition Ado+Tremplin — Quimper',
        debut: '2026-09-10T17:30:00.000Z',
        fin: '2026-09-10T17:30:00.000Z',
        publie: true,
        description,
        lieu: 'Salle Bleue Moulin-Vert',
      },
    ])
    assert.ok(icsLinesRespectOctetLimit(ics), 'une ligne dépasse 75 octets UTF-8')
    assert.match(ics, /DTEND:20260910T183000Z/)
    assert.match(ics, /DTSTART:20260910T173000Z/)
  })
})
