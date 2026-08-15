import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isOverdue, loanPiecesLabel, loanStatusLabel, openLoanLines } from './loans.js'

describe('isOverdue', () => {
  it('signale un emprunt encore ouvert dont la date prévue est passée', () => {
    const loan = { statut: 'en_cours', dateRetourPrevue: '2026-08-01' }
    assert.equal(isOverdue(loan, '2026-08-15'), true)
    assert.equal(isOverdue({ ...loan, statut: 'retourne' }, '2026-08-15'), false)
    assert.equal(isOverdue({ statut: 'en_cours', dateRetourPrevue: '2026-08-20' }, '2026-08-15'), false)
    assert.equal(isOverdue({ statut: 'en_cours' }, '2026-08-15'), false)
  })
})

describe('loan helpers', () => {
  it('résume les pièces et les lignes encore ouvertes', () => {
    const loan = {
      statut: 'retour_partiel',
      items: [
        { code: 'JUP-01', returnedAt: '2026-08-01' },
        { code: 'TAB-01', nom: 'Tablier', returnedAt: null },
      ],
    }
    assert.equal(loanStatusLabel(loan.statut), 'Retour partiel')
    assert.equal(loanPiecesLabel(loan), 'JUP-01, TAB-01')
    assert.equal(openLoanLines(loan).length, 1)
  })
})
