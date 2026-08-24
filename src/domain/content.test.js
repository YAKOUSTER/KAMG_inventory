import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterPublishedPages, groupPagesByCategory, normalizeContentPage } from './content.js'

describe('normalizeContentPage', () => {
  it('normalise une page publiée', () => {
    const page = normalizeContentPage(
      {
        categorie: 'vocabulaire',
        titre: 'Bragoù bras',
        corps: 'Pantalon…',
        ordre: 2,
        medias: [{ type: 'image', url: 'https://example.com/a.jpg', legende: 'Photo' }],
      },
      { id: 'page-1' },
    )
    assert.equal(page.categorie, 'vocabulaire')
    assert.equal(page.publie, true)
    assert.equal(page.ordre, 2)
    assert.equal(page.medias.length, 1)
    assert.equal(page.medias[0].url, 'https://example.com/a.jpg')
  })
})

describe('groupPagesByCategory', () => {
  it('regroupe les pages publiées par catégorie', () => {
    const groups = groupPagesByCategory([
      { id: 'a', categorie: 'vocabulaire', titre: 'A', ordre: 1, publie: true },
      { id: 'b', categorie: 'presentation', titre: 'B', ordre: 1, publie: true },
      { id: 'c', categorie: 'vocabulaire', titre: 'C', ordre: 0, publie: false },
    ])
    assert.equal(groups.length, 2)
    assert.equal(groups[0].id, 'presentation')
    assert.deepEqual(groups[1].pages.map((page) => page.id), ['a'])
  })
})

describe('filterPublishedPages', () => {
  it('ignore les brouillons', () => {
    const pages = filterPublishedPages([
      { id: 'a', categorie: 'autre', titre: 'A', publie: true },
      { id: 'b', categorie: 'autre', titre: 'B', publie: false },
    ])
    assert.equal(pages.length, 1)
  })
})
