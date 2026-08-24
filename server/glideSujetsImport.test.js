import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCorpsFromRow,
  buildMediasFromRow,
  categoryForRow,
  importGlideSujetsCsv,
  normalizeGlideMediaUrl,
  pageIdForRow,
} from './glideSujetsImport.js'

describe('normalizeGlideMediaUrl', () => {
  it('convertit les liens Google Drive en URL directe', () => {
    assert.equal(
      normalizeGlideMediaUrl('https://drive.google.com/file/d/ABC123/view?usp=sharing'),
      'https://lh3.googleusercontent.com/d/ABC123=w1200',
    )
  })
})

describe('importGlideSujetsCsv', () => {
  const sample = `"Types de sujets","Titre","Sous-titre","Photo","Description","LIEN 1 PRINCIPAL","Zone 1 : Sous-titre","Zone 1 : Image","Zone 1 : Paragraphe","Zone 1 : vidéo","Zone 1 : Lien","Image 1"
"Commencer la danse","Bienvenue","dans le cercle","https://drive.google.com/file/d/PHOTO1/view","Intro cercle","","Kenleur","https://drive.google.com/file/d/IMG1/view","Texte Kenleur","","https://www.kenleur.bzh/",""
"Danses et chants","Rond de Pagan","Chant","https://storage.googleapis.com/glide/x.jpg","","","","","Paroles du chant","","",""
`

  it('parse le CSV et produit des pages avec médias', () => {
    const pages = importGlideSujetsCsv(sample)
    assert.equal(pages.length, 2)
    assert.equal(pages[0].id, 'page-bienvenue')
    assert.equal(pages[0].categorie, 'presentation')
    assert.ok(pages[0].corps.includes('Kenleur'))
    assert.ok(pages[0].medias.length >= 2)
    assert.equal(pages[1].categorie, 'vocabulaire')
  })
})

describe('buildCorpsFromRow', () => {
  it('assemble description, zones et liens', () => {
    const corps = buildCorpsFromRow({
      Titre: 'Test',
      'Sous-titre': 'Accroche',
      Description: 'Intro',
      'Zone 1 : Sous-titre': 'Section A',
      'Zone 1 : Paragraphe': 'Contenu A',
      'Zone 1 : Lien': 'https://example.com',
    })
    assert.match(corps, /Accroche/)
    assert.match(corps, /## Section A/)
    assert.match(corps, /example\.com/)
  })
})

describe('buildMediasFromRow', () => {
  it('déduplique les URLs', () => {
    const url = 'https://drive.google.com/file/d/XYZ/view'
    const medias = buildMediasFromRow({
      Photo: url,
      'Zone 1 : Image': url,
      'Zone 1 : vidéo': 'https://youtu.be/abc123',
    })
    assert.equal(medias.length, 2)
    assert.equal(medias[1].type, 'youtube')
  })
})

describe('pageIdForRow', () => {
  it('réutilise les identifiants stables', () => {
    assert.equal(pageIdForRow({ Titre: "Comment s'inscrire ?" }), 'page-inscription')
  })
})

describe('categoryForRow', () => {
  it('mappe les types Glide vers les catégories app', () => {
    assert.equal(categoryForRow({ 'Types de sujets': 'Danses et chants', Titre: 'X' }), 'vocabulaire')
    assert.equal(categoryForRow({ 'Types de sujets': 'Commencer la danse', Titre: 'Bienvenue' }), 'presentation')
  })
})
