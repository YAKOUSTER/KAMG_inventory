import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyEventTitlePrefix,
  eventTitlePrefix,
  eventTitleRest,
  eventKindsOf,
  eventMatchesKindFilter,
  inferEventKinds,
} from './eventKinds.js'

describe('eventTitlePrefix', () => {
  it('combine les répétitions loisirs A et B en Tous', () => {
    assert.equal(
      eventTitlePrefix(['repetition_loisir_a', 'repetition_loisir_b']),
      'Répétition Loisirs - Tous',
    )
  })

  it('combine Korrigan et Bugale', () => {
    assert.equal(
      eventTitlePrefix(['repetition_korrigan', 'repetition_bugale']),
      'Répétition Korrigan/Bugale',
    )
  })

  it('préfixe une sortie, un concours et un stage', () => {
    assert.equal(eventTitlePrefix(['sortie']), '[SORTIE]')
    assert.equal(eventTitlePrefix(['fest_noz']), '[FEST-NOZ]')
    assert.equal(eventTitlePrefix(['concours']), '[CONCOURS]')
    assert.equal(eventTitlePrefix(['stage']), '[STAGE]')
  })

  it('préfixe les ateliers', () => {
    assert.equal(eventTitlePrefix(['atelier_broderie']), 'Atelier broderie')
    assert.equal(eventTitlePrefix(['atelier_couture']), 'Atelier couture')
    assert.equal(eventTitlePrefix(['atelier_special']), 'Atelier spécial')
  })

  it('empile les préfixes distincts', () => {
    assert.equal(
      eventTitlePrefix(['repetition_concours', 'sortie']),
      'Répétition Concours [SORTIE]',
    )
  })
})

describe('applyEventTitlePrefix', () => {
  it('ajoute le préfixe au nom libre', () => {
    assert.equal(applyEventTitlePrefix('Festival de Lorient', ['sortie']), '[SORTIE] Festival de Lorient')
  })

  it('est idempotent si le titre a déjà le préfixe', () => {
    assert.equal(
      applyEventTitlePrefix('[SORTIE] Festival de Lorient', ['sortie']),
      '[SORTIE] Festival de Lorient',
    )
  })

  it('remplace un ancien préfixe', () => {
    assert.equal(
      applyEventTitlePrefix('Répétition Loisirs - Groupe A Mardi', ['repetition_loisir_a', 'repetition_loisir_b']),
      'Répétition Loisirs - Tous Mardi',
    )
  })
})

describe('eventTitleRest', () => {
  it('retire les préfixes connus', () => {
    assert.equal(eventTitleRest('[SORTIE] Festival de Lorient'), 'Festival de Lorient')
    assert.equal(eventTitleRest('Répétition Tremplin/Ado'), '')
  })
})

describe('inferEventKinds', () => {
  it('reconnaît une répétition tremplin/ado importée', () => {
    assert.deepEqual(
      inferEventKinds('Répétition Ado+Tremplin #4', '', 'repetition'),
      ['repetition_tremplin_ado'],
    )
  })
})

describe('eventKindsOf / filtre', () => {
  it('infère les types si kinds n’est pas stocké', () => {
    const event = { titre: 'Répétition Ado+Tremplin #4', type: 'repetition', kinds: [] }
    assert.deepEqual(eventKindsOf(event), ['repetition_tremplin_ado'])
    assert.equal(eventMatchesKindFilter(event, 'repetition_tremplin_ado'), true)
    assert.equal(eventMatchesKindFilter(event, 'sortie'), false)
  })
})
