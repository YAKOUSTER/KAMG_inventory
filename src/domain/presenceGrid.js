import { eventAcceptsInscriptions } from './events.js'
import { todayLocal } from './dates.js'
import { WEEKDAY_LABELS, eventTimeLabel, parseLocalDay, toLocalDay } from './calendarViews.js'
import { presenceStatutMeta } from './presence.js'

export function presenceCellKey(eventId, personId) {
  return `${eventId}::${personId}`
}

export function indexPresences(presences = []) {
  const map = new Map()
  for (const entry of presences) {
    if (!entry?.eventId || !entry?.personId) continue
    map.set(presenceCellKey(entry.eventId, entry.personId), entry)
  }
  return map
}

export function cyclePresenceStatut(current) {
  if (current === 'present') return 'absent'
  if (current === 'absent') return 'maybe'
  if (current === 'maybe') return ''
  return 'present'
}

export function statutFromGridKey(key) {
  if (key === '1') return 'present'
  if (key === '0') return 'absent'
  if (key === '?') return 'maybe'
  if (key === 'Delete' || key === 'Backspace' || key === ' ' || key === 'Space') return ''
  return null
}

export function moveGridFocus(row, col, rowCount, colCount, dRow = 0, dCol = 0) {
  if (!rowCount || !colCount) return { row: 0, col: 0 }
  return {
    row: Math.min(rowCount - 1, Math.max(0, Number(row) + Number(dRow))),
    col: Math.min(colCount - 1, Math.max(0, Number(col) + Number(dCol))),
  }
}

export function inscriptionEventsForGrid(events = [], now = new Date()) {
  const today = todayLocal(now)
  return [...events]
    .filter((event) => eventAcceptsInscriptions(event))
    .filter((event) => {
      const day = toLocalDay(event.debut)
      return day && day >= today
    })
    .sort((a, b) => String(a.debut || '').localeCompare(String(b.debut || '')))
}

export function presenceColumnMeta(event) {
  const day = toLocalDay(event?.debut)
  const parsed = parseLocalDay(day)
  const weekday = parsed ? WEEKDAY_LABELS[(parsed.date.getDay() + 6) % 7] : ''
  const dateLabel = parsed
    ? `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}`
    : day
  return {
    id: event?.id,
    event,
    day,
    weekday,
    dateLabel,
    timeLabel: eventTimeLabel(event),
    titre: event?.titre || '',
  }
}

export function cellShortLabel(statut) {
  return presenceStatutMeta(statut)?.short || ''
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildPresenceSheetPrintHtml({
  title = 'Feuille de présences',
  groupLabel = 'Tous',
  generatedAt = '',
  columns = [],
  rows = [],
  cells = {},
} = {}) {
  const header = columns
    .map((column) => {
      const when = [column.weekday, column.dateLabel, column.timeLabel].filter(Boolean).join(' ')
      return `<th><div>${escapeHtml(when)}</div><div>${escapeHtml(column.titre)}</div></th>`
    })
    .join('')
  const body = rows
    .map((row) => {
      const tds = columns
        .map((column) => `<td>${escapeHtml(cells[presenceCellKey(column.id, row.id)] || '')}</td>`)
        .join('')
      return `<tr><th>${escapeHtml(row.name)}</th>${tds}</tr>`
    })
    .join('')
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: "Segoe UI", system-ui, sans-serif; color: #2c332c; margin: 16px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p { margin: 0 0 12px; font-size: 12px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #c5c9be; padding: 4px 6px; text-align: center; }
    th:first-child, td:first-child { text-align: left; white-space: nowrap; }
    thead th { background: #eef1ea; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(groupLabel)}${generatedAt ? ` · ${escapeHtml(generatedAt)}` : ''}</p>
  <table>
    <thead><tr><th>Personne</th>${header}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`
}

export function openPresenceSheetPrint(html) {
  if (typeof document === 'undefined') return
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  doc.open()
  doc.write(html)
  doc.close()
  setTimeout(() => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 1500)
  }, 250)
}
