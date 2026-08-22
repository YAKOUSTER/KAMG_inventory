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
  { id: 'monitorat', label: 'Monitorat', icon: 'mdi-account-supervisor-outline' },
  { id: 'commission', label: 'Commission', icon: 'mdi-clipboard-text-outline' },
]

export function eventGroupLabel(id) {
  return EVENT_GROUPS.find((group) => group.id === id)?.label || id
}

export function filterEventsByGroup(events = [], groupId = 'tous') {
  if (!groupId || groupId === 'tous') return events
  return events.filter((event) => (event.groupes || []).includes(groupId))
}
