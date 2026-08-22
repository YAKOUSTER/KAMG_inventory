import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MEMBER_CONTENT_VERSION,
  applyMemberContent,
  mergeMemberPages,
  removeLegacyMemberPages,
  shouldImportMemberContent,
  upsertMemberPage,
} from './memberContent.js'

describe('shouldImportMemberContent', () => {
  it('importe si la version est absente ou ancienne', () => {
    assert.equal(shouldImportMemberContent({ meta: {} }), true)
    assert.equal(shouldImportMemberContent({ meta: { memberContentVersion: 1 } }), true)
    assert.equal(shouldImportMemberContent({ meta: { memberContentVersion: MEMBER_CONTENT_VERSION } }), false)
  })
})

describe('upsertMemberPage', () => {
  it('préfère le texte seed plus complet et conserve les médias existants', () => {
    const merged = upsertMemberPage(
      {
        id: 'page-ca',
        categorie: 'newsletter',
        titre: 'CA',
        corps: 'Court',
        medias: [{ type: 'image', url: '/uploads/photo.jpg', legende: 'Photo', ordre: 0 }],
        ordre: 1,
        publie: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'page-ca',
        categorie: 'newsletter',
        titre: 'Conseil d’administration',
        corps: 'Texte plus long avec détails du conseil d’administration.',
        medias: [],
        ordre: 1,
        publie: true,
      },
    )
    assert.ok(merged.corps.includes('Texte plus long'))
    assert.equal(merged.medias.length, 1)
    assert.equal(merged.titre, 'Conseil d’administration')
  })
})

describe('mergeMemberPages', () => {
  it('ajoute les pages manquantes sans écraser les médias locaux', () => {
    const pages = mergeMemberPages(
      [{ id: 'a', categorie: 'autre', titre: 'A', corps: 'x', medias: [], ordre: 0, publie: true }],
      [{ id: 'b', categorie: 'presentation', titre: 'B', corps: 'y', medias: [], ordre: 1, publie: true }],
    )
    assert.equal(pages.length, 2)
  })
})

describe('removeLegacyMemberPages', () => {
  it('retire les anciennes pages du jeu d’exemple', () => {
    const pages = removeLegacyMemberPages([
      { id: 'page-presentation', titre: 'Old' },
      { id: 'page-bienvenue', titre: 'New' },
    ])
    assert.deepEqual(pages.map((page) => page.id), ['page-bienvenue'])
  })
})

describe('applyMemberContent', () => {
  it('met à jour meta et fusionne le seed Glide', () => {
    const db = {
      meta: { version: 1 },
      pages: [{ id: 'page-presentation', categorie: 'presentation', titre: 'Old', corps: 'x', publie: true }],
    }
    const changed = applyMemberContent(db, [
      {
        id: 'page-bienvenue',
        categorie: 'presentation',
        titre: 'Bienvenue',
        corps: 'Texte complet',
        ordre: 1,
        publie: true,
      },
    ])
    assert.equal(changed, true)
    assert.equal(db.meta.memberContentVersion, MEMBER_CONTENT_VERSION)
    assert.ok(db.pages.some((page) => page.id === 'page-bienvenue'))
    assert.ok(!db.pages.some((page) => page.id === 'page-presentation'))
  })
})
