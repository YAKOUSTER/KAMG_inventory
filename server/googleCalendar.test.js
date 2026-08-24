import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchGoogleCalendarEvents, resetGoogleCalendarCache } from './googleCalendar.js'

const SAMPLE_ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20251101T163000Z
DTEND:20251101T173000Z
UID:test@google.com
SUMMARY:Répétition Ado+Tremplin #4
LOCATION:Brit Hotel Keraudet
END:VEVENT
END:VCALENDAR`

describe('fetchGoogleCalendarEvents', () => {
  beforeEach(() => resetGoogleCalendarCache())
  afterEach(() => resetGoogleCalendarCache())

  it('parse le flux ICS public Google', async () => {
    const events = await fetchGoogleCalendarEvents(
      { googleCalendarId: 'korriganedarmeilhouglas.site@gmail.com' },
      {
        ttlMs: 0,
        fetchImpl: async () => ({ ok: true, text: async () => SAMPLE_ICS }),
      },
    )
    assert.equal(events.length, 1)
    assert.equal(events[0].source, 'google')
    assert.equal(events[0].titre, 'Répétition Ado+Tremplin #4')
  })
})
