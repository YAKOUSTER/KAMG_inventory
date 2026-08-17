import { todayLocal } from './dates.js'

export const LOAN_STATUSES = {
  en_cours: { label: 'En cours', color: 'warning' },
  retour_partiel: { label: 'Retour partiel', color: 'info' },
  retourne: { label: 'Retourné', color: 'success' },
}

export function loanStatusLabel(status) {
  return LOAN_STATUSES[status]?.label || status || ''
}

export function loanStatusColor(status) {
  return LOAN_STATUSES[status]?.color || 'secondary'
}

export function isOverdue(loan, today = todayLocal()) {
  if (!loan || loan.statut === 'retourne') return false
  const due = String(loan.dateRetourPrevue || '').slice(0, 10)
  return Boolean(due) && due < today
}

export function loanPiecesLabel(loan) {
  return (loan?.items || [])
    .map((line) => line.code || line.nom)
    .filter(Boolean)
    .join(', ')
}

export function openLoanLines(loan) {
  return (loan?.items || []).filter((line) => !line.returnedAt)
}

export function itemsInPossession(loans = []) {
  const list = []
  for (const loan of loans) {
    if (loan.statut === 'retourne') continue
    for (const line of openLoanLines(loan)) {
      list.push({
        itemId: line.itemId,
        code: line.code,
        nom: line.nom,
        type: line.type,
        loanId: loan.id,
        loanTitre: loan.titre,
        dateEmprunt: loan.dateEmprunt,
        comment: line.comment || '',
      })
    }
  }
  return list.sort((a, b) => (b.dateEmprunt || '').localeCompare(a.dateEmprunt || ''))
}
