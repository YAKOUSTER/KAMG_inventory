export async function compressImageFile(file, { maxEdge = 1920, quality = 0.82 } = {}) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    return {
      dataUrl,
      filename: String(file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg',
    }
  }

  return readAsDataUrl(file, file.name || 'photo.jpg')
}

function readAsDataUrl(file, filename) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ dataUrl: reader.result, filename })
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}
