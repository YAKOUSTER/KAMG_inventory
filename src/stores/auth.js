import { defineStore } from 'pinia'
import { api, setToken, setUnauthorizedHandler } from '@/services/api'
import { can as canUser } from '@/domain/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    ready: false,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.user),
    can: (state) => (permission) => canUser(state.user, permission),
  },
  actions: {
    bindUnauthorized() {
      setUnauthorizedHandler(() => {
        this.user = null
        setToken('')
      })
    },
    async hydrate() {
      this.bindUnauthorized()
      if (this.ready) return this.user
      try {
        this.user = await api.me()
      } catch {
        this.user = null
        setToken('')
      } finally {
        this.ready = true
      }
      return this.user
    },
    async login(login, password) {
      const result = await api.login(login, password)
      setToken(result.token)
      this.user = result.user
      this.ready = true
      return this.user
    },
    async logout() {
      try {
        await api.logout()
      } catch {
        /* ignore */
      }
      setToken('')
      this.user = null
    },
  },
})
