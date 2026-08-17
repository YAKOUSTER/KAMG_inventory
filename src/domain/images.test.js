import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { coverSrc, effectiveImages, moveImage, normalizeImages, setPrincipal } from './images.js'

describe('normalizeImages', () => {
  it('accepte les anciens chemins en chaîne', () => {
    const images = normalizeImages(['/uploads/a.jpg', '/uploads/b.jpg'])
    assert.equal(images.length, 2)
    assert.equal(images[0].src, '/uploads/a.jpg')
    assert.equal(images[0].principale, true)
    assert.equal(images[1].principale, false)
  })

  it('garde une seule photo principale', () => {
    const images = normalizeImages([
      { src: '/a.jpg', principale: true },
      { src: '/b.jpg', principale: true, legende: 'Dos' },
    ])
    assert.equal(images.filter((img) => img.principale).length, 1)
    assert.equal(images[0].principale, true)
    assert.equal(images[1].legende, 'Dos')
  })
})

describe('coverSrc', () => {
  it('prend la photo marquée principale', () => {
    assert.equal(
      coverSrc({
        images: [
          { src: '/face.jpg' },
          { src: '/detail.jpg', principale: true },
        ],
      }),
      '/detail.jpg',
    )
  })
})

describe('effectiveImages', () => {
  it('reprend les photos de la fiche modèle si la sienne est vide', () => {
    const items = [
      { id: 'm', code: 'CHAU-M', images: [{ src: '/shoe.jpg', principale: true }] },
      { id: 'v', code: 'CHAU-38', images: [], photoSourceId: 'm' },
    ]
    const getItem = (id) => items.find((item) => item.id === id)
    assert.equal(coverSrc(items[1], getItem), '/shoe.jpg')
    assert.equal(effectiveImages(items[1], getItem).length, 1)
  })

  it('garde les photos propres en priorité', () => {
    const items = [
      { id: 'm', images: [{ src: '/default.jpg' }] },
      { id: 'v', images: [{ src: '/own.jpg' }], photoSourceId: 'm' },
    ]
    const getItem = (id) => items.find((item) => item.id === id)
    assert.equal(coverSrc(items[1], getItem), '/own.jpg')
  })
})

describe('setPrincipal et moveImage', () => {
  it('change la photo de couverture et réordonne', () => {
    const start = normalizeImages(['/a.jpg', '/b.jpg', '/c.jpg'])
    const promoted = setPrincipal(start, start[2].id)
    assert.equal(coverSrc({ images: promoted }), '/c.jpg')
    const moved = moveImage(start, start[2].id, -1)
    assert.deepEqual(
      moved.map((img) => img.src),
      ['/a.jpg', '/c.jpg', '/b.jpg'],
    )
  })
})
