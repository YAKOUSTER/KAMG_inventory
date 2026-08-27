import { can } from './auth.js'
import { GESTION, MEMBER_HOME } from './paths.js'

export const GESTION_AREAS = [
  {
    id: 'costume',
    title: 'Costume',
    fullTitle: 'Gestion costume',
    short: 'Costume',
    icon: 'mdi-hanger',
    activeIcon: 'mdi-hanger',
    links: [
      { to: GESTION.home, title: 'Accueil', icon: 'mdi-home-outline', permission: 'items.read', exact: true },
      {
        to: GESTION.inventory,
        title: 'Inventaire',
        icon: 'mdi-hanger',
        permission: 'items.read',
        match: [GESTION.inventory, '/gestion/pieces'],
      },
      {
        to: GESTION.loans,
        title: 'Emprunts',
        icon: 'mdi-swap-horizontal',
        permission: 'loans.read',
        match: [GESTION.loans],
      },
      {
        to: GESTION.cart,
        title: 'Panier',
        icon: 'mdi-cart-outline',
        permission: 'loans.write',
        match: [GESTION.cart],
        toolbar: false,
      },
    ],
  },
  {
    id: 'calendrier',
    title: 'Calendrier',
    fullTitle: 'Gestion calendrier',
    short: 'Agenda',
    icon: 'mdi-calendar-month-outline',
    activeIcon: 'mdi-calendar-month',
    links: [
      {
        to: GESTION.agenda,
        title: 'Agenda',
        icon: 'mdi-calendar-month-outline',
        permissionAny: ['agenda.read', 'agenda.write', 'agenda.libre'],
        match: [GESTION.agenda],
      },
    ],
  },
  {
    id: 'membres',
    title: 'Membres',
    fullTitle: 'Membres et invités',
    short: 'Membres',
    icon: 'mdi-account-group-outline',
    activeIcon: 'mdi-account-group',
    links: [
      {
        to: GESTION.people,
        title: 'Personnes',
        icon: 'mdi-account-group-outline',
        permission: 'people.read',
        match: [GESTION.people],
      },
      {
        to: GESTION.placement,
        title: 'À ranger',
        icon: 'mdi-account-clock-outline',
        permission: 'people.write',
        match: [GESTION.placement],
      },
    ],
  },
  {
    id: 'infos',
    title: 'Infos',
    fullTitle: 'Newsletters / Infos',
    short: 'Infos',
    icon: 'mdi-book-open-page-variant-outline',
    activeIcon: 'mdi-book-open-page-variant',
    links: [
      {
        to: GESTION.contents,
        title: 'Contenus',
        icon: 'mdi-book-open-page-variant-outline',
        permission: 'content.read',
        match: [GESTION.contents],
      },
    ],
  },
]

export function linkMatchesPath(link, path) {
  const current = String(path || '')
  if (link.exact) return current === link.to
  const prefixes = link.match || [link.to]
  return prefixes.some((prefix) => current === prefix || current.startsWith(`${prefix}/`))
}

export function visibleAreaLinks(area, user) {
  return (area?.links || []).filter((link) => linkAllowed(link, user))
}

export function linkAllowed(link, user) {
  if (Array.isArray(link.permissionAny) && link.permissionAny.length) {
    return link.permissionAny.some((permission) => can(user, permission))
  }
  return can(user, link.permission)
}

export function gestionHomePath(user) {
  return visibleGestionAreas(user)[0]?.home || MEMBER_HOME
}

export function toolbarLinksForArea(area) {
  return (area?.links || []).filter((link) => link.toolbar !== false)
}

export function visibleGestionAreas(user) {
  return GESTION_AREAS.map((area) => {
    const links = visibleAreaLinks(area, user)
    return links.length ? { ...area, links, home: links[0].to } : null
  }).filter(Boolean)
}

export function gestionAreaForPath(path, user) {
  const areas = visibleGestionAreas(user)
  return areas.find((area) => area.links.some((link) => linkMatchesPath(link, path))) || null
}

export function canAccessGestion(user) {
  return visibleGestionAreas(user).length > 0
}
