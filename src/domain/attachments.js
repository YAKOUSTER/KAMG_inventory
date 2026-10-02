let attachmentSeq = 0

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])

export function guessMimeType(filename = '', mimeType = '') {
  const normalized = String(mimeType || '').toLowerCase()
  if (normalized) return normalized
  const ext = String(filename || '').split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return ''
}

export function isImageAttachment(attachment) {
  const mime = guessMimeType(attachment?.filename, attachment?.mimeType)
  return IMAGE_MIMES.has(mime)
}

export function createAttachment({ src, filename = '', label = '', mimeType = '', id }) {
  attachmentSeq += 1
  const safeName = String(filename || '').trim()
  return {
    id: id || `att-${Date.now()}-${attachmentSeq}`,
    src,
    filename: safeName,
    label: String(label || '').trim(),
    mimeType: guessMimeType(safeName, mimeType),
  }
}

export function normalizeAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .map((entry, index) => {
      if (!entry) return null
      if (typeof entry === 'string') {
        const name = entry.split('/').pop() || ''
        return createAttachment({ src: entry, filename: name, id: `att-${index}` })
      }
      const src = entry.src || entry.url || ''
      if (!src) return null
      return createAttachment({
        id: entry.id || `att-${index}`,
        src,
        filename: entry.filename || entry.name || '',
        label: entry.label || entry.legende || '',
        mimeType: entry.mimeType || entry.type || '',
      })
    })
    .filter(Boolean)
}
