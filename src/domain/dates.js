export function todayLocal(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(isoDate, days, now = new Date()) {
  const base = isoDate || todayLocal(now)
  const [year, month, day] = base.split('-').map(Number)
  if (!year || !month || !day) return todayLocal(now)
  return todayLocal(new Date(year, month - 1, day + Number(days || 0)))
}

export function formatDate(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function displayDate(value) {
  const iso = formatDate(value)
  if (!iso || iso.length < 10) return iso
  const [year, month, day] = iso.split('-')
  if (!day) return iso
  return `${day}/${month}/${year}`
}

export function displayDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return displayDate(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}
