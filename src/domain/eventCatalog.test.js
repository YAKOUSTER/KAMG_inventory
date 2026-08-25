import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyEventCatalog,
  normalizeEventCatalog,
  parseCalendarGroupesQuery,
  selectableEventGroups,
  slugCatalogId,
} from './eventCatalog.js'
import { activeEventGroups, eventGroupLabel, setRuntimeEventGroups } from './eventGroups.js'
import { activeEventKinds, eventKindLabel, eventKindSelectItems, setRuntimeEventKinds } from './eventKinds.js'

describe('eventCatalog', () => {
  it('conserve les identifiants et permet de renommer', () => {
    const catalog = normalizeEventCatalog({
      kinds: [{ id: 'sortie', label: 'Sortie du cercle', prefix: '[SORTIE]' }],
      groups: [{ id: 'ado', label: 'Groupe ado' }],
    })
    assert.equal(catalog.kinds.find((entry) => entry.id === 'sortie')?.label, 'Sortie du cercle')
    assert.equal(catalog.groups.find((entry) => entry.id === 'ado')?.label, 'Groupe ado')
    assert.ok(catalog.groups.some((entry) => entry.id === 'tremplin'))
  })

  it('ajoute un type ou un groupe personnalisé', () => {
    const catalog = normalizeEventCatalog({
      kinds: [{ id: 'bal', label: 'Bal folk', prefix: '[BAL]' }],
      groups: [{ id: 'vugale', label: 'Groupe Vugale' }],
    })
    assert.ok(catalog.kinds.some((entry) => entry.id === 'bal' && !entry.builtin))
    assert.ok(catalog.groups.some((entry) => entry.id === 'vugale'))
  })

  it('exclut « tous » des abonnements filtrés', () => {
    const groups = selectableEventGroups()
    assert.ok(!groups.some((group) => group.id === 'tous'))
    assert.deepEqual(parseCalendarGroupesQuery('ado, tremplin,,ado'), ['ado', 'tremplin'])
  })

  it('applique le catalogue au runtime', () => {
    applyEventCatalog({
      kinds: [{ id: 'sortie', label: 'Sorties KAMG' }],
      groups: [{ id: 'ado', label: 'Les ados' }],
    })
    assert.equal(eventKindLabel('sortie'), 'Sorties KAMG')
    assert.equal(eventGroupLabel('ado'), 'Les ados')
    assert.ok(eventKindSelectItems().some((item) => item.value === 'sortie' && item.title === 'Sorties KAMG'))
    assert.ok(activeEventKinds().length >= 1)
    assert.ok(activeEventGroups().some((group) => group.id === 'ado'))
  })

  it('slugifie un libellé', () => {
    assert.equal(slugCatalogId('Groupe tremplin'), 'groupe_tremplin')
  })
})

after(() => {
  setRuntimeEventKinds(null)
  setRuntimeEventGroups(null)
})
