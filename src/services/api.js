const TOKEN_KEY = 'patrimoine-token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export { getToken }

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

let onUnauthorized = () => {}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  }).catch((err) => {
    throw new Error(
      err?.message === 'Failed to fetch' || err?.name === 'TypeError'
        ? 'Le serveur ne répond pas. Réessayez dans un instant.'
        : err.message || 'Connexion impossible',
    )
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401 && token) {
    onUnauthorized()
    throw new Error(data.error || 'Connexion requise')
  }
  if (!response.ok) {
    throw new Error(data.error || `Erreur ${response.status}`)
  }
  return data
}

export const api = {
  login: (login, password) => request('/api/auth/login', { method: 'POST', body: { login, password } }),
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) =>
    request('/api/auth/reset-password', { method: 'POST', body: { token, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: {} }),
  me: () => request('/api/auth/me'),
  bootstrap: () => request('/api/bootstrap'),
  stats: () => request('/api/stats'),
  items: () => request('/api/items'),
  item: (id) => request(`/api/items/${id}`),
  createItem: (body) => request('/api/items', { method: 'POST', body }),
  updateItem: (id, body) => request(`/api/items/${id}`, { method: 'PUT', body }),
  adjustStock: (id, body) => request(`/api/items/${id}/stock`, { method: 'POST', body }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  people: () => request('/api/people'),
  person: (id) => request(`/api/people/${id}`),
  createPerson: (body) => request('/api/people', { method: 'POST', body }),
  updatePerson: (id, body) => request(`/api/people/${id}`, { method: 'PUT', body }),
  updateMemberProfile: (id, body) =>
    request(`/api/public/profile/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deletePerson: (id) => request(`/api/people/${id}`, { method: 'DELETE' }),
  loans: () => request('/api/loans'),
  loan: (id) => request(`/api/loans/${id}`),
  createLoan: (body) => request('/api/loans', { method: 'POST', body }),
  returnLoan: (id, body) => request(`/api/loans/${id}/return`, { method: 'PUT', body }),
  updateLoan: (id, body) => request(`/api/loans/${id}`, { method: 'PUT', body }),
  cancelLoan: (id) => request(`/api/loans/${id}`, { method: 'DELETE' }),
  exportDb: () => request('/api/db'),
  importDb: (body) => request('/api/db', { method: 'PUT', body }),
  referentiels: () => request('/api/referentiels'),
  updateReferentiels: (body) => request('/api/referentiels', { method: 'PUT', body }),
  upload: (filename, dataUrl, prefix) =>
    request('/api/uploads', { method: 'POST', body: { filename, dataUrl, prefix } }),
  users: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body }),
  updateUser: (id, body) => request(`/api/users/${id}`, { method: 'PUT', body }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  createPasswordResetLink: (id) =>
    request(`/api/users/${encodeURIComponent(id)}/reset-link`, { method: 'POST', body: {} }),
  audit: (query = {}) => {
    const params = new URLSearchParams()
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    if (query.action) params.set('action', query.action)
    if (query.entityType) params.set('entityType', query.entityType)
    const qs = params.toString()
    return request(`/api/audit${qs ? `?${qs}` : ''}`)
  },
  clearAudit: () => request('/api/audit', { method: 'DELETE' }),
  publicMemberSpace: () => request('/api/public/espace-membre'),
  pendingMembers: () => request('/api/members/pending'),
  placeMember: (id, body) => request(`/api/members/${encodeURIComponent(id)}/place`, { method: 'POST', body }),
  events: () => request('/api/events'),
  event: (id) => request(`/api/events/${encodeURIComponent(id)}`),
  createEvent: (body) => request('/api/events', { method: 'POST', body }),
  updateEvent: (id, body) => request(`/api/events/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteEvent: (id) => request(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  eventPresences: (id) => request(`/api/events/${encodeURIComponent(id)}/presences`),
  presences: () => request('/api/presences'),
  setEventPresence: (id, body) =>
    request(`/api/events/${encodeURIComponent(id)}/presences`, { method: 'PUT', body }),
  setPublicEventPresence: (id, body) =>
    request(`/api/public/events/${encodeURIComponent(id)}/presence`, { method: 'POST', body }),
  publicPage: (id) => request(`/api/public/pages/${encodeURIComponent(id)}`),
  agendaSettings: () => request('/api/settings/agenda'),
  updateAgendaSettings: (body) => request('/api/settings/agenda', { method: 'PUT', body }),
  eventCatalog: () => request('/api/settings/event-catalog'),
  updateEventCatalog: (body) => request('/api/settings/event-catalog', { method: 'PUT', body }),
  syncAgenda: () => request('/api/agenda/sync', { method: 'POST', body: {} }),
  pushConfig: () => request('/api/push/config'),
  pushSubscribe: (body) => request('/api/push/subscribe', { method: 'POST', body }),
  pushUnsubscribe: (body) => request('/api/push/subscribe', { method: 'DELETE', body }),
  pages: () => request('/api/pages'),
  page: (id) => request(`/api/pages/${id}`),
  createPage: (body) => request('/api/pages', { method: 'POST', body }),
  updatePage: (id, body) => request(`/api/pages/${id}`, { method: 'PUT', body }),
  deletePage: (id) => request(`/api/pages/${id}`, { method: 'DELETE' }),
}
