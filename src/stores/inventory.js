import { defineStore } from 'pinia'
import { api } from '@/services/api'
import { filterItems } from '@/domain/filters'

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
          api.items(),
          api.people(),
          api.loans(),
          api.stats(),
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
