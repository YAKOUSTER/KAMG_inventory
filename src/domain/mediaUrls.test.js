import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isValidAbsoluteUrl,
  isYoutubeUrl,
  mediaKind,
  normalizeMediaUrl,
  youtubeEmbedUrl,
  youtubeVideoId,
  driveImageFallbackUrls,
} from './mediaUrls.js'

describe('normalizeMediaUrl', () => {
  it('convertit Google Drive en URL lh3 affichable', () => {
    assert.equal(
      normalizeMediaUrl('https://drive.google.com/file/d/ABC123/view?usp=sharing'),
      'https://lh3.googleusercontent.com/d/ABC123=w1200',
    )
    assert.equal(
      normalizeMediaUrl('https://drive.google.com/uc?export=view&id=XYZ789'),
      'https://lh3.googleusercontent.com/d/XYZ789=w1200',
    )
  })

  it('ignore les noms de fichier sans URL', () => {
    assert.equal(normalizeMediaUrl('photo.jpg'), '')
    assert.equal(normalizeMediaUrl('277246805_facebook.jpg'), '')
  })

  it('conserve les photos locales de l’application', () => {
    assert.equal(normalizeMediaUrl('/content/costume.jpg'), '/content/costume.jpg')
    assert.equal(normalizeMediaUrl('/uploads/fiche-1.jpg'), '/uploads/fiche-1.jpg')
  })

  it('conserve les URLs Glide et externes valides', () => {
    const glide =
      'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/abc/pub/img.png'
    assert.equal(normalizeMediaUrl(glide), glide)
  })
})

describe('youtube helpers', () => {
  it('extrait l’identifiant et construit l’embed', () => {
    assert.equal(youtubeVideoId('https://youtu.be/SOf62Fvaeo4'), 'SOf62Fvaeo4')
    assert.equal(
      youtubeEmbedUrl('https://www.youtube.com/watch?v=9AXpScIft8E&ab_channel=x'),
      'https://www.youtube.com/embed/9AXpScIft8E',
    )
    assert.equal(isYoutubeUrl('https://youtu.be/abc123'), true)
    assert.equal(mediaKind('https://youtu.be/abc123'), 'youtube')
  })
})

describe('isValidAbsoluteUrl', () => {
  it('accepte http(s) seulement', () => {
    assert.equal(isValidAbsoluteUrl('https://example.com/a.jpg'), true)
    assert.equal(isValidAbsoluteUrl('ftp://example.com'), false)
    assert.equal(isValidAbsoluteUrl('just-a-name.jpg'), false)
  })
})

describe('driveImageFallbackUrls', () => {
  it('propose plusieurs URLs Drive pour l’affichage', () => {
    const urls = driveImageFallbackUrls('https://drive.google.com/file/d/ABC123/view')
    assert.ok(urls[0].includes('lh3.googleusercontent.com/d/ABC123'))
    assert.ok(urls.some((url) => url.includes('thumbnail')))
    assert.ok(urls.some((url) => url.includes('uc?export=view')))
  })
})
