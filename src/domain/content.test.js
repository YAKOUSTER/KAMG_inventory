import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filterPublishedPages, groupPagesByCategory, normalizeContentPage, contentCoverMedia, articleLayout, publicContentSummary } from './content.js'

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
    assert.equal(page.couverture, null)
  })

  it('conserve l’image de couverture', () => {
    const page = normalizeContentPage(
      {
        categorie: 'commencer_danse',
        titre: 'Bienvenue',
        couverture: { type: 'image', url: 'https://example.com/cover.jpg', legende: 'Couverture' },
      },
      { id: 'page-bienvenue' },
    )
    assert.equal(page.categorie, 'commencer_danse')
    assert.equal(contentCoverMedia(page).url, 'https://example.com/cover.jpg')
  })
})

describe('articleLayout', () => {
  it('place l’image de zone à côté de son paragraphe', () => {
    const layout = articleLayout({
      titre: 'Bienvenue',
      corps: 'Intro\n\n## Kenleur\nTexte Kenleur\n\n## Autre\nSans photo',
      couverture: { type: 'image', url: 'https://example.com/cover.jpg' },
      medias: [
        { type: 'image', url: 'https://example.com/kenleur.jpg', legende: 'Kenleur' },
        { type: 'image', url: 'https://example.com/extra.jpg', legende: '' },
      ],
    })
    assert.equal(layout.sections[1].heading, 'Kenleur')
    assert.equal(layout.sections[1].images[0].url, 'https://example.com/kenleur.jpg')
    assert.equal(layout.sections[2].images.length, 0)
    assert.equal(layout.gallery.length, 1)
    assert.equal(layout.gallery[0].url, 'https://example.com/extra.jpg')
  })

  it('associe une vidéo YouTube au paragraphe de même légende', () => {
    const layout = articleLayout({
      titre: 'Petit dimanche',
      corps: '## 1 / La coiffure\nVidéo : https://youtu.be/abc123',
      medias: [{ type: 'youtube', url: 'https://www.youtube.com/embed/abc123', legende: '1 / La coiffure' }],
    })
    assert.equal(layout.sections[0].videos[0].type, 'youtube')
    assert.equal(layout.sections[0].lines.some((line) => line.kind === 'video'), false)
    assert.equal(layout.gallery.length, 0)
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

describe('publicContentSummary', () => {
  it('expose un extrait sans le corps complet', () => {
    const summary = publicContentSummary({
      id: 'p1',
      categorie: 'vocabulaire',
      titre: 'Bragoù',
      corps: '## Titre\nUn pantalon large pour la danse.',
      publie: true,
      ordre: 1,
    })
    assert.equal(summary.id, 'p1')
    assert.match(summary.excerpt, /pantalon/)
    assert.equal(summary.corps, undefined)
    assert.equal(publicContentSummary({ id: 'x', publie: false }), null)
  })
})
