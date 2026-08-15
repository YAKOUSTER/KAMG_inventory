<template>
  <v-app>
    <template v-if="isLogin">
      <v-main class="login-bg">
        <router-view />
      </v-main>
    </template>

    <template v-else>
      <v-navigation-drawer v-model="drawer" :permanent="display.mdAndUp">
        <div class="pa-4">
          <div class="text-overline text-medium-emphasis">KAMG</div>
          <div class="text-h6 page-title">Patrimoine textile</div>
        </div>
        <v-list nav>
          <v-list-item
            v-for="link in visibleLinks"
            :key="link.to"
            :to="link.to"
            :prepend-icon="link.icon"
            :title="link.title"
            color="primary"
            rounded="lg"
            @click="onNav"
          />
        </v-list>
        <template #append>
          <div class="pa-4">
            <div class="text-caption text-medium-emphasis">{{ auth.user?.nom }}</div>
            <div class="text-caption">{{ roleLabel }}</div>
            <v-btn class="mt-2" variant="text" size="small" block @click="logout">Déconnexion</v-btn>
          </div>
        </template>
      </v-navigation-drawer>

      <v-app-bar color="primary" elevation="0">
        <v-app-bar-nav-icon v-if="display.smAndDown" @click="drawer = !drawer" />
        <v-toolbar-title class="text-truncate">{{ currentTitle }}</v-toolbar-title>
        <v-spacer />
        <v-btn v-if="auth.can('loans.write')" variant="text" to="/panier">
          <v-badge :content="String(cart.count || 0)" color="warning" :model-value="true">
            <v-icon>mdi-cart-outline</v-icon>
          </v-badge>
          <span class="ml-3 d-none d-sm-inline">Panier</span>
        </v-btn>
      </v-app-bar>

      <v-main :class="{ 'has-bottom-nav': display.smAndDown }">
        <v-container class="py-4 py-md-6" :class="{ 'pb-16': display.smAndDown }" fluid>
          <v-alert v-if="inventory.error" type="error" class="mb-4" closable @click:close="inventory.error = ''">
            {{ inventory.error }}
          </v-alert>
          <router-view />
        </v-container>
      </v-main>

      <v-bottom-navigation
        v-if="display.smAndDown"
        color="primary"
        grow
        class="elevation-8"
      >
        <v-btn v-for="link in mobileLinks" :key="link.to" :to="link.to">
          <v-icon>{{ link.icon }}</v-icon>
          <span>{{ link.short }}</span>
        </v-btn>
      </v-bottom-navigation>
    </template>
  </v-app>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useInventoryStore } from '@/stores/inventory'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/domain/auth'

const drawer = ref(false)
const route = useRoute()
const router = useRouter()
const display = useDisplay()
const inventory = useInventoryStore()
const cart = useCartStore()
const auth = useAuthStore()

const isLogin = computed(() => route.name === 'login')

const links = [
  { to: '/', title: 'Tableau de bord', short: 'Accueil', icon: 'mdi-view-dashboard-outline', permission: 'items.read' },
  { to: '/inventaire', title: 'Inventaire', short: 'Pièces', icon: 'mdi-hanger', permission: 'items.read' },
  { to: '/emprunts', title: 'Emprunts', short: 'Emprunts', icon: 'mdi-handshake-outline', permission: 'loans.read' },
  { to: '/panier', title: 'Panier', short: 'Panier', icon: 'mdi-cart-outline', permission: 'loans.write', mobile: true },
  { to: '/personnes', title: 'Personnes', short: 'Personnes', icon: 'mdi-account-group-outline', permission: 'people.read' },
  { to: '/utilisateurs', title: 'Comptes et accès', short: 'Comptes', icon: 'mdi-account-key-outline', permission: 'users.manage' },
  { to: '/parametres', title: 'Paramètres', short: 'Réglages', icon: 'mdi-cog-outline', permission: 'settings.manage' },
]

const visibleLinks = computed(() => links.filter((link) => !link.mobile && auth.can(link.permission)))
const mobileLinks = computed(() =>
  links.filter((link) => ['/', '/inventaire', '/emprunts', '/panier', '/personnes'].includes(link.to) && auth.can(link.permission)),
)

const titles = {
  dashboard: 'Tableau de bord',
  inventory: 'Inventaire',
  'item-create': 'Nouvelle fiche',
  'item-detail': 'Fiche',
  'item-edit': 'Modifier la fiche',
  loans: 'Emprunts',
  'loan-detail': 'Détail de l’emprunt',
  cart: 'Panier',
  people: 'Personnes',
  'person-create': 'Nouvelle personne',
  'person-detail': 'Fiche personne',
  'person-edit': 'Modifier la personne',
  users: 'Comptes et accès',
  settings: 'Paramètres',
}

const currentTitle = computed(() => titles[route.name] || 'Patrimoine textile')
const roleLabel = computed(() => ROLES.find((role) => role.id === auth.user?.role)?.label || auth.user?.role)

function onNav() {
  if (display.smAndDown.value) drawer.value = false
}

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  drawer.value = display.mdAndUp.value
  if (auth.user) inventory.refresh().catch(() => {})
})
</script>

<style scoped>
.login-bg {
  background: linear-gradient(160deg, #53736a 0%, #6a8c69 55%, #edede5 100%);
}
.has-bottom-nav {
  padding-bottom: 56px;
}
</style>
