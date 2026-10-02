import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    snack: '',
    color: 'success',
    to: '',
    action: '',
  }),
  actions: {
    notify(message, { color = 'success', to = '', action = '' } = {}) {
      this.snack = message
      this.color = color
      this.to = to
      this.action = action
    },
    clear() {
      this.snack = ''
      this.to = ''
      this.action = ''
    },
  },
})
