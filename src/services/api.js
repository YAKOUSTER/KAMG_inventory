async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Erreur ${response.status}`)
  }
  return data
}

export const api = {
  stats: () => request('/api/stats'),
  items: () => request('/api/items'),
  item: (id) => request(`/api/items/${id}`),
  createItem: (body) => request('/api/items', { method: 'POST', body }),
  updateItem: (id, body) => request(`/api/items/${id}`, { method: 'PUT', body }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  people: () => request('/api/people'),
  createPerson: (body) => request('/api/people', { method: 'POST', body }),
  updatePerson: (id, body) => request(`/api/people/${id}`, { method: 'PUT', body }),
  deletePerson: (id) => request(`/api/people/${id}`, { method: 'DELETE' }),
  loans: () => request('/api/loans'),
  loan: (id) => request(`/api/loans/${id}`),
  createLoan: (body) => request('/api/loans', { method: 'POST', body }),
  returnLoan: (id, itemIds) => request(`/api/loans/${id}/return`, { method: 'PUT', body: { itemIds } }),
  exportDb: () => request('/api/db'),
  importDb: (body) => request('/api/db', { method: 'PUT', body }),
  upload: (filename, dataUrl, prefix) =>
    request('/api/uploads', { method: 'POST', body: { filename, dataUrl, prefix } }),
}
