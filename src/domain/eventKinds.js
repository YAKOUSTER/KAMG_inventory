export const EVENT_KINDS = [
  {
    id: 'repetition_concours',
    label: 'Répétition concours',
    family: 'repetition',
    prefix: 'Répétition Concours',
    groupes: ['concours'],
    color: 'primary',
  },
  {
    id: 'repetition_tremplin_ado',
    label: 'Répétition tremplin/ado',
    family: 'repetition',
    prefix: 'Répétition Tremplin/Ado',
    groupes: ['tremplin', 'ado'],
    color: 'primary',
  },
  {
    id: 'repetition_bugale',
    label: 'Répétition Bugale',
    family: 'repetition',
    prefix: 'Répétition Bugale',
    groupes: ['enfant'],
    color: 'primary',
  },
  {
    id: 'repetition_korrigan',
    label: 'Répétition Korrigan',
    family: 'repetition',
    prefix: 'Répétition Korrigan',
    groupes: ['korrigan'],
    color: 'primary',
  },
  {
    id: 'repetition_ado',
    label: 'Répétition ado',
    family: 'repetition',
    prefix: 'Répétition Ado',
    groupes: ['ado'],
    color: 'primary',
  },
  {
    id: 'repetition_loisir_a',
    label: 'Répétition loisir - groupe A',
    family: 'repetition',
    prefix: 'Répétition Loisirs - Groupe A',
    groupes: ['loisir'],
    color: 'primary',
  },
  {
    id: 'repetition_loisir_b',
    label: 'Répétition loisir - groupe B',
    family: 'repetition',
    prefix: 'Répétition Loisirs - Groupe B',
    groupes: ['loisir'],
    color: 'primary',
  },
  {
    id: 'atelier_couture',
    label: 'Atelier couture',
    family: 'atelier',
    prefix: 'Atelier couture',
    groupes: [],
    color: 'brown',
  },
  {
    id: 'atelier_broderie',
    label: 'Atelier broderie',
    family: 'atelier',
    prefix: 'Atelier broderie',
    groupes: [],
    color: 'brown',
  },
  {
    id: 'atelier_special',
    label: 'Atelier spécial',
    family: 'atelier',
    prefix: 'Atelier spécial',
    groupes: [],
    color: 'brown',
  },
  {
    id: 'sortie',
    label: 'Sortie',
    family: 'sortie',
    prefix: '[SORTIE]',
    groupes: ['sortie'],
    color: 'deep-orange',
  },
  {
    id: 'fest_noz',
    label: 'Fest-noz (hors cercle)',
    family: 'sortie',
    prefix: '[FEST-NOZ]',
    groupes: ['sortie'],
    color: 'deep-orange',
  },
  {
    id: 'concours',
    label: 'Concours',
    family: 'concours',
    prefix: '[CONCOURS]',
    groupes: ['concours'],
    color: 'amber',
  },
  {
    id: 'stage',
    label: 'Stage',
    family: 'stage',
    prefix: '[STAGE]',
    groupes: [],
    color: 'purple',
  },
]

const COMBINED_PREFIXES = [
  'Répétition Loisirs - Tous',
  'Répétition Loisirs - Groupe A',
  'Répétition Loisirs - Groupe B',
  'Répétition Korrigan/Bugale',
  'Répétition Tremplin/Ado',
  'Répétition Concours',
  'Répétition Korrigan',
  'Répétition Bugale',
  'Répétition Ado',
  '[CONCOURS]',
  '[FEST-NOZ]',
  '[SORTIE]',
  '[STAGE]',
  'Atelier broderie',
  'Atelier couture',
  'Atelier spécial',
]

const BUILTIN_KIND_IDS = new Set(EVENT_KINDS.map((entry) => entry.id))

let runtimeKinds = null

export function setRuntimeEventKinds(kinds) {
  runtimeKinds = Array.isArray(kinds) && kinds.length ? kinds : null
}

export function activeEventKinds() {
  return runtimeKinds || EVENT_KINDS
}

export function eventKindMeta(id) {
  const key = String(id || '').trim()
  return activeEventKinds().find((entry) => entry.id === key) || EVENT_KINDS.find((entry) => entry.id === key) || null
}

export function eventKindLabel(id) {
  return eventKindMeta(id)?.label || id
}

export function normalizeEventKinds(value) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  const ids = new Set([...EVENT_KINDS, ...activeEventKinds()].map((entry) => entry.id))
  return [...new Set(list.map((id) => String(id || '').trim()).filter((id) => ids.has(id)))]
}

export function eventTitlePrefix(kinds = []) {
  const set = new Set(normalizeEventKinds(kinds))
  const prefixes = []

  if (set.has('repetition_concours')) prefixes.push('Répétition Concours')

  const loisirA = set.has('repetition_loisir_a')
  const loisirB = set.has('repetition_loisir_b')
  if (loisirA && loisirB) prefixes.push('Répétition Loisirs - Tous')
  else if (loisirA) prefixes.push('Répétition Loisirs - Groupe A')
  else if (loisirB) prefixes.push('Répétition Loisirs - Groupe B')

  if (set.has('repetition_tremplin_ado')) prefixes.push('Répétition Tremplin/Ado')
  if (set.has('repetition_ado')) prefixes.push('Répétition Ado')

  const korrigan = set.has('repetition_korrigan')
  const bugale = set.has('repetition_bugale')
  if (korrigan && bugale) prefixes.push('Répétition Korrigan/Bugale')
  else if (korrigan) prefixes.push('Répétition Korrigan')
  else if (bugale) prefixes.push('Répétition Bugale')

  if (set.has('concours')) prefixes.push('[CONCOURS]')
  if (set.has('fest_noz')) prefixes.push('[FEST-NOZ]')
  else if (set.has('sortie')) prefixes.push('[SORTIE]')
  if (set.has('stage')) prefixes.push('[STAGE]')
  if (set.has('atelier_broderie')) prefixes.push('Atelier broderie')
  if (set.has('atelier_couture')) prefixes.push('Atelier couture')
  if (set.has('atelier_special')) prefixes.push('Atelier spécial')

  for (const id of set) {
    if (BUILTIN_KIND_IDS.has(id)) continue
    const prefix = eventKindMeta(id)?.prefix
    if (prefix && !prefixes.includes(prefix)) prefixes.push(prefix)
  }

  return prefixes.join(' ')
}

function knownPrefixes() {
  return [...COMBINED_PREFIXES].sort((a, b) => b.length - a.length)
}

export function eventTitleRest(titre = '') {
  let rest = String(titre || '').trim()
  let changed = true
  const prefixes = knownPrefixes()
  while (changed && rest) {
    changed = false
    for (const prefix of prefixes) {
      if (rest === prefix) return ''
      if (rest.startsWith(`${prefix} `) || rest.startsWith(`${prefix}\u00a0`)) {
        rest = rest.slice(prefix.length).trim()
        changed = true
        break
      }
    }
  }
  return rest
}

export function applyEventTitlePrefix(titre, kinds = []) {
  const prefix = eventTitlePrefix(kinds)
  const rest = eventTitleRest(titre)
  if (!prefix) return rest
  if (!rest) return prefix
  return `${prefix} ${rest}`
}

export function primaryTypeFromKinds(kinds = [], fallback = 'autre') {
  const set = new Set(normalizeEventKinds(kinds))
  if (set.has('fest_noz') || set.has('sortie')) return 'sortie'
  if (set.has('concours')) return 'concours'
  if (set.has('stage')) return 'stage'
  if ([...set].some((id) => id.startsWith('atelier_'))) return 'atelier'
  if ([...set].some((id) => id.startsWith('repetition_'))) return 'repetition'
  return fallback
}

export function kindsAreRepetition(kinds = []) {
  return normalizeEventKinds(kinds).some((id) => String(id).startsWith('repetition_'))
}

export function kindsAreAtelier(kinds = []) {
  return normalizeEventKinds(kinds).some((id) => {
    const family = eventKindMeta(id)?.family
    return family === 'atelier' || String(id).startsWith('atelier_')
  })
}

export function kindsAllowRecurrence(kinds = []) {
  return kindsAreRepetition(kinds) || kindsAreAtelier(kinds)
}

export function groupesFromKinds(kinds = []) {
  const groups = []
  for (const id of normalizeEventKinds(kinds)) {
    const meta = eventKindMeta(id)
    for (const group of meta?.groupes || []) {
      if (!groups.includes(group)) groups.push(group)
    }
  }
  return groups
}

export function eventKindsOf(event) {
  const stored = normalizeEventKinds(event?.kinds)
  if (stored.length) return stored
  return inferEventKinds(event?.titre, event?.description, event?.type)
}

export function eventKindSelectItems() {
  return activeEventKinds().map((entry) => ({ title: entry.label, value: entry.id }))
}

export function eventKindFilterItems() {
  return [{ title: 'Tout', value: 'Tout' }, ...eventKindSelectItems()]
}

export function eventHasKind(event, kindId) {
  return eventKindsOf(event).includes(kindId)
}

export function eventIsSortie(event) {
  return eventHasKind(event, 'sortie') || eventHasKind(event, 'fest_noz') || event?.type === 'sortie'
}

export function eventIsFestNoz(event) {
  return eventHasKind(event, 'fest_noz')
}

export function eventIsHorsCercle(event) {
  if (!event) return false
  if (event.horsCercle === true) return true
  if (event.horsCercle === false) return false
  return eventIsFestNoz(event)
}

export function inferEventKinds(titre = '', description = '', type = '') {
  const text = `${titre} ${description}`.toLowerCase()
  const kinds = []
  if (/atelier/.test(text) && /broderie/.test(text)) kinds.push('atelier_broderie')
  if (/atelier/.test(text) && /couture/.test(text)) kinds.push('atelier_couture')
  if (/atelier/.test(text) && /spécial|special/.test(text)) kinds.push('atelier_special')
  if (/\bstage\b/.test(text) || type === 'stage') kinds.push('stage')
  if (/\[concours\]/.test(text) || (/\bconcours\b/.test(text) && !/répétition|repetition/.test(text))) {
    kinds.push('concours')
  }
  if (/fest-?noz/.test(text)) kinds.push('fest_noz')
  else if (/\[sortie\]/.test(text) || type === 'sortie' || /sortie|spectacle|défilé|defile|festival/.test(text)) {
    kinds.push('sortie')
  }
  if (/répétition|repetition/.test(text) || type === 'repetition') {
    if (/concours/.test(text)) kinds.push('repetition_concours')
    if (/tremplin/.test(text)) kinds.push('repetition_tremplin_ado')
    if (/\bbugale\b/.test(text)) kinds.push('repetition_bugale')
    if (/korrigan/.test(text)) kinds.push('repetition_korrigan')
    if (/\bado\b/.test(text) && !/tremplin/.test(text)) kinds.push('repetition_ado')
    if (/loisir/.test(text) && /groupe\s*b|\bgroupe b\b/.test(text)) kinds.push('repetition_loisir_b')
    else if (/loisir/.test(text) && /groupe\s*a|\bgroupe a\b/.test(text)) kinds.push('repetition_loisir_a')
    else if (/loisir/.test(text) && /tous/.test(text)) {
      kinds.push('repetition_loisir_a', 'repetition_loisir_b')
    }
  }
  if (type === 'sortie' && !kinds.includes('sortie')) kinds.push('sortie')
  if (type === 'stage' && !kinds.includes('stage')) kinds.push('stage')
  return normalizeEventKinds(kinds)
}

export function eventMatchesKindFilter(event, filter) {
  if (!filter || filter === 'Tout') return true
  if (event?.type === filter) return true
  const kinds = eventKindsOf(event)
  if (kinds.includes(filter)) return true
  return kinds.some((id) => eventKindMeta(id)?.family === filter)
}
