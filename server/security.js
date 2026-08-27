export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ')

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (req.path !== '/api/public/calendar.ics' && req.path !== '/calendrier.ics' && req.path !== '/calendar.ics') {
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY)
  }
  next()
}
