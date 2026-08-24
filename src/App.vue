<template>
  <v-app>
    <template v-if="isStandalonePublic">
      <v-main :class="isLogin ? 'login-bg' : 'member-bg'">
        <router-view />
      </v-main>
    </template>

    <template v-else>
      <v-app-bar color="primary" elevation="0" height="72" class="app-bar">
        <v-app-bar-nav-icon
          class="d-md-none nav-menu-btn"
          aria-label="Ouvrir le menu"
          @click="drawerOpen = true"
        />

        <router-link to="/" class="brand" :class="{ 'brand--mobile': !mdAndUp }" :title="GROUP_NAME">
          <img :src="LOGO_SRC" :alt="GROUP_NAME" class="brand-logo" />
          <span class="brand-name d-none d-sm-inline">{{ APP_TITLE }}</span>
        </router-link>

        <v-spacer class="d-md-none" />

        <div class="nav-scroll d-none d-md-flex">
          <v-btn
            v-for="link in visibleLinks"
            :key="link.to"
            :to="link.to"
            :exact="link.exact"
            variant="text"
            size="default"
            class="nav-link"
          >
            {{ link.title }}
          </v-btn>
        </div>

        <v-spacer class="d-none d-md-flex" />

        <v-btn
          v-if="auth.can('loans.write')"
          variant="text"
          size="default"
          class="nav-icon-btn"
          to="/panier"
          aria-label="Panier"
        >
          <v-badge :content="String(cart.count || 0)" color="warning" :model-value="cart.count > 0">
            <v-icon size="24">mdi-cart-outline</v-icon>
          </v-badge>
        </v-btn>

        <v-menu location="bottom end" :menu-props="{ contentClass: 'kamg-nav-menu' }">
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
            <PushNotificationsToggle />
          </v-list>
        </v-menu>
      </v-app-bar>

      <v-navigation-drawer
        v-model="drawerOpen"
        temporary
        location="start"
        color="surface"
        class="mobile-drawer kamg-nav-drawer d-md-none"
        width="280"
        scrim="rgba(44, 51, 44, 0.38)"
      >
        <div class="mobile-drawer__header">
          <img :src="LOGO_SRC" :alt="GROUP_NAME" class="mobile-drawer__logo" />
          <div class="mobile-drawer__title">{{ APP_TITLE }}</div>
          <div class="text-caption text-medium-emphasis">{{ auth.user?.nom }}</div>
        </div>

        <v-list nav density="comfortable" class="mobile-drawer__nav">
          <v-list-item
            v-for="link in visibleLinks"
            :key="link.to"
            :to="link.to"
            :exact="link.exact"
            :title="link.title"
            :prepend-icon="link.icon"
            rounded="lg"
            @click="drawerOpen = false"
          />
          <v-list-item
            v-if="auth.can('loans.write')"
            to="/panier"
            title="Panier"
            prepend-icon="mdi-cart-outline"
            rounded="lg"
            @click="drawerOpen = false"
          >
            <template v-if="cart.count" #append>
              <v-chip size="x-small" color="warning" variant="flat">{{ cart.count }}</v-chip>
            </template>
          </v-list-item>
        </v-list>

        <template #append>
          <v-list density="compact" class="mobile-drawer__footer">
            <v-list-item
              v-if="auth.can('users.manage')"
              title="Comptes et accès"
              prepend-icon="mdi-account-key-outline"
              to="/utilisateurs"
              @click="drawerOpen = false"
            />
            <v-list-item
              v-if="auth.can('audit.read')"
              title="Journal d’activité"
              prepend-icon="mdi-history"
              to="/journal"
              @click="drawerOpen = false"
            />
            <v-list-item
              v-if="auth.can('settings.manage')"
              title="Paramètres"
              prepend-icon="mdi-cog-outline"
              to="/parametres"
              @click="drawerOpen = false"
            />
            <v-list-item title="Déconnexion" prepend-icon="mdi-logout" @click="onDrawerLogout" />
            <PushNotificationsToggle @click="drawerOpen = false" />
          </v-list>
        </template>
      </v-navigation-drawer>

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
import { useDisplay } from 'vuetify'
import { useInventoryStore } from '@/stores/inventory'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { ROLES, canReceivePushNotifications } from '@/domain/auth'
import { APP_TITLE, GROUP_NAME, LOGO_SRC } from '@/domain/brand'
import PushNotificationsToggle from '@/components/PushNotificationsToggle.vue'
import { registerPushServiceWorker } from '@/services/pushNotifications'

const route = useRoute()
const router = useRouter()
const display = useDisplay()
const inventory = useInventoryStore()
const cart = useCartStore()
const auth = useAuthStore()
const ui = useUiStore()
const snackOpen = ref(false)
const drawerOpen = ref(false)

const mdAndUp = computed(() => display.mdAndUp.value)
const isLogin = computed(() => route.name === 'login')
const isMemberSpace = computed(() => route.meta.publicLayout === 'member')
const isStandalonePublic = computed(() => isLogin.value || isMemberSpace.value)

const links = [
  { to: '/', title: 'Accueil', icon: 'mdi-home-outline', permission: 'items.read', exact: true },
  { to: '/inventaire', title: 'Inventaire', icon: 'mdi-hanger', permission: 'items.read' },
  { to: '/emprunts', title: 'Emprunts', icon: 'mdi-swap-horizontal', permission: 'loans.read' },
  { to: '/personnes', title: 'Personnes', icon: 'mdi-account-group-outline', permission: 'people.read' },
  { to: '/agenda', title: 'Agenda', icon: 'mdi-calendar-month-outline', permission: 'agenda.read' },
  { to: '/contenus', title: 'Contenus', icon: 'mdi-book-open-page-variant-outline', permission: 'content.read' },
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

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)

watch(mdAndUp, (wide) => {
  if (wide) drawerOpen.value = false
})

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}

async function onDrawerLogout() {
  drawerOpen.value = false
  await logout()
}

onMounted(() => {
  if (auth.user) inventory.refresh().catch(() => {})
  if (canReceivePushNotifications(auth.user)) {
    registerPushServiceWorker().catch(() => {})
  }
})

watch(
  () => auth.user,
  (user) => {
    if (canReceivePushNotifications(user)) {
      registerPushServiceWorker().catch(() => {})
    }
  },
)
</script>

<style scoped>
.login-bg {
  background:
    radial-gradient(circle at 12% 18%, rgba(106, 140, 105, 0.22), transparent 42%),
    radial-gradient(circle at 88% 82%, rgba(83, 115, 106, 0.18), transparent 40%),
    linear-gradient(155deg, #eef2ee 0%, #f8faf8 38%, #e8ece8 100%);
}

.member-bg {
  background:
    radial-gradient(circle at 10% 12%, rgba(106, 140, 105, 0.16), transparent 40%),
    radial-gradient(circle at 90% 88%, rgba(83, 115, 106, 0.12), transparent 38%),
    linear-gradient(160deg, #f3f6f3 0%, #fafcfa 45%, #eef2ee 100%);
  min-height: 100vh;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 0 1 auto;
  text-decoration: none;
  color: inherit;
  margin-right: 1rem;
}
.brand--mobile {
  margin-right: 0;
}
.brand-logo {
  height: 56px;
  width: auto;
  flex-shrink: 0;
  object-fit: contain;
  display: block;
  background: transparent;
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
  gap: 0.35rem;
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
.nav-account,
.nav-menu-btn {
  min-height: 44px;
  min-width: 44px;
}
.app-bar :deep(.v-toolbar__content) {
  padding-inline: clamp(0.5rem, 2vw, 1.5rem);
  gap: 0.25rem;
}
.mobile-drawer__header {
  padding: 1.25rem 1.25rem 0.75rem;
  border-bottom: 1px solid rgba(83, 115, 106, 0.12);
}
.mobile-drawer__logo {
  height: 72px;
  width: auto;
  display: block;
  margin-bottom: 0.75rem;
}
.mobile-drawer__title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
}
.mobile-drawer__nav {
  padding-top: 0.5rem;
}
.mobile-drawer__footer {
  border-top: 1px solid rgba(83, 115, 106, 0.12);
  padding-bottom: 0.5rem;
}
</style>
