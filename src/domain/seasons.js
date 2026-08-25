export function seasonIdFromStartYear(startYear) {
  const year = Number(startYear)
  if (!Number.isFinite(year)) return ''
  return `${year}-${year + 1}`
}

export function seasonStartYear(id) {
  const match = String(id || '').trim().match(/^(\d{4})-(\d{4})$/)
  if (!match) return null
  const start = Number(match[1])
  const end = Number(match[2])
  if (end !== start + 1) return null
  return start
}

export function parseSeasonId(value) {
  const raw = String(value || '').trim()
  if (seasonStartYear(raw) != null) return raw
  if (/^\d{4}$/.test(raw)) return seasonIdFromStartYear(raw)
  return ''
}

export function seasonLabel(value, now = new Date()) {
  const date = value ? new Date(value) : now
  const source = Number.isNaN(date.getTime()) ? now : date
  const year = source.getMonth() >= 8 ? source.getFullYear() : source.getFullYear() - 1
  return seasonIdFromStartYear(year)
}

export function currentSeasonId(now = new Date()) {
  return seasonLabel(undefined, now)
}

export function newSeasonId(now = new Date()) {
  const month = now.getMonth()
  if (month >= 6 && month < 8) return seasonIdFromStartYear(now.getFullYear())
  return currentSeasonId(now)
}

export function membershipSeasons(now = new Date(), span = 12) {
  const newest = now.getFullYear() + 1
  const list = []
  for (let start = newest; start >= newest - span; start -= 1) list.push(seasonIdFromStartYear(start))
  return list
}

export function normalizeSeasons(input, fallbackYear) {
  const fromArray = Array.isArray(input) ? input : []
  const values = fromArray.map(parseSeasonId).filter(Boolean)
  if (!values.length) {
    const migrated = parseSeasonId(fallbackYear)
    if (migrated) values.push(migrated)
  }
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

export function hasEarlierSeasonThan(saisons, seasonId) {
  const start = seasonStartYear(seasonId)
  if (start == null) return false
  return (saisons || []).some((id) => {
    const year = seasonStartYear(id)
    return year != null && year < start
  })
}

export function isFirstYearOfSeason(saisons = [], seasonId) {
  if (!saisons.includes(seasonId)) return false
  return !hasEarlierSeasonThan(saisons, seasonId)
}
