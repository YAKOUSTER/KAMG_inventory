/**
 * Vacances scolaires — académie de Rennes (Bretagne), zone B.
 * Sources : arrêtés au Journal officiel / service-public.gouv.fr.
 *
 * Convention officielle : les vacances commencent le jour indiqué après les cours
 * (souvent un samedi) et les cours reprennent le matin du jour de fin.
 * On colorie donc [start, endExclusive[ : le lundi de rentrée n’est pas en vacances.
 */

export const RENNES_ACADEMY = {
  id: 'rennes',
  label: 'Académie de Rennes',
  zone: 'B',
  legend: 'Vacances scolaires · Académie de Rennes (zone B)',
}

export const HOLIDAY_STORAGE_KEY = 'kamg-agenda-holidays'

function period(id, kind, label, short, start, endExclusive, year) {
  return { id, kind, label, short, start, endExclusive, year }
}

/** Périodes officielles zone B, y compris l’été jusqu’à la rentrée suivante. */
export const RENNES_SCHOOL_HOLIDAYS = [
  period('toussaint-2024', 'toussaint', 'Vacances de la Toussaint', 'Toussaint', '2024-10-19', '2024-11-04', '2024-2025'),
  period('noel-2024', 'noel', 'Vacances de Noël', 'Noël', '2024-12-21', '2025-01-06', '2024-2025'),
  period('hiver-2025', 'hiver', 'Vacances d’hiver', 'Hiver', '2025-02-22', '2025-03-10', '2024-2025'),
  period('printemps-2025', 'printemps', 'Vacances de printemps', 'Printemps', '2025-04-19', '2025-05-05', '2024-2025'),
  period('pont-2025-05', 'pont', 'Jours sans classe', 'Pont', '2025-05-30', '2025-06-01', '2024-2025'),
  period('ete-2025', 'ete', 'Vacances d’été', 'Été', '2025-07-05', '2025-09-01', '2024-2025'),

  period('toussaint-2025', 'toussaint', 'Vacances de la Toussaint', 'Toussaint', '2025-10-18', '2025-11-03', '2025-2026'),
  period('noel-2025', 'noel', 'Vacances de Noël', 'Noël', '2025-12-20', '2026-01-05', '2025-2026'),
  period('hiver-2026', 'hiver', 'Vacances d’hiver', 'Hiver', '2026-02-14', '2026-03-02', '2025-2026'),
  period('printemps-2026', 'printemps', 'Vacances de printemps', 'Printemps', '2026-04-11', '2026-04-27', '2025-2026'),
  period('pont-2026-05', 'pont', 'Jours sans classe', 'Pont', '2026-05-15', '2026-05-17', '2025-2026'),
  period('ete-2026', 'ete', 'Vacances d’été', 'Été', '2026-07-04', '2026-09-01', '2025-2026'),

  period('toussaint-2026', 'toussaint', 'Vacances de la Toussaint', 'Toussaint', '2026-10-17', '2026-11-02', '2026-2027'),
  period('noel-2026', 'noel', 'Vacances de Noël', 'Noël', '2026-12-19', '2027-01-04', '2026-2027'),
  period('hiver-2027', 'hiver', 'Vacances d’hiver', 'Hiver', '2027-02-20', '2027-03-08', '2026-2027'),
  period('printemps-2027', 'printemps', 'Vacances de printemps', 'Printemps', '2027-04-17', '2027-05-03', '2026-2027'),
  period('pont-2027-05', 'pont', 'Jour sans classe', 'Pont', '2027-05-07', '2027-05-08', '2026-2027'),
  period('ete-2027', 'ete', 'Vacances d’été', 'Été', '2027-07-03', '2027-09-02', '2026-2027'),

  period('toussaint-2027', 'toussaint', 'Vacances de la Toussaint', 'Toussaint', '2027-10-23', '2027-11-08', '2027-2028'),
  period('noel-2027', 'noel', 'Vacances de Noël', 'Noël', '2027-12-18', '2028-01-03', '2027-2028'),
  period('hiver-2028', 'hiver', 'Vacances d’hiver', 'Hiver', '2028-02-05', '2028-02-21', '2027-2028'),
  period('printemps-2028', 'printemps', 'Vacances de printemps', 'Printemps', '2028-04-08', '2028-04-24', '2027-2028'),
  period('pont-2028-05', 'pont', 'Jours sans classe', 'Pont', '2028-05-26', '2028-05-28', '2027-2028'),
  period('ete-2028', 'ete', 'Vacances d’été', 'Été', '2028-07-04', '2028-09-04', '2027-2028'),
]

export function holidayOnDay(isoDay, periods = RENNES_SCHOOL_HOLIDAYS) {
  const day = String(isoDay || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return periods.find((entry) => day >= entry.start && day < entry.endExclusive) || null
}

export function isSchoolHoliday(isoDay, periods = RENNES_SCHOOL_HOLIDAYS) {
  return Boolean(holidayOnDay(isoDay, periods))
}

export function holidayLabel(isoDay, periods = RENNES_SCHOOL_HOLIDAYS) {
  return holidayOnDay(isoDay, periods)?.label || ''
}

export function holidayShortLabel(isoDay, periods = RENNES_SCHOOL_HOLIDAYS) {
  const period = holidayOnDay(isoDay, periods)
  return period?.short || period?.label || ''
}

export function readStoredHolidaysVisible(key = HOLIDAY_STORAGE_KEY, fallback = true) {
  if (typeof sessionStorage === 'undefined') return fallback
  try {
    const value = sessionStorage.getItem(key)
    if (value === '0') return false
    if (value === '1') return true
    return fallback
  } catch {
    return fallback
  }
}

export function writeStoredHolidaysVisible(key, value) {
  if (!key || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}
