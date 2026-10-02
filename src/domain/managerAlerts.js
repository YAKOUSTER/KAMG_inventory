export function userDisplayName(user) {
  return String(user?.nom || user?.login || '').trim() || 'Nouveau compte'
}

export function buildPendingMemberNotification(user) {
  const signup = user?.signup && typeof user.signup === 'object' ? user.signup : {}
  const name = userDisplayName(user)
  const email = String(user?.email || user?.login || '').trim()
  const relation = signup.relation === 'parent' ? 'parent' : 'danseur'
  const who = email ? `${name} (${email})` : name
  const parts = [`${who} s’est inscrit·e comme ${relation}.`]
  if (String(signup.childrenNames || '').trim()) {
    parts.push(`Enfant(s) : ${String(signup.childrenNames).trim()}.`)
  }
  parts.push('À ranger dans Membres.')
  return {
    title: 'Nouveau membre à ranger',
    body: parts.join(' '),
    url: '/a-ranger',
    tag: 'a-ranger',
  }
}

export function buildPasswordResetNotification(user, { mailSent } = {}) {
  const name = userDisplayName(user)
  let body = `${name} a demandé une réinitialisation.`
  if (mailSent === false) {
    body += ' L’e-mail n’est pas parti. Copiez un lien depuis Comptes et accès.'
  }
  return {
    title: 'Mot de passe oublié',
    body,
    url: '/utilisateurs',
    tag: 'password-reset',
  }
}
