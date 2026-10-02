let imageSeq = 0

export function createImage({ src, legende = '', credit = '', principale = false, id }) {
  imageSeq += 1
  return {
    id: id || `img-${Date.now()}-${imageSeq}`,
    src,
    legende,
    credit,
    principale: Boolean(principale),
  }
}

export function normalizeImages(images = []) {
  const list = (Array.isArray(images) ? images : [])
    .map((img, index) => {
      if (!img) return null
      if (typeof img === 'string') {
        return createImage({ src: img, id: `img-${index}` })
      }
      const src = img.src || img.url || ''
      if (!src) return null
      return createImage({
        id: img.id || `img-${index}`,
        src,
        legende: img.legende || img.caption || '',
        credit: img.credit || '',
        principale: Boolean(img.principale),
      })
    })
    .filter(Boolean)

  const principalIndex = list.findIndex((img) => img.principale)
  const chosen = principalIndex >= 0 ? principalIndex : 0
  return list.map((img, index) => ({
    ...img,
    principale: list.length ? index === chosen : false,
  }))
}

export function coverSrc(item, getItem) {
  const images = effectiveImages(item, getItem)
  return images.find((img) => img.principale)?.src || images[0]?.src || ''
}

export function effectiveImages(item, getItem, depth = 0) {
  const own = normalizeImages(item?.images)
  if (own.length) return own
  if (depth > 5 || !getItem) return []
  const sourceId = String(item?.photoSourceId || '').trim()
  if (!sourceId || sourceId === item?.id) return []
  const source = getItem(sourceId)
  if (!source) return []
  if (normalizeImages(source.images).length) return normalizeImages(source.images)
  return effectiveImages(source, getItem, depth + 1)
}

export function usesInheritedPhotos(item) {
  return !normalizeImages(item?.images).length && Boolean(String(item?.photoSourceId || '').trim())
}

export function setPrincipal(images, id) {
  return normalizeImages(images).map((img) => ({
    ...img,
    principale: img.id === id,
  }))
}

export function moveImage(images, id, direction) {
  const list = normalizeImages(images)
  const index = list.findIndex((img) => img.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= list.length) return list
  const copy = [...list]
  const [item] = copy.splice(index, 1)
  copy.splice(target, 0, item)
  return copy
}
