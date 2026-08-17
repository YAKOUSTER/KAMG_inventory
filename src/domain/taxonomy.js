export const CATEGORIES = [
  { id: 'echantillon', label: 'Échantillon', icon: 'mdi-texture-box', plural: 'Échantillons' },
  { id: 'piece_costume', label: 'Pièce de costume', icon: 'mdi-tshirt-crew', plural: 'Pièces de costume' },
  { id: 'piece_collection', label: 'Pièce de collection', icon: 'mdi-bank', plural: 'Pièces de collection' },
  { id: 'tissu', label: 'Tissu', icon: 'mdi-roller-shade', plural: 'Tissus' },
  { id: 'accessoire', label: 'Accessoire', icon: 'mdi-hat-fedora', plural: 'Accessoires' },
  { id: 'fourniture', label: 'Fourniture', icon: 'mdi-package-variant-closed', plural: 'Fournitures' },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

export const DEFAULT_REFERENTIELS = {
  categories: CATEGORIES.map(({ id, label }) => ({ id, label })),
  typesParCategorie: {
    echantillon: [
      'Échantillon tissé',
      'Échantillon brodé',
      'Échantillon imprimé',
      'Échantillon dentelle',
      'Coupon',
      'Bordure / galon',
    ],
    piece_costume: [
      'Chemise/Roched',
      'Gilet/Jiletenn',
      'Veste courte/Chupenn',
      'Bragoù Bras',
      'Pantalon',
      'Ceinture/Gouriz',
      'Guêtres',
      'Chapeau',
      'Jupon',
      'Corsage/Jiletenn',
      'Corselet/Manchoù',
      'Jupe',
      'Tablier',
      'Tour de cou',
      'Collerette',
      'Gorgerette',
      'Coiffe',
      'Chaussure',
      'Bonnet',
      'Ruban de cérémonie',
    ],
    piece_collection: [
      'Costume complet',
      'Robe',
      'Coiffe de collection',
      'Châle',
      'Tablier de collection',
      'Linge de maison',
      'Bannière',
      'Autre pièce patrimoniale',
    ],
    tissu: ['Toile', 'Drap', 'Satin', 'Velours', 'Moire', 'Dentelle', 'Tulle', 'Linon', 'Flanelle', 'Serge', 'Autre'],
    accessoire: ['Bijou', 'Broche', 'Bouton', 'Ruban', 'Gant', 'Chaussure', 'Sac', 'Épingle', 'Autre'],
    fourniture: [
      'Bouton',
      'Fil',
      'Cire d\'abeille',
      'Coton démaquillant',
      'Bobine',
      'Cannetille',
      'Ruban / galon',
      'Dentelle',
      'Élastique',
      'Fermeture',
      'Mercerie',
      'Outil',
      'Autre',
    ],
  },
  origines: ['Pays Glazig', 'Bretagne', 'Cercle KAMG'],
  techniques: ['Perlé', 'Brodé'],
  tags: [],
  unitesStock: ['pièce', 'm', 'cm', 'bobine', 'rouleau', 'carte', 'g', 'kg', 'lot'],
  epoques: ['1870', '1880', '1890', '1900', '1910', '1920', '1930', '1940', '1950', 'Contemporain', 'Indéterminée'],
  etats: ['Très bon', 'Bon', 'Moyen', 'Usé', 'Ancien', 'À réparer', 'Fragile'],
  disponibilites: [
    'Disponible',
    'Emprunté',
    'En stock',
    'Stock bas',
    'Rupture',
    'Réservé',
    'Au pressing',
    'En restauration',
    'Archivé',
    'Non empruntable',
  ],
  couleurs: ['Blanc', 'Écru', 'Noir', 'Rouge', 'Bleu', 'Vert', 'Jaune', 'Rose', 'Doré', 'Argenté', 'Multicolore'],
  tailles: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unique'],
  modesAcquisition: ['Don', 'Achat', 'Prêt', 'Fabrication', 'Héritage', 'Inconnu'],
}

export const UPPER_BODY_TYPES = [
  'Chemise/Roched',
  'Gilet/Jiletenn',
  'Veste courte/Chupenn',
  'Corsage/Jiletenn',
  'Corselet/Manchoù',
]

export const WAIST_TYPES = ['Jupe', 'Jupon', 'Bragoù Bras', 'Pantalon', 'Ceinture/Gouriz', 'Tablier']
export const SKIRT_TYPES = ['Jupe', 'Jupon', 'Tablier']
export const HEAD_TYPES = ['Chapeau', 'Coiffe', 'Bonnet']

export const MEASUREMENT_FIELDS = [
  { key: 'longueur', label: 'Longueur (cm)', max: 180 },
  { key: 'longueurDos', label: 'Longueur dos (cm)', max: 100 },
  { key: 'longueurAvant', label: 'Longueur avant (cm)', max: 100 },
  { key: 'tourTailleMin', label: 'Tour de taille min (cm)', max: 150 },
  { key: 'tourTailleMax', label: 'Tour de taille max (cm)', max: 150 },
  { key: 'tourJupe', label: 'Tour de jupe (cm)', max: 400 },
  { key: 'longueurEpauleEpaule', label: 'Épaule à épaule (cm)', max: 80 },
  { key: 'longueurManche', label: 'Longueur de manche (cm)', max: 80 },
  { key: 'tourTete', label: 'Tour de tête (cm)', max: 80 },
]

export function visibleMeasurements(type) {
  const isUpper = UPPER_BODY_TYPES.includes(type)
  const isWaist = WAIST_TYPES.includes(type)
  const isSkirt = SKIRT_TYPES.includes(type)
  const isHead = HEAD_TYPES.includes(type)
  return {
    longueur: !isUpper && Boolean(type) && !isHead,
    longueurDos: isUpper,
    longueurAvant: isUpper,
    tourTailleMin: isWaist,
    tourTailleMax: isWaist,
    tourJupe: isSkirt,
    longueurEpauleEpaule: isUpper,
    longueurManche: isUpper,
    tourTete: isHead,
  }
}

export function categoryLabel(id, referentiels) {
  if (referentiels?.categories) {
    const found = referentiels.categories.find((cat) => cat.id === id)
    if (found) return found.label
  }
  return CATEGORIES.find((c) => c.id === id)?.label || id
}

export function categoryIcon(id, referentiels) {
  if (referentiels?.categories) {
    const found = referentiels.categories.find((cat) => cat.id === id)
    if (found?.icon) return found.icon
  }
  return CATEGORIES.find((c) => c.id === id)?.icon || 'mdi-tag'
}

export function statusColor(status) {
  if (status === 'Disponible' || status === 'En stock') return 'success'
  if (status === 'Emprunté' || status === 'Rupture') return 'error'
  if (status === 'Stock bas' || status === 'En restauration' || status === 'Au pressing') return 'warning'
  if (status === 'Non empruntable' || status === 'Archivé') return 'grey'
  return 'info'
}
