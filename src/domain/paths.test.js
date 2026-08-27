import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GESTION, GESTION_BASE, MEMBER_HOME, gestionPath } from './paths.js'

describe('chemins publics KAMG', () => {
  it('place l’espace membre à la racine et la gestion sous /gestion', () => {
    assert.equal(MEMBER_HOME, '/')
    assert.equal(GESTION_BASE, '/gestion')
    assert.equal(gestionPath(), '/gestion')
    assert.equal(gestionPath('/inventaire'), '/gestion/inventaire')
    assert.equal(GESTION.home, '/gestion')
    assert.equal(GESTION.inventory, '/gestion/inventaire')
    assert.equal(GESTION.loan('abc'), '/gestion/emprunts/abc')
    assert.equal(GESTION.itemEdit('x'), '/gestion/pieces/x/modifier')
  })
})
