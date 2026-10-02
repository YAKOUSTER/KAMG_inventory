import { EVENT_KINDS, setRuntimeEventKinds } from './eventKinds.js'
import { EVENT_GROUPS, setRuntimeEventGroups } from './eventGroups.js'

export function slugCatalogId(label, fallback = 'item') {
  return (
    String(label || fallback)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .slice(0, 40) || fallback
  )
}

function cloneKind(entry, { builtin = false } = {}) {
  return {
    id: String(entry.id || '').trim(),
    label: String(entry.label || entry.id || '').trim(),
    family: String(entry.family || 'autre').trim() || 'autre',
    prefix: String(entry.prefix || '').trim(),
    groupes: Array.isArray(entry.groupes)
      ? [...new Set(entry.groupes.map((id) => String(id || '').trim()).filter(Boolean))]
      : [],
    color: String(entry.color || 'secondary').trim() || 'secondary',
    builtin,
  }
}

function cloneGroup(entry, { builtin = false } = {}) {
  return {
    id: String(entry.id || '').trim(),
    label: String(entry.label || entry.id || '').trim(),
    icon: String(entry.icon || 'mdi-account-group-outline').trim() || 'mdi-account-group-outline',
    builtin,
  }
}

export function normalizeEventCatalog(input = {}) {
  const kindsById = new Map(EVENT_KINDS.map((entry) => [entry.id, cloneKind(entry, { builtin: true })]))
  for (const raw of Array.isArray(input.kinds) ? input.kinds : []) {
    const id = slugCatalogId(raw.id || raw.label, '')
    if (!id) continue
    const current = kindsById.get(id)
    if (current) {
      kindsById.set(id, {
        ...current,
        label: String(raw.label || current.label).trim() || current.label,
        prefix: raw.prefix == null ? current.prefix : String(raw.prefix).trim(),
        family: String(raw.family || current.family).trim() || current.family,
        groupes: Array.isArray(raw.groupes) ? cloneKind({ ...current, groupes: raw.groupes }).groupes : current.groupes,
        color: String(raw.color || current.color).trim() || current.color,
      })
    } else {
      kindsById.set(id, cloneKind({ ...raw, id }, { builtin: false }))
    }
  }

  const groupsById = new Map(EVENT_GROUPS.map((entry) => [entry.id, cloneGroup(entry, { builtin: true })]))
  for (const raw of Array.isArray(input.groups) ? input.groups : []) {
    const id = slugCatalogId(raw.id || raw.label, '')
    if (!id || id === 'tous') {
      if (id === 'tous' && raw.label) {
        const current = groupsById.get('tous')
        groupsById.set('tous', { ...current, label: String(raw.label).trim() || current.label })
      }
      continue
    }
    const current = groupsById.get(id)
    if (current) {
      groupsById.set(id, {
        ...current,
        label: String(raw.label || current.label).trim() || current.label,
        icon: String(raw.icon || current.icon).trim() || current.icon,
      })
    } else {
      groupsById.set(id, cloneGroup({ ...raw, id }, { builtin: false }))
    }
  }

  return {
    kinds: [...kindsById.values()].filter((entry) => entry.id && entry.label),
    groups: [...groupsById.values()].filter(
      (entry) => entry.id && entry.label && entry.id !== 'monitorat',
    ),
  }
}

export function selectableEventGroups(catalog = normalizeEventCatalog()) {
  return (catalog.groups || []).filter((group) => group.id !== 'tous' && group.id !== 'monitorat')
}

export function parseCalendarGroupesQuery(value) {
  return [
    ...new Set(
      String(value || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ]
}

export function applyEventCatalog(input) {
  const catalog = normalizeEventCatalog(input)
  setRuntimeEventKinds(catalog.kinds)
  setRuntimeEventGroups(catalog.groups)
  return catalog
}
