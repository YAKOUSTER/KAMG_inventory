<template>
  <v-app>
    <template v-if="isLogin">
      <v-main class="login-bg">
        <router-view />
      </v-main>
    </template>

    <template v-else>
      <v-app-bar color="primary" elevation="0" height="72" class="app-bar">
        <router-link to="/" class="brand mr-4" :title="GROUP_NAME">
          <img :src="LOGO_SRC" :alt="GROUP_NAME" class="brand-logo" />
          <span class="brand-name">{{ APP_TITLE }}</span>
        </router-link>

        <div class="nav-scroll">
          <v-btn
            v-for="link in visibleLinks"
            :key="link.to"
            :to="link.to"
            :exact="link.exact"
            variant="text"
            size="default"
            class="nav-link"
          >
            <span class="d-none d-md-inline">{{ link.title }}</span>
            <span class="d-md-none">{{ link.short }}</span>
          </v-btn>
        </div>

        <v-btn v-if="auth.can('loans.write')" variant="text" size="default" class="nav-icon-btn" to="/panier" aria-label="Panier">
          <v-badge :content="String(cart.count || 0)" color="warning" :model-value="cart.count > 0">
            <v-icon size="24">mdi-cart-outline</v-icon>
          </v-badge>
        </v-btn>

        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" size="default" class="nav-account ml-1" aria-label="Compte">
              <v-icon start size="24" class="d-none d-sm-inline">mdi-account-circle-outline</v-icon>
              <span class="d-none d-sm-inline text-none">{{ auth.user?.nom }}</span>
              <v-icon size="24" class="d-sm-none">mdi-account-circle-outline</v-icon>
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
            <v-list-item
              v-if="auth.can('audit.read')"
              title="Journal d’activité"
              prepend-icon="mdi-history"
              to="/journal"
            />
            <v-list-item
              v-if="auth.can('settings.manage')"
              title="Paramètres"
              prepend-icon="mdi-cog-outline"
              to="/parametres"
            />
            <v-list-item title="Déconnexion" prepend-icon="mdi-logout" @click="logout" />
          </v-list>
        </v-menu>
      </v-app-bar>

      <v-progress-linear
        v-if="inventory.loading && !inventory.loaded"
        color="warning"
        indeterminate
        absolute
      />

      <v-main>
        <v-container class="page-container" fluid>
          <v-alert v-if="inventory.error" type="error" class="mb-4" closable @click:close="inventory.error = ''">
            {{ inventory.error }}
          </v-alert>
          <router-view />
        </v-container>
      </v-main>

      <v-snackbar v-model="snackOpen" :color="ui.color" timeout="3200" location="bottom">
        {{ ui.snack }}
        <template #actions>
          <v-btn v-if="ui.to" variant="text" :to="ui.to">{{ ui.action || 'Ouvrir' }}</v-btn>
          <v-btn variant="text" @click="snackOpen = false">Fermer</v-btn>
        </template>
      </v-snackbar>
    </template>
  </v-app>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { ROLES } from '@/domain/auth'
import { APP_TITLE, GROUP_NAME, LOGO_SRC } from '@/domain/brand'

const route = useRoute()
const router = useRouter()
const inventory = useInventoryStore()
const cart = useCartStore()
const auth = useAuthStore()
const ui = useUiStore()
const snackOpen = ref(false)

const isLogin = computed(() => route.name === 'login')

const links = [
  { to: '/', title: 'Accueil', short: 'Accueil', permission: 'items.read', exact: true },
  { to: '/inventaire', title: 'Inventaire', short: 'Pièces', permission: 'items.read' },
  { to: '/emprunts', title: 'Emprunts', short: 'Emprunts', permission: 'loans.read' },
  { to: '/personnes', title: 'Personnes', short: 'Personnes', permission: 'people.read' },
]

const visibleLinks = computed(() => links.filter((link) => auth.can(link.permission)))
const roleLabel = computed(() => ROLES.find((role) => role.id === auth.user?.role)?.label || auth.user?.role)

watch(
  () => ui.snack,
  (value) => {
    snackOpen.value = Boolean(value)
  },
)

watch(snackOpen, (open) => {
  if (!open) ui.clear()
})

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
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 0 1 auto;
  text-decoration: none;
  color: inherit;
}
.brand-logo {
  height: 56px;
  width: auto;
  flex-shrink: 0;
  object-fit: contain;
  display: block;
}
.brand-name {
  font-size: 1.12rem;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.01em;
}
.nav-scroll {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  gap: 0.35rem;
  padding-inline: 0.25rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nav-scroll::-webkit-scrollbar {
  display: none;
}
.nav-link {
  flex: 0 0 auto;
  text-transform: none;
  letter-spacing: 0.01em;
  font-size: 1rem;
  font-weight: 600;
  min-height: 44px;
  padding-inline: 0.85rem !important;
}
.nav-icon-btn,
.nav-account {
  min-height: 44px;
  min-width: 44px;
}
.app-bar :deep(.v-toolbar__content) {
  padding-inline: clamp(0.75rem, 2vw, 1.5rem);
  gap: 0.35rem;
}
</style>
