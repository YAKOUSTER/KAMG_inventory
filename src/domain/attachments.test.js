import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isImageAttachment, normalizeAttachments } from './attachments.js'

describe('normalizeAttachments', () => {
  it('accepte les chemins en chaîne', () => {
    const list = normalizeAttachments(['/uploads/patron.pdf'])
    assert.equal(list.length, 1)
    assert.equal(list[0].src, '/uploads/patron.pdf')
    assert.equal(list[0].mimeType, 'application/pdf')
  })

  it('conserve nom, label et type', () => {
    const list = normalizeAttachments([
      {
        src: '/uploads/croquis.png',
        filename: 'croquis-face.png',
        label: 'Croquis de face',
        mimeType: 'image/png',
      },
    ])
    assert.equal(list[0].filename, 'croquis-face.png')
    assert.equal(list[0].label, 'Croquis de face')
    assert.equal(isImageAttachment(list[0]), true)
  })
})

describe('isImageAttachment', () => {
  it('distingue image et PDF', () => {
    assert.equal(isImageAttachment({ mimeType: 'application/pdf' }), false)
    assert.equal(isImageAttachment({ filename: 'scan.jpg' }), true)
  })
})
