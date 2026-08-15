import { defineStore } from 'pinia'
import { api, getToken, setToken, setUnauthorizedHandler } from '@/services/api'
import { can as canUser } from '@/domain/auth'
import { useInventoryStore } from '@/stores/inventory'

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
        useInventoryStore().reset()
      })
    },
    applySession(payload) {
      this.user = payload?.user || null
      this.ready = true
      if (payload) useInventoryStore().hydrate(payload)
    },
    async hydrate() {
      this.bindUnauthorized()
      if (this.ready) return this.user
      if (!getToken()) {
        this.user = null
        this.ready = true
        return null
      }
      try {
        this.applySession(await api.bootstrap())
      } catch {
        this.user = null
        setToken('')
        useInventoryStore().reset()
        this.ready = true
      }
      return this.user
    },
    async login(login, password) {
      const result = await api.login(login, password)
      setToken(result.token)
      this.applySession(result)
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
      useInventoryStore().reset()
    },
  },
})
