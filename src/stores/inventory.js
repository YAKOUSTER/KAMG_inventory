import { defineStore } from 'pinia'
import { api } from '@/services/api'
import { filterItems } from '@/domain/filters'

function isDenied(error) {
  return /Accès refusé/.test(error?.message || '')
}

async function loadOr(fn, fallback) {
  try {
    return await fn()
  } catch (error) {
    if (isDenied(error)) return fallback
    throw error
  }
}

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: [],
    people: [],
    loans: [],
    stats: null,
    loading: false,
    error: '',
  }),
  getters: {
    itemById: (state) => (id) => state.items.find((item) => item.id === id),
    filtered: (state) => (filters) => filterItems(state.items, filters),
  },
  actions: {
    async refresh() {
      this.loading = true
      this.error = ''
      try {
        const [items, people, loans, stats] = await Promise.all([
          loadOr(() => api.items(), []),
          loadOr(() => api.people(), []),
          loadOr(() => api.loans(), []),
          loadOr(() => api.stats(), null),
        ])
        this.items = items
        this.people = people
        this.loans = loans
        this.stats = stats
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
