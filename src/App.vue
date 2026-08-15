<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :permanent="$vuetify.display.mdAndUp" color="white">
      <div class="pa-4">
        <div class="text-overline text-medium-emphasis">KAMG</div>
        <div class="text-h6 page-title">Patrimoine textile</div>
      </div>
      <v-list nav>
        <v-list-item
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :prepend-icon="link.icon"
          :title="link.title"
          color="primary"
          rounded="lg"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar color="primary" elevation="0">
      <v-app-bar-nav-icon v-if="$vuetify.display.smAndDown" @click="drawer = !drawer" />
      <v-toolbar-title>{{ currentTitle }}</v-toolbar-title>
      <v-spacer />
      <v-btn variant="text" to="/panier">
        <v-badge :content="cart.count || '0'" color="warning" :model-value="true">
          <v-icon>mdi-cart-outline</v-icon>
        </v-badge>
        <span class="ml-3 d-none d-sm-inline">Panier</span>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container class="py-6" fluid>
        <v-alert v-if="inventory.error" type="error" class="mb-4" closable @click:close="inventory.error = ''">
          {{ inventory.error }}
        </v-alert>
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useCartStore } from '@/stores/cart'

const drawer = ref(true)
const route = useRoute()
const inventory = useInventoryStore()
const cart = useCartStore()

const links = [
  { to: '/', title: 'Tableau de bord', icon: 'mdi-view-dashboard-outline' },
  { to: '/inventaire', title: 'Inventaire', icon: 'mdi-hanger' },
  { to: '/emprunts', title: 'Emprunts', icon: 'mdi-handshake-outline' },
  { to: '/personnes', title: 'Personnes', icon: 'mdi-account-group-outline' },
  { to: '/parametres', title: 'Paramètres', icon: 'mdi-cog-outline' },
]

const titles = {
  dashboard: 'Tableau de bord',
  inventory: 'Inventaire',
  'item-create': 'Nouvelle fiche',
  'item-detail': 'Fiche',
  'item-edit': 'Modifier la fiche',
  loans: 'Emprunts',
  cart: 'Panier',
  people: 'Personnes',
  settings: 'Paramètres',
}

const currentTitle = computed(() => titles[route.name] || 'Patrimoine textile')

onMounted(() => {
  inventory.refresh().catch(() => {})
})
</script>
