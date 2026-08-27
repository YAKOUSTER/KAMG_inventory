export const EVENT_GROUPS = [
  { id: 'tous', label: 'Tous', icon: 'mdi-calendar-multiselect' },
  { id: 'korrigan', label: 'Korrigan', icon: 'mdi-star-outline' },
  { id: 'enfant', label: 'Enfant', icon: 'mdi-human-child' },
  { id: 'ado', label: 'Ado', icon: 'mdi-account-school-outline' },
  { id: 'tremplin', label: 'Tremplin', icon: 'mdi-stairs-up' },
  { id: 'concours', label: 'Concours', icon: 'mdi-trophy-outline' },
  { id: 'loisir', label: 'Loisir', icon: 'mdi-heart-outline' },
  { id: 'gwennyn', label: 'Gwennyn', icon: 'mdi-flower-outline' },
  { id: 'sortie', label: 'Sortie', icon: 'mdi-drama-masks' },
  { id: 'commission', label: 'Commission', icon: 'mdi-clipboard-text-outline' },
]

let runtimeGroups = null

export function setRuntimeEventGroups(groups) {
  runtimeGroups = Array.isArray(groups) && groups.length ? groups : null
}

export function activeEventGroups() {
  return runtimeGroups || EVENT_GROUPS
}

export function eventGroupLabel(id) {
  const key = String(id || '').trim()
  return activeEventGroups().find((group) => group.id === key)?.label || EVENT_GROUPS.find((group) => group.id === key)?.label || id
}

export function filterEventsByGroup(events = [], groupId = 'tous') {
  if (!groupId || groupId === 'tous') return events
  return events.filter((event) => (event.groupes || []).includes(groupId))
}

export function filterEventsByGroups(events = [], groupIds = []) {
  const ids = [...new Set((groupIds || []).map((id) => String(id || '').trim()).filter((id) => id && id !== 'tous'))]
  if (!ids.length) return events
  return events.filter((event) => (event.groupes || []).some((group) => ids.includes(group)))
}

export const ROLE_TO_EVENT_GROUP = {
  danseur_enfant: 'enfant',
  danseur_ado: 'ado',
  danseur_tremplin: 'tremplin',
  danseur_concours: 'concours',
  danseur_loisir: 'loisir',
}

export const RSVP_GROUP_IDS = ['korrigan', 'enfant', 'ado', 'tremplin', 'concours', 'loisir', 'gwennyn']

export function danceGroupSelectItems(groups = activeEventGroups()) {
  return groups
    .filter((group) => group.id !== 'tous' && group.id !== 'sortie' && group.id !== 'monitorat')
    .map((group) => ({ title: group.label, value: group.id }))
}

export function personDanceGroups(person) {
  return [
    ...new Set((person?.roles || []).map((role) => ROLE_TO_EVENT_GROUP[role]).filter(Boolean)),
  ]
}

export function eventAudienceGroups(event) {
  return (event?.groupes || []).filter((id) => RSVP_GROUP_IDS.includes(id))
}

export function personCanRsvpToEvent(person, event) {
  if (!person) return false
  const required = eventAudienceGroups(event)
  if (!required.length) return true
  return personDanceGroups(person).some((id) => required.includes(id))
}

export function peopleForEventRsvp(people = [], event) {
  return (people || []).filter((person) => personCanRsvpToEvent(person, event))
}

export function eventRsvpReservedLabel(event) {
  const labels = eventAudienceGroups(event).map((id) => eventGroupLabel(id)).filter(Boolean)
  if (!labels.length) return ''
  if (labels.length === 1) return `Sondage réservé au groupe ${labels[0]}`
  return `Sondage réservé aux groupes ${labels.join(', ')}`
}

export function loansVisibleToMember(loans = [], people = [], memberPersonIds = []) {
  const allowed = new Set(memberPersonIds)
  const mine = people.filter((person) => allowed.has(person.id))
  const groups = new Set(mine.flatMap((person) => personDanceGroups(person)))
  if (!groups.size) {
    return loans.filter((loan) => allowed.has(loan.personId))
  }
  const inGroup = new Set(
    people
      .filter((person) => personDanceGroups(person).some((group) => groups.has(group)))
      .map((person) => person.id),
  )
  return loans.filter((loan) => inGroup.has(loan.personId))
}
