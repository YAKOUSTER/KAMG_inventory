import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isOverdue, itemsInPossession, loanPiecesLabel, loanStatusLabel, openLoanLines, hasChequeCaution, loansOfPeople } from './loans.js'

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

  it('liste les pièces encore chez une personne', () => {
    const held = itemsInPossession([
      {
        id: 'l1',
        statut: 'en_cours',
        titre: 'Spectacle',
        dateEmprunt: '2026-08-01',
        items: [{ itemId: 'i1', code: 'JUP-01', nom: 'Jupe', returnedAt: null }],
      },
      {
        id: 'l2',
        statut: 'retourne',
        items: [{ itemId: 'i2', code: 'GIL-01', returnedAt: null }],
      },
      {
        id: 'l3',
        statut: 'retour_partiel',
        titre: 'Répétition',
        dateEmprunt: '2026-07-15',
        items: [
          { itemId: 'i3', code: 'TAB-01', returnedAt: '2026-07-20' },
          { itemId: 'i4', code: 'ROC-01', nom: 'Chemise', returnedAt: null },
        ],
      },
    ])
    assert.equal(held.length, 2)
    assert.equal(held[0].code, 'JUP-01')
    assert.equal(held[1].code, 'ROC-01')
  })

  it('filtre les emprunts d’une personne et le chèque de caution', () => {
    const loans = [
      { id: '1', personId: 'a', chequeCaution: true },
      { id: '2', personId: 'b', chequeCaution: false },
    ]
    assert.deepEqual(
      loansOfPeople(loans, ['a']).map((loan) => loan.id),
      ['1'],
    )
    assert.equal(hasChequeCaution(loans[0]), true)
    assert.equal(hasChequeCaution(loans[1]), false)
  })
})
