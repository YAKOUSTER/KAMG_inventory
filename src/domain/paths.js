/** URLs publiques KAMG : espace membre à la racine, gestion sous /gestion. */

export const MEMBER_HOME = '/'
export const LOGIN_PATH = '/connexion'
export const SIGNUP_PATH = '/inscription'
export const FORGOT_PASSWORD_PATH = '/mot-de-passe-oublie'
export const RESET_PASSWORD_PATH = '/nouveau-mot-de-passe'
export const LEGACY_MEMBER_PATH = '/espace-membre'

export const GESTION_BASE = '/gestion'

export function gestionPath(suffix = '') {
  const clean = String(suffix || '').replace(/^\/+/, '')
  return clean ? `${GESTION_BASE}/${clean}` : GESTION_BASE
}

export const GESTION = {
  home: GESTION_BASE,
  inventory: gestionPath('inventaire'),
  itemNew: gestionPath('pieces/nouvelle'),
  item: (id) => gestionPath(`pieces/${id}`),
  itemEdit: (id) => gestionPath(`pieces/${id}/modifier`),
  loans: gestionPath('emprunts'),
  loan: (id) => gestionPath(`emprunts/${id}`),
  cart: gestionPath('panier'),
  people: gestionPath('personnes'),
  personNew: gestionPath('personnes/nouvelle'),
  person: (id) => gestionPath(`personnes/${id}`),
  personEdit: (id) => gestionPath(`personnes/${id}/modifier`),
  placement: gestionPath('a-ranger'),
  agenda: gestionPath('agenda'),
  eventNew: gestionPath('agenda/nouveau'),
  eventEdit: (id) => gestionPath(`agenda/${id}/modifier`),
  contents: gestionPath('contenus'),
  contentNew: gestionPath('contenus/nouveau'),
  contentEdit: (id) => gestionPath(`contenus/${id}/modifier`),
  users: gestionPath('utilisateurs'),
  settings: gestionPath('parametres'),
  audit: gestionPath('journal'),
}

export const MEMBER_AGENDA = '/?onglet=agenda'
