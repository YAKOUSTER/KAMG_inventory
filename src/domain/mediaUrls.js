const DRIVE_FILE_RE = /drive\.google\.com\/file\/d\/([^/?]+)/
const DRIVE_UC_RE = /drive\.google\.com\/uc\?[^#]*\bid=([^&]+)/
const YOUTUBE_RE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/

export function isValidAbsoluteUrl(raw) {
  const url = String(raw ?? '').trim()
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function extractDriveFileId(raw) {
  const url = String(raw ?? '').trim()
  if (!url) return ''
  const fileMatch = url.match(DRIVE_FILE_RE)
  if (fileMatch) return fileMatch[1]
  const ucMatch = url.match(DRIVE_UC_RE)
  if (ucMatch) return ucMatch[1]
  return ''
}

/** URL affichable dans une balise img (Drive → CDN Google). */
export function normalizeMediaUrl(raw, { width = 1200 } = {}) {
  const url = String(raw ?? '').trim()
  if (!url) return ''

  const driveId = extractDriveFileId(url)
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}=w${width}`
  }

  if (!isValidAbsoluteUrl(url)) return ''
  return url
}

export function youtubeVideoId(raw) {
  const url = String(raw ?? '').trim()
  if (!url) return ''
  const match = url.match(YOUTUBE_RE)
  return match ? match[1] : ''
}

export function youtubeEmbedUrl(raw) {
  const id = youtubeVideoId(raw)
  return id ? `https://www.youtube.com/embed/${id}` : ''
}

export function isYoutubeUrl(raw) {
  return Boolean(youtubeVideoId(raw))
}

export function mediaKind(raw) {
  const url = String(raw ?? '').trim()
  if (!url) return 'image'
  if (isYoutubeUrl(url)) return 'youtube'
  if (/\.mp4(\?|$)/i.test(url)) return 'video'
  return 'image'
}

export function displayMediaUrl(raw) {
  if (isYoutubeUrl(raw)) return youtubeEmbedUrl(raw)
  return normalizeMediaUrl(raw)
}
