function trim(value) {
  return String(value ?? '').trim()
}

function pickId(value, options, fallback = '') {
  const raw = trim(value)
  if (options.some((entry) => entry.id === raw)) return raw
  return fallback
}

export const SORTIE_FORMATS = [
  { id: 'defile', label: 'Défilé uniquement' },
  { id: 'animation', label: 'Animation uniquement' },
  { id: 'spectacle', label: 'Spectacle uniquement' },
  { id: 'defile_animation', label: 'Défilé + Animation' },
  { id: 'defile_spectacle', label: 'Défilé + Spectacle' },
  { id: 'animation_spectacle', label: 'Animation + Spectacle' },
  { id: 'defile_animation_spectacle', label: 'Défilé + Animation + Spectacle' },
  { id: 'autre', label: 'Autres' },
]

export const TRANSPORT_TYPES = [
  { id: 'minibus_voitures', label: 'Minibus + voitures personnelles' },
  { id: 'voitures', label: 'Voitures personnelles' },
  { id: 'car', label: 'Car' },
  { id: 'pieton', label: 'Piéton' },
  { id: 'non_prevu', label: 'Non prévu par le cercle' },
]

export const MUSIQUE_TYPES = [
  { id: 'enregistrement_ibiza', label: 'Enregistrement (IBIZA)' },
  { id: 'musiciens', label: 'Musiciens' },
  { id: 'musiciens_enregistrement', label: 'Musiciens + enregistrement' },
]

export const REPAS_TYPES = [
  { id: 'inconnu', label: 'Nous ne savons pas encore', pending: true },
  { id: 'prevu_evenement', label: 'Prévu par l’évènement' },
  { id: 'pique_nique', label: 'Prévoir son pique nique' },
  { id: 'pas_concerne', label: 'Pas concerné' },
]

export const COSTUME_TYPES = [
  { id: 'traditionnel', label: 'En costume traditionnel' },
  { id: 'citadin', label: 'En citadin' },
  { id: 'citadin_traditionnel', label: 'En citadin + costume traditionnel' },
  { id: 'vert_noir_blanc', label: 'En vert, noir, blanc' },
  { id: 'civil', label: 'En civil' },
]

export const TRI_STATE = [
  { id: 'oui', label: 'Oui' },
  { id: 'non', label: 'Non' },
  { id: 'non_defini', label: 'Non défini', pending: true },
]

export function selectItems(options) {
  return options.map((entry) => ({
    title: entry.label,
    value: entry.id,
    pending: Boolean(entry.pending),
  }))
}

export function optionLabel(options, id, fallback = '') {
  return options.find((entry) => entry.id === id)?.label || fallback
}

export function optionIsPending(options, id) {
  return Boolean(options.find((entry) => entry.id === id)?.pending)
}

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

export function sortieDateLabel(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

export function displayHourLabel(value) {
  const raw = trim(value)
  if (!raw) return ''
  const match = raw.match(/^(\d{1,2})[:hH](\d{2})/)
  if (match) return `${match[1].padStart(2, '0')}h${match[2]}`
  return raw
}

export function emptySortie() {
  return {
    format: '',
    transport: '',
    parkingFestival: 'non_defini',
    musique: '',
    rdvHeure: '',
    rdvLieu: '',
    retourHeure: '',
    retourLieu: '',
    deplacementNotes: '',
    costume: '',
    change: 'non_defini',
    accessoires: '',
    repasMidi: 'inconnu',
    repasSoir: 'inconnu',
    gourde: 'non_defini',
    repasNotes: '',
    programme: '',
    responsable: '',
  }
}

export function normalizeSortie(input = {}) {
  const source = input && typeof input === 'object' ? input : {}
  return {
    format: pickId(source.format, SORTIE_FORMATS),
    transport: pickId(source.transport, TRANSPORT_TYPES),
    parkingFestival: pickId(source.parkingFestival, TRI_STATE, 'non_defini'),
    musique: pickId(source.musique, MUSIQUE_TYPES),
    rdvHeure: trim(source.rdvHeure),
    rdvLieu: trim(source.rdvLieu),
    retourHeure: trim(source.retourHeure),
    retourLieu: trim(source.retourLieu),
    deplacementNotes: trim(source.deplacementNotes),
    costume: pickId(source.costume, COSTUME_TYPES),
    change: pickId(source.change, TRI_STATE, 'non_defini'),
    accessoires: trim(source.accessoires),
    repasMidi: pickId(source.repasMidi, REPAS_TYPES, 'inconnu'),
    repasSoir: pickId(source.repasSoir, REPAS_TYPES, 'inconnu'),
    gourde: pickId(source.gourde, TRI_STATE, 'non_defini'),
    repasNotes: trim(source.repasNotes),
    programme: trim(source.programme),
    responsable: trim(source.responsable),
  }
}

export function sortieHasContent(sortie) {
  if (!sortie || typeof sortie !== 'object') return false
  return Object.values(sortie).some((value) => {
    const raw = String(value ?? '').trim()
    return raw && raw !== 'non_defini' && raw !== 'inconnu'
  })
}

export function seasonLabel(value, now = new Date()) {
  const date = value ? new Date(value) : now
  const source = Number.isNaN(date.getTime()) ? now : date
  const year = source.getMonth() >= 8 ? source.getFullYear() : source.getFullYear() - 1
  return `${year}-${year + 1}`
}
