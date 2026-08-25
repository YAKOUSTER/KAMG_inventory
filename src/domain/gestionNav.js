import { can } from './auth.js'

export const GESTION_AREAS = [
  {
    id: 'costume',
    title: 'Costume',
    fullTitle: 'Gestion costume',
    short: 'Costume',
    icon: 'mdi-hanger',
    activeIcon: 'mdi-hanger',
    links: [
      { to: '/', title: 'Accueil', icon: 'mdi-home-outline', permission: 'items.read', exact: true },
      {
        to: '/inventaire',
        title: 'Inventaire',
        icon: 'mdi-hanger',
        permission: 'items.read',
        match: ['/inventaire', '/pieces'],
      },
      {
        to: '/emprunts',
        title: 'Emprunts',
        icon: 'mdi-swap-horizontal',
        permission: 'loans.read',
        match: ['/emprunts'],
      },
      {
        to: '/panier',
        title: 'Panier',
        icon: 'mdi-cart-outline',
        permission: 'loans.write',
        match: ['/panier'],
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
        to: '/agenda',
        title: 'Agenda',
        icon: 'mdi-calendar-month-outline',
        permission: 'agenda.read',
        match: ['/agenda'],
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
        to: '/personnes',
        title: 'Personnes',
        icon: 'mdi-account-group-outline',
        permission: 'people.read',
        match: ['/personnes'],
      },
      {
        to: '/a-ranger',
        title: 'À ranger',
        icon: 'mdi-account-clock-outline',
        permission: 'people.write',
        match: ['/a-ranger'],
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
        to: '/contenus',
        title: 'Contenus',
        icon: 'mdi-book-open-page-variant-outline',
        permission: 'content.read',
        match: ['/contenus'],
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
  return (area?.links || []).filter((link) => can(user, link.permission))
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
