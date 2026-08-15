import { defineStore } from 'pinia'
import { api } from '@/services/api'
import { filterItems } from '@/domain/filters'

function isDenied(error) {
  return /Accès refusé/.test(error?.message || '')
}

let inflight = null

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: [],
    people: [],
    loans: [],
    stats: null,
    loading: false,
    loaded: false,
    error: '',
  }),
  getters: {
    itemById: (state) => (id) => state.items.find((item) => item.id === id),
    filtered: (state) => (filters) => filterItems(state.items, filters),
  },
  actions: {
    hydrate(payload) {
      if (!payload) return
      this.items = payload.items || []
      this.people = payload.people || []
      this.loans = payload.loans || []
      this.stats = payload.stats || null
      this.loaded = true
      this.error = ''
    },
    reset() {
      this.items = []
      this.people = []
      this.loans = []
      this.stats = null
      this.loaded = false
      this.error = ''
    },
    async refresh({ force = false } = {}) {
      if (this.loaded && !force) return
      if (inflight) return inflight
      this.loading = true
      this.error = ''
      inflight = (async () => {
        const data = await api.bootstrap()
        this.hydrate(data)
      })()
        .catch((error) => {
          if (isDenied(error)) {
            this.hydrate({ items: [], people: [], loans: [], stats: null })
            return
          }
          this.error = error.message
          throw error
        })
        .finally(() => {
          this.loading = false
          inflight = null
        })
      return inflight
    },
  },
})
