<template>
  <v-app>
    <template v-if="isLogin">
      <v-main class="login-bg">
        <router-view />
      </v-main>
    </template>

    <template v-else>
      <v-app-bar color="primary" elevation="0" density="comfortable">
        <v-toolbar-title class="text-truncate mr-2 brand">Patrimoine textile</v-toolbar-title>

        <div class="nav-scroll">
          <v-btn
            v-for="link in visibleLinks"
            :key="link.to"
            :to="link.to"
            variant="text"
            size="small"
            class="nav-link"
          >
            <span class="d-none d-md-inline">{{ link.title }}</span>
            <span class="d-md-none">{{ link.short }}</span>
          </v-btn>
        </div>

        <v-btn v-if="auth.can('loans.write')" variant="text" to="/panier" aria-label="Panier">
          <v-badge :content="String(cart.count || 0)" color="warning" :model-value="true">
            <v-icon>mdi-cart-outline</v-icon>
          </v-badge>
        </v-btn>

        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" class="ml-1" aria-label="Compte">
              <v-icon start class="d-none d-sm-inline">mdi-account-circle-outline</v-icon>
              <span class="d-none d-sm-inline text-none">{{ auth.user?.nom }}</span>
              <v-icon class="d-sm-none">mdi-account-circle-outline</v-icon>
            </v-btn>
          </template>
          <v-list density="compact" min-width="220">
            <v-list-item :title="auth.user?.nom" :subtitle="roleLabel" />
            <v-divider />
            <v-list-item
              v-if="auth.can('users.manage')"
              title="Comptes et accès"
              prepend-icon="mdi-account-key-outline"
              to="/utilisateurs"
            />
            <v-list-item title="Déconnexion" prepend-icon="mdi-logout" @click="logout" />
          </v-list>
        </v-menu>
      </v-app-bar>

      <v-main>
        <v-container class="py-4 py-md-6" fluid>
          <v-alert v-if="inventory.error" type="error" class="mb-4" closable @click:close="inventory.error = ''">
            {{ inventory.error }}
          </v-alert>
          <router-view />
        </v-container>
      </v-main>
    </template>
  </v-app>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/domain/auth'

const route = useRoute()
const router = useRouter()
const inventory = useInventoryStore()
const cart = useCartStore()
const auth = useAuthStore()

const isLogin = computed(() => route.name === 'login')

const links = [
  { to: '/', title: 'Tableau de bord', short: 'Accueil', permission: 'items.read' },
  { to: '/inventaire', title: 'Inventaire', short: 'Pièces', permission: 'items.read' },
  { to: '/emprunts', title: 'Emprunts', short: 'Emprunts', permission: 'loans.read' },
  { to: '/personnes', title: 'Personnes', short: 'Personnes', permission: 'people.read' },
  { to: '/parametres', title: 'Paramètres', short: 'Réglages', permission: 'settings.manage' },
]

const visibleLinks = computed(() => links.filter((link) => auth.can(link.permission)))
const roleLabel = computed(() => ROLES.find((role) => role.id === auth.user?.role)?.label || auth.user?.role)

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  if (auth.user) inventory.refresh().catch(() => {})
})
</script>

<style scoped>
.login-bg {
  background: linear-gradient(160deg, #53736a 0%, #6a8c69 55%, #edede5 100%);
}
.brand {
  flex: 0 0 auto;
  max-width: 42vw;
}
.nav-scroll {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  gap: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nav-scroll::-webkit-scrollbar {
  display: none;
}
.nav-link {
  flex: 0 0 auto;
  text-transform: none;
  letter-spacing: 0;
}
</style>
