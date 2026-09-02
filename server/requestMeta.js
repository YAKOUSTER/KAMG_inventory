export function isLoopbackAddress(value) {
  const ip = String(value || '')
    .replace(/^::ffff:/, '')
    .trim()
    .toLowerCase()
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'
}

export function clientIp(req) {
  const remote = String(req.socket?.remoteAddress || req.ip || '').trim()
  if (isLoopbackAddress(remote)) {
    const forwarded = String(req.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim()
    if (forwarded) return forwarded
  }
  return remote || 'unknown'
}

export function requestOrigin(req) {
  const configured = String(process.env.KAMG_PUBLIC_URL || '').replace(/\/$/, '')
  if (configured) return configured
  const remote = String(req.socket?.remoteAddress || req.ip || '').trim()
  const allowForwarded = isLoopbackAddress(remote)
  const forwardedHost = allowForwarded
    ? String(req.headers?.['x-forwarded-host'] || '')
        .split(',')[0]
        .trim()
    : ''
  const host = forwardedHost || req.headers?.host || 'localhost:5173'
  const forwardedProto = allowForwarded
    ? String(req.headers?.['x-forwarded-proto'] || '')
        .split(',')[0]
        .trim()
    : ''
  const proto = forwardedProto || (req.secure ? 'https' : 'http')
  return `${proto}://${host}`
}
