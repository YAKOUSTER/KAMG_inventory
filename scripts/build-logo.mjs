#!/usr/bin/env node
/**
 * Génère logo-kamg.png, favicon.png et apple-touch-icon.png
 * à partir d'une source (fond blanc ou noir retiré).
 *
 * Usage: node scripts/build-logo.mjs [chemin/source.png]
 * Défaut: public/logo-source.png
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const srcPath = path.resolve(root, process.argv[2] || 'public/logo-source.png')
const publicDir = path.join(root, 'public')

function isBackground(r, g, b) {
  // Blanc pur ou quasi blanc
  if (r > 238 && g > 238 && b > 238) return true
  // Noir pur (legacy)
  if (r < 28 && g < 28 && b < 28) return true
  return false
}

async function makeTransparent(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (isBackground(r, g, b)) data[i + 3] = 0
    else data[i + 3] = 255
  }
  return sharp(data, { raw: { width, height, channels } }).trim().png({ compressionLevel: 9, palette: true, quality: 92 })
}

async function writeOutputs(pipeline) {
  const trimmed = await pipeline
    .clone()
    .resize(820, 820, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toBuffer()

  await fs.writeFile(path.join(publicDir, 'logo-kamg.png'), trimmed)
  console.log('logo-kamg.png', trimmed.length, 'bytes')

  await sharp(trimmed)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))

  await sharp(trimmed)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toFile(path.join(publicDir, 'favicon.png'))

  console.log('favicon + apple-touch-icon mis à jour')
}

async function main() {
  try {
    await fs.access(srcPath)
  } catch {
    console.error(`Fichier source introuvable : ${srcPath}`)
    console.error('Placez le logo (PNG/JPG) dans public/logo-source.png puis relancez.')
    process.exit(1)
  }
  console.log('Source:', srcPath)
  const pipeline = await makeTransparent(srcPath)
  await writeOutputs(pipeline)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
