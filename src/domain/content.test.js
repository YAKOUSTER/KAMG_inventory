import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  articleLayout,
  contentCoverMedia,
  filterPublishedPages,
  groupPagesByCategory,
  normalizeContentPage,
  publicContentSummary,
  resolveContentCategory,
} from './content.js'

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
    assert.equal(page.categorie, 'culture_collectage')
    assert.equal(page.publie, true)
    assert.equal(page.ordre, 2)
    assert.equal(page.medias.length, 1)
    assert.equal(page.medias[0].url, 'https://example.com/a.jpg')
    assert.equal(page.couverture, null)
  })

  it('conserve l’image de couverture', () => {
    const page = normalizeContentPage(
      {
        categorie: 'vie_associative',
        titre: 'Bienvenue',
        couverture: { type: 'image', url: 'https://example.com/cover.jpg', legende: 'Couverture' },
      },
      { id: 'page-bienvenue' },
    )
    assert.equal(page.categorie, 'vie_associative')
    assert.equal(contentCoverMedia(page).url, 'https://example.com/cover.jpg')
  })

  it('classe les pages Infos dans les lots demandés', () => {
    const lots = {
      'page-bienvenue': 'vie_associative',
      'page-inscription': 'vie_associative',
      'page-communication': 'vie_associative',
      'page-fournitures-danseurs': 'commencer_danse',
      'page-fournitures-danseuses': 'commencer_danse',
      'page-mener-animation': 'commencer_danse',
      'page-pays-glazig': 'terroir',
      'page-costume-petit-dimanche': 'terroir',
      'page-costume-velour': 'terroir',
      'page-liste-danses': 'culture_collectage',
      'page-ridee-6-temps': 'culture_collectage',
      'page-pile-menu': 'culture_collectage',
      'page-rond-pagan': 'culture_collectage',
    }
    for (const [id, categorie] of Object.entries(lots)) {
      assert.equal(resolveContentCategory({ id, titre: id, categorie: 'autre' }), categorie)
    }
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
    assert.equal(layout.sections[1].imageSide, 'right')
    assert.equal(layout.sections[2].images.length, 0)
    assert.equal(layout.sections[2].imageSide, null)
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
  it('regroupe les pages publiées par catégorie, actualité en premier', () => {
    const groups = groupPagesByCategory([
      { id: 'a', categorie: 'vocabulaire', titre: 'A', ordre: 1, publie: true },
      { id: 'b', categorie: 'presentation', titre: 'B', ordre: 1, publie: true },
      { id: 'c', categorie: 'vocabulaire', titre: 'C', ordre: 0, publie: false },
      { id: 'n', categorie: 'newsletter', titre: 'Actu', publie: true, datePublication: '2026-08-01' },
    ])
    assert.equal(groups[0].id, 'newsletter')
    assert.deepEqual(groups.map((group) => group.id), ['newsletter', 'vie_associative', 'culture_collectage'])
    assert.deepEqual(groups[2].pages.map((page) => page.id), ['a'])
  })

  it('ordonne les titres dans chaque lot Infos', () => {
    const groups = groupPagesByCategory([
      { id: 'page-rond-pagan', titre: 'Rond de Pagan', categorie: 'vocabulaire', publie: true },
      { id: 'page-communication', titre: 'Nos outils de communication', categorie: 'commencer_danse', publie: true },
      { id: 'page-bienvenue', titre: 'Bienvenue', categorie: 'commencer_danse', publie: true },
      { id: 'page-inscription', titre: "Comment s'inscrire ?", categorie: 'commencer_danse', publie: true },
      { id: 'page-mener-animation', titre: 'Mener une animation', categorie: 'autre', publie: true },
      { id: 'page-fournitures-danseuses', titre: 'Danseuses : fournitures', categorie: 'commencer_danse', publie: true },
      { id: 'page-fournitures-danseurs', titre: 'Danseurs : fournitures', categorie: 'commencer_danse', publie: true },
      { id: 'page-liste-danses', titre: 'Liste des danses', categorie: 'autre', publie: true },
      { id: 'page-pile-menu', titre: 'Pilé-Menu', categorie: 'vocabulaire', publie: true },
      { id: 'page-ridee-6-temps', titre: 'Ridée 6 temps', categorie: 'vocabulaire', publie: true },
      { id: 'page-pays-glazig', titre: 'Le Pays Glazig', categorie: 'tuto_habillage', publie: true },
      { id: 'page-costume-velour', titre: 'Le costume velour 1935-1938', categorie: 'tuto_habillage', publie: true },
      { id: 'page-costume-petit-dimanche', titre: 'Le costume de "Petit dimanche"', categorie: 'tuto_habillage', publie: true },
    ])
    const byId = Object.fromEntries(groups.map((group) => [group.id, group.pages.map((page) => page.titre)]))
    assert.deepEqual(byId.vie_associative, ['Bienvenue', "Comment s'inscrire ?", 'Nos outils de communication'])
    assert.deepEqual(byId.commencer_danse, ['Danseurs : fournitures', 'Danseuses : fournitures', 'Mener une animation'])
    assert.deepEqual(byId.terroir, ['Le Pays Glazig', 'Le costume de "Petit dimanche"', 'Le costume velour 1935-1938'])
    assert.deepEqual(byId.culture_collectage, ['Liste des danses', 'Ridée 6 temps', 'Pilé-Menu', 'Rond de Pagan'])
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
