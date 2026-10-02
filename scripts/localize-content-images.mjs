import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'content')
const pagesPath = path.join(root, 'data', 'member-pages.json')
const seedPath = path.join(root, 'data', 'seed.json')

const DRIVE_ID_RE = /(?:lh3\.googleusercontent\.com\/d\/|drive\.google\.com\/(?:file\/d\/|uc\?[^#]*id=))([A-Za-z0-9_-]+)/

function driveId(url) {
  const match = String(url || '').match(DRIVE_ID_RE)
  return match ? match[1] : ''
}

function slugFromUrl(url) {
  const id = driveId(url)
  if (id) return id.slice(0, 24)
  const base = String(url).split('/').pop().split('?')[0].replace(/\.[a-z0-9]+$/i, '')
  return (base || 'img').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || 'img'
}

function collectImageUrls(pages = []) {
  const urls = new Set()
  for (const page of pages) {
    const cover = page?.couverture
    if (cover && cover.type !== 'youtube' && cover.type !== 'video' && cover.url) urls.add(cover.url)
    for (const media of page?.medias || []) {
      if (!media?.url) continue
      if (media.type === 'youtube' || media.type === 'video') continue
      urls.add(media.url)
    }
  }
  return [...urls]
}

function candidateUrls(url) {
  const id = driveId(url)
  if (!id) return [url]
  return [
    `https://lh3.googleusercontent.com/d/${id}=s1600`,
    `https://lh3.googleusercontent.com/d/${id}=w1600`,
    `https://drive.google.com/uc?export=download&id=${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
    url,
  ]
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; KAMG-content-localizer/1.0)',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  const type = String(response.headers.get('content-type') || '')
  if (type.includes('text/html')) throw new Error(`html ${url}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 80) throw new Error(`tiny ${url}`)
  if (buffer.slice(0, 15).toString('utf8').includes('<!DOCTYPE') || buffer.slice(0, 14).toString('utf8').includes('<html')) {
    throw new Error(`html-body ${url}`)
  }
  return buffer
}

async function downloadOne(url) {
  let lastError
  for (const candidate of candidateUrls(url)) {
    try {
      const buffer = await fetchBuffer(candidate)
      const jpeg = await sharp(buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer()
      return jpeg
    } catch (error) {
      lastError = error
    }
  }
  throw lastError || new Error(url)
}

function rewriteMedia(media, mapping) {
  if (!media?.url) return media
  if (media.type === 'youtube' || media.type === 'video') return media
  const local = mapping.get(media.url)
  return local ? { ...media, url: local } : media
}

function rewritePages(pages, mapping) {
  return pages.map((page) => ({
    ...page,
    couverture: page.couverture ? rewriteMedia(page.couverture, mapping) : page.couverture,
    medias: (page.medias || []).map((media) => rewriteMedia(media, mapping)),
  }))
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const pagesFile = JSON.parse(await readFile(pagesPath, 'utf8'))
  const seedFile = JSON.parse(await readFile(seedPath, 'utf8'))
  const urls = collectImageUrls([...(pagesFile.pages || []), ...(seedFile.pages || [])])
  const mapping = new Map()
  const usedNames = new Set()
  let failed = 0

  for (const url of urls) {
    if (url.startsWith('/content/')) {
      mapping.set(url, url)
      continue
    }
    let name = `${slugFromUrl(url)}.jpg`
    let n = 2
    while (usedNames.has(name)) {
      name = `${slugFromUrl(url)}-${n}.jpg`
      n += 1
    }
    usedNames.add(name)
    const dest = path.join(outDir, name)
    process.stdout.write(`download ${name} … `)
    try {
      const jpeg = await downloadOne(url)
      await writeFile(dest, jpeg)
      mapping.set(url, `/content/${name}`)
      console.log(`${jpeg.length} bytes`)
    } catch (error) {
      failed += 1
      console.log(`FAIL ${error.message}`)
    }
  }

  pagesFile.pages = rewritePages(pagesFile.pages || [], mapping)
  seedFile.pages = rewritePages(seedFile.pages || [], mapping)
  await writeFile(pagesPath, `${JSON.stringify(pagesFile, null, 2)}\n`)
  await writeFile(seedPath, `${JSON.stringify(seedFile, null, 2)}\n`)
  console.log(`mapped ${mapping.size}/${urls.length}, failed ${failed}`)
  if (failed) process.exitCode = 1
}

await main()
