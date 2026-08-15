const TOKEN_KEY = 'patrimoine-token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

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
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) {
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
  logout: () => request('/api/auth/logout', { method: 'POST', body: {} }),
  me: () => request('/api/auth/me'),
  stats: () => request('/api/stats'),
  items: () => request('/api/items'),
  item: (id) => request(`/api/items/${id}`),
  createItem: (body) => request('/api/items', { method: 'POST', body }),
  updateItem: (id, body) => request(`/api/items/${id}`, { method: 'PUT', body }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  people: () => request('/api/people'),
  person: (id) => request(`/api/people/${id}`),
  createPerson: (body) => request('/api/people', { method: 'POST', body }),
  updatePerson: (id, body) => request(`/api/people/${id}`, { method: 'PUT', body }),
  deletePerson: (id) => request(`/api/people/${id}`, { method: 'DELETE' }),
  loans: () => request('/api/loans'),
  loan: (id) => request(`/api/loans/${id}`),
  createLoan: (body) => request('/api/loans', { method: 'POST', body }),
  returnLoan: (id, itemIds, dateRetour) =>
    request(`/api/loans/${id}/return`, { method: 'PUT', body: { itemIds, dateRetour } }),
  exportDb: () => request('/api/db'),
  importDb: (body) => request('/api/db', { method: 'PUT', body }),
  upload: (filename, dataUrl, prefix) =>
    request('/api/uploads', { method: 'POST', body: { filename, dataUrl, prefix } }),
  users: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body }),
  updateUser: (id, body) => request(`/api/users/${id}`, { method: 'PUT', body }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
}
