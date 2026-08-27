import { isActiveMember } from './person.js'

function personName(person) {
  const prenom = String(person?.prenom || '').trim()
  const nom = String(person?.nomUsage || person?.nom || '').trim()
  return [prenom, nom].filter(Boolean).join(' ')
}

function sortPeople(people = []) {
  return [...people].sort((a, b) => personName(a).localeCompare(personName(b), 'fr'))
}

export const ORG_CHART_SECTIONS = [
  {
    id: 'ca',
    label: 'Conseil d’Administration',
    icon: 'mdi-account-tie',
    slots: [
      { id: 'ca_president', label: 'Président(e)' },
      { id: 'ca_vice_president', label: 'Vice-Président(e)' },
      { id: 'ca_tresorier', label: 'Trésorier(e)' },
      { id: 'ca_tresorier_adjoint', label: 'Trésorier(e) adjoint(e)' },
      { id: 'ca_secretaire', label: 'Secrétaire' },
      { id: 'ca_secretaire_adjoint', label: 'Secrétaire adjoint(e)' },
      { id: 'ca_membre', label: 'Membres', multiple: true },
    ],
  },
  {
    id: 'loisir',
    label: 'Groupe Loisir',
    icon: 'mdi-music',
    slots: [
      { id: 'loisir_resp_a', label: 'Responsable groupe A', multiple: true },
      { id: 'loisir_resp_b', label: 'Responsable groupe B', multiple: true },
      {
        id: 'loisir_danseur',
        label: 'Danseurs groupe loisir',
        multiple: true,
        fromRoles: ['danseur_loisir'],
        hideInForm: true,
      },
    ],
  },
  {
    id: 'enfants',
    label: 'Groupe Enfants (Korrigan et Bugale)',
    icon: 'mdi-human-male-child',
    slots: [
      { id: 'enfants_responsable', label: 'Responsable' },
      { id: 'enfants_moniteur', label: 'Moniteur(s)', multiple: true },
      { id: 'enfants_korrigan', label: 'Danseurs groupe Korrigan', multiple: true },
      {
        id: 'enfants_bugale',
        label: 'Danseurs groupe Bugale',
        multiple: true,
        fromRoles: ['danseur_enfant'],
        excludeTags: ['enfants_korrigan'],
      },
    ],
  },
  {
    id: 'ado',
    label: 'Groupe Ado',
    icon: 'mdi-account-school-outline',
    slots: [
      { id: 'ado_co_responsable', label: 'Co-responsable', multiple: true },
      { id: 'ado_moniteur', label: 'Moniteurs', multiple: true },
      {
        id: 'ado_danseur',
        label: 'Danseurs groupe Ado',
        multiple: true,
        fromRoles: ['danseur_ado'],
        hideInForm: true,
      },
      { id: 'ado_musicien', label: 'Musiciens du groupe Ado', multiple: true },
    ],
  },
  {
    id: 'tremplin',
    label: 'Groupe Tremplin',
    icon: 'mdi-trending-up',
    slots: [
      { id: 'tremplin_responsable', label: 'Responsable' },
      { id: 'tremplin_moniteur', label: 'Moniteurs', multiple: true },
      {
        id: 'tremplin_danseur',
        label: 'Danseurs groupe Tremplin',
        multiple: true,
        fromRoles: ['danseur_tremplin'],
        hideInForm: true,
      },
    ],
  },
  {
    id: 'concours',
    label: 'Groupe Concours',
    icon: 'mdi-trophy-outline',
    slots: [
      { id: 'concours_co_responsable', label: 'Co-responsable du groupe Concours', multiple: true },
    ],
    children: [
      {
        id: 'trad',
        label: 'Commission Trad’',
        icon: 'mdi-music-note',
        slots: [
          { id: 'trad_penn', label: 'Penn Trad' },
          { id: 'trad_membre', label: 'Membre de la commission Trad’', multiple: true },
        ],
      },
      {
        id: 'artistique',
        label: 'Commission Artistique',
        icon: 'mdi-palette-outline',
        slots: [
          { id: 'art_penn', label: 'Penn Artistique' },
          { id: 'art_scenique', label: 'Référent(e) scénique' },
          { id: 'art_defile', label: 'Référent(e) défilé' },
          { id: 'art_musique', label: 'Référent(e) musique' },
          { id: 'art_ado', label: 'Référent(e) artistique du groupe Ado' },
        ],
      },
    ],
    afterSlots: [
      {
        id: 'concours_danseur',
        label: 'Danseurs et danseuses',
        multiple: true,
        fromRoles: ['danseur_concours', 'danseur_tremplin'],
        hideInForm: true,
      },
      { id: 'concours_musicien', label: 'Musiciens du groupe Concours', multiple: true },
    ],
  },
  {
    id: 'vetement',
    label: 'Groupe Vêtement',
    icon: 'mdi-hanger',
    slots: [
      { id: 'vetement_atelier', label: 'Responsable atelier/stage' },
      { id: 'vetement_inventaire', label: 'Responsable inventaire/collection' },
      { id: 'vetement_terrain', label: 'Responsable terrain', multiple: true },
    ],
    children: [
      {
        id: 'collectage',
        label: 'Commission Collectage',
        icon: 'mdi-book-search-outline',
        slots: [
          { id: 'collectage_membre', label: 'Membre de la commission Collectage', multiple: true },
        ],
      },
    ],
  },
  {
    id: 'logistique',
    label: 'Commission logistique',
    icon: 'mdi-truck-outline',
    slots: [
      { id: 'log_penn', label: 'Penn logistique' },
      { id: 'log_sortie', label: 'Co-responsable(s) sortie', multiple: true },
      { id: 'log_animation', label: 'Co-responsable(s) animation', multiple: true },
    ],
  },
  {
    id: 'communication',
    label: 'Commission Communication',
    icon: 'mdi-bullhorn-outline',
    slots: [
      { id: 'com_penn', label: 'Penn communication' },
      { id: 'com_membre', label: 'Membres de la commission communication', multiple: true },
    ],
  },
]

function walkSlots(sections = ORG_CHART_SECTIONS, visit) {
  for (const section of sections) {
    for (const slot of section.slots || []) visit(slot, section)
    walkSlots(section.children || [], visit)
    for (const slot of section.afterSlots || []) visit(slot, section)
  }
}

export const ORG_TAGS = (() => {
  const tags = []
  walkSlots(ORG_CHART_SECTIONS, (slot) => {
    tags.push(slot)
  })
  return tags
})()

const ORG_TAG_IDS = new Set(ORG_TAGS.map((slot) => slot.id))

export function orgTagLabel(id) {
  return ORG_TAGS.find((slot) => slot.id === id)?.label || id
}

export function orgFormSections(sections = ORG_CHART_SECTIONS) {
  return sections
    .map((section) => {
      const slots = (section.slots || []).filter((slot) => !slot.hideInForm)
      const afterSlots = (section.afterSlots || []).filter((slot) => !slot.hideInForm)
      const children = orgFormSections(section.children || [])
      if (!slots.length && !afterSlots.length && !children.length) return null
      return { ...section, slots, afterSlots, children }
    })
    .filter(Boolean)
}

export function normalizeOrgTags(input = {}) {
  const fromArray = Array.isArray(input.tags) ? input.tags : []
  return [...new Set(fromArray.map((value) => String(value || '').trim()).filter((id) => ORG_TAG_IDS.has(id)))]
}

export function personOrgTagLabels(person) {
  return normalizeOrgTags(person).map(orgTagLabel)
}

function peopleForSlot(people, slot) {
  const byId = new Map()
  const exclude = new Set(slot.excludeTags || [])
  const roles = slot.fromRoles || []
  for (const person of people || []) {
    const tags = normalizeOrgTags(person)
    if (tags.includes(slot.id)) {
      byId.set(person.id, person)
      continue
    }
    if (!roles.length) continue
    if (exclude.size && tags.some((tag) => exclude.has(tag))) continue
    if ((person.roles || []).some((role) => roles.includes(role))) {
      byId.set(person.id, person)
    }
  }
  return sortPeople([...byId.values()])
}

function fillSection(section, people) {
  const slots = (section.slots || [])
    .map((slot) => ({ ...slot, people: peopleForSlot(people, slot) }))
    .filter((slot) => slot.people.length)
  const children = (section.children || [])
    .map((child) => fillSection(child, people))
    .filter(Boolean)
  const afterSlots = (section.afterSlots || [])
    .map((slot) => ({ ...slot, people: peopleForSlot(people, slot) }))
    .filter((slot) => slot.people.length)
  if (!slots.length && !children.length && !afterSlots.length) return null
  return { ...section, slots, children, afterSlots }
}

export const ORG_LEFTOVER_SECTION_ID = 'adherents_hors_groupes'
export const ORG_LEFTOVER_SLOT_ID = 'adherent_hors_groupe'
export const ORG_LEFTOVER_LABEL = 'Adhérents actifs hors groupes, commissions ou CA'

function collectChartPersonIds(sections = []) {
  const ids = new Set()
  for (const section of sections) {
    for (const slot of [...(section.slots || []), ...(section.afterSlots || [])]) {
      for (const person of slot.people || []) {
        if (person?.id) ids.add(person.id)
      }
    }
    for (const id of collectChartPersonIds(section.children || [])) ids.add(id)
  }
  return ids
}

function leftoverSection(people) {
  if (!people.length) return null
  return {
    id: ORG_LEFTOVER_SECTION_ID,
    label: ORG_LEFTOVER_LABEL,
    icon: 'mdi-account-heart-outline',
    slots: [
      {
        id: ORG_LEFTOVER_SLOT_ID,
        label: '',
        multiple: true,
        people,
      },
    ],
    children: [],
    afterSlots: [],
  }
}

export function orgChartFromPeople(people = [], now = new Date()) {
  const active = (people || []).filter((person) => isActiveMember(person, now))
  const chart = ORG_CHART_SECTIONS.map((section) => fillSection(section, active)).filter(Boolean)
  const placed = collectChartPersonIds(chart)
  const leftover = sortPeople(active.filter((person) => person?.id && !placed.has(person.id)))
  const extra = leftoverSection(leftover)
  if (extra) chart.push(extra)
  return chart
}
