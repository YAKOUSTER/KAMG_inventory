import { defineStore } from 'pinia'
import { api } from '@/services/api'
import { countByCategory, filterItems } from '@/domain/filters'
import { normalizeReferentiels } from '@/domain/referentiels'
import { countLowStock } from '@/domain/stock'

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
    referentiels: null,
    loading: false,
    loaded: false,
    error: '',
  }),
  getters: {
    itemById: (state) => (id) => state.items.find((item) => item.id === id),
    personById: (state) => (id) => state.people.find((person) => person.id === id),
    loanById: (state) => (id) => state.loans.find((loan) => loan.id === id),
    filtered: (state) => (filters) => filterItems(state.items, filters),
    resolvedReferentiels: (state) => normalizeReferentiels(state.referentiels || {}),
  },
  actions: {
    hydrate(payload) {
      if (!payload) return
      this.items = payload.items || []
      this.people = payload.people || []
      this.loans = payload.loans || []
      this.stats = payload.stats || null
      this.referentiels = payload.referentiels || null
      this.loaded = true
      this.error = ''
    },
    reset() {
      this.items = []
      this.people = []
      this.loans = []
      this.stats = null
      this.referentiels = null
      this.loaded = false
      this.error = ''
    },
    recomputeStats() {
      this.stats = {
        totalItems: this.items.length,
        byCategory: countByCategory(this.items),
        available: this.items.filter((item) => item.disponibilite === 'Disponible').length,
        borrowed: this.items.filter((item) => item.disponibilite === 'Emprunté').length,
        lowStock: countLowStock(this.items),
        people: this.people.length,
        activeLoans: this.loans.filter((loan) => loan.statut !== 'retourne').length,
      }
    },
    upsertItem(item) {
      if (!item?.id) return
      const index = this.items.findIndex((current) => current.id === item.id)
      if (index === -1) this.items.unshift(item)
      else this.items.splice(index, 1, { ...this.items[index], ...item })
      this.recomputeStats()
    },
    removeItem(id) {
      this.items = this.items.filter((item) => item.id !== id)
      this.recomputeStats()
    },
    upsertPerson(person) {
      if (!person?.id) return
      const index = this.people.findIndex((current) => current.id === person.id)
      if (index === -1) this.people.unshift(person)
      else this.people.splice(index, 1, { ...this.people[index], ...person })
      this.recomputeStats()
    },
    removePerson(id) {
      this.people = this.people.filter((person) => person.id !== id)
      this.recomputeStats()
    },
    patchLoan(loan) {
      if (!loan?.id) return
      const index = this.loans.findIndex((current) => current.id === loan.id)
      if (index === -1) this.loans.unshift(loan)
      else this.loans.splice(index, 1, loan)
      for (const line of loan.items || []) {
        const item = this.items.find((current) => current.id === line.itemId)
        if (!item) continue
        item.disponibilite = line.returnedAt ? 'Disponible' : 'Emprunté'
      }
      this.recomputeStats()
    },
    setReferentiels(referentiels) {
      this.referentiels = referentiels
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
