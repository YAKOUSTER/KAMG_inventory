import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { memberSpaceQuery } from './memberSpaceNav.js'

describe('memberSpaceQuery', () => {
  it('conserve l’article quand on ouvre Infos depuis l’accueil', () => {
    const query = memberSpaceQuery('infos', { onglet: 'accueil' }, { article: 'actu-1' })
    assert.deepEqual(query, { onglet: 'infos', article: 'actu-1' })
  })

  it('ne laisse pas l’onglet Infos écraser un article déjà prévu', () => {
    const query = memberSpaceQuery('infos', { onglet: 'accueil' }, { article: 'actu-1' })
    assert.equal(query.article, 'actu-1')
  })

  it('retire l’article en quittant Infos', () => {
    const query = memberSpaceQuery('accueil', { onglet: 'infos', article: 'actu-1', categorie: 'newsletter' })
    assert.deepEqual(query, { onglet: 'accueil' })
  })

  it('ignore l’onglet compte mobile', () => {
    assert.equal(memberSpaceQuery('moi', { onglet: 'accueil' }), null)
  })

  it('conserve l’onglet profil comme un vrai onglet', () => {
    assert.deepEqual(memberSpaceQuery('profil', { onglet: 'accueil' }), { onglet: 'profil' })
  })
})
