export const AUDIT_ACTIONS = [
  { id: 'item.create', label: 'Pièce créée', entityType: 'item' },
  { id: 'item.update', label: 'Pièce modifiée', entityType: 'item' },
  { id: 'item.delete', label: 'Pièce supprimée', entityType: 'item' },
  { id: 'person.create', label: 'Personne créée', entityType: 'person' },
  { id: 'person.update', label: 'Personne modifiée', entityType: 'person' },
  { id: 'person.delete', label: 'Personne supprimée', entityType: 'person' },
  { id: 'loan.create', label: 'Emprunt créé', entityType: 'loan' },
  { id: 'loan.return', label: 'Retour partiel', entityType: 'loan' },
  { id: 'loan.return_all', label: 'Emprunt clôturé', entityType: 'loan' },
  { id: 'loan.update', label: 'Emprunt modifié', entityType: 'loan' },
  { id: 'loan.cancel', label: 'Emprunt annulé', entityType: 'loan' },
  { id: 'user.create', label: 'Compte créé', entityType: 'user' },
  { id: 'user.update', label: 'Compte modifié', entityType: 'user' },
  { id: 'user.delete', label: 'Compte supprimé', entityType: 'user' },
  { id: 'db.import', label: 'Import JSON', entityType: 'db' },
  { id: 'referentiels.update', label: 'Listes de paramétrage', entityType: 'settings' },
  { id: 'audit.clear', label: 'Journal vidé', entityType: 'settings' },
  { id: 'stock.adjust', label: 'Mouvement de stock', entityType: 'item' },
]

export function auditActionLabel(action) {
  return AUDIT_ACTIONS.find((entry) => entry.id === action)?.label || action
}

export function auditEntityRoute(entry) {
  if (!entry?.entityId) return null
  switch (entry.entityType) {
    case 'item':
      return { name: 'item-detail', params: { id: entry.entityId } }
    case 'person':
      return { name: 'person-detail', params: { id: entry.entityId } }
    case 'loan':
      return { name: 'loan-detail', params: { id: entry.entityId } }
    default:
      return null
  }
}
