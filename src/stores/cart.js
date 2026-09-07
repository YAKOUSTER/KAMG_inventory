import { defineStore } from 'pinia'

const STORAGE_KEY = 'patrimoine-textile-panier'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: load(),
  }),
  getters: {
    count: (state) => state.items.length,
    isInCart: (state) => (id) => state.items.some((item) => item.id === id),
  },
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
    },
    add(item) {
      if (this.isInCart(item.id)) return
      this.items.push({
        id: item.id,
        code: item.code,
        nom: item.nom,
        type: item.type,
        tailleLettre: item.tailleLettre,
        comment: '',
      })
      this.persist()
    },
    remove(id) {
      this.items = this.items.filter((item) => item.id !== id)
      this.persist()
    },
    setComment(id, comment) {
      const item = this.items.find((i) => i.id === id)
      if (item) item.comment = comment
      this.persist()
    },
    clear() {
      this.items = []
      this.persist()
    },
  },
})
