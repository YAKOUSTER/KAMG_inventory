export function eventCreateBatchKey(event) {
  const batchId = String(event?.createdBatchId || '').trim()
  if (batchId) return `id:${batchId}`
  const created = String(event?.createdAt || '').slice(0, 19)
  if (!created) return ''
  const titre = String(event?.titre || '').trim()
  const kinds = [...(event?.kinds || [])].sort().join(',')
  return `t:${created}|${titre}|${kinds}`
}

export function eventsInCreateBatch(events = [], event) {
  if (!event) return []
  const key = eventCreateBatchKey(event)
  if (!key) return [event]
  const matched = (events || []).filter((entry) => eventCreateBatchKey(entry) === key)
  return matched.length ? matched : [event]
}
