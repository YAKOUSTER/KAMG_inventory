export function isIosUserAgent(userAgent = '', { platform, maxTouchPoints } = {}) {
  const ua = String(userAgent || '')
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  return platform === 'MacIntel' && Number(maxTouchPoints) > 1
}

export function isStandaloneDisplay({ standalone, displayMode } = {}) {
  return standalone === true || displayMode === 'standalone'
}

export function iosNeedsHomeScreen(env = {}) {
  return isIosUserAgent(env.userAgent, env) && !isStandaloneDisplay(env)
}

export function pushToggleSubtitle({
  supported,
  enabled,
  subscribed,
  iosTab,
} = {}) {
  if (!supported && iosTab) {
    return 'Sur iPhone : Partager → Sur l’écran d’accueil, puis ouvrez l’icône KAMG'
  }
  if (!supported) return 'Non supporté sur ce navigateur'
  if (!enabled) return 'Serveur non configuré (VAPID)'
  if (subscribed) return 'À ranger, mot de passe oublié, emprunts et nouvelles dates'
  return 'Alertes À ranger, mot de passe oublié, emprunts et dates'
}

export function pushUnsupportedMessage({ iosTab } = {}) {
  if (iosTab) {
    return 'Sur iPhone, ajoutez kamg.fr à l’écran d’accueil (Partager → Sur l’écran d’accueil), ouvrez l’icône KAMG, puis activez les notifications.'
  }
  return 'Notifications non supportées sur ce navigateur. Essayez Chrome ou Firefox, en HTTPS.'
}
