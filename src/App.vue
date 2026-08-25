<template>
  <v-app :class="{ 'app-shell--mobile': !mdAndUp && !isStandalonePublic }">
    <template v-if="isStandalonePublic">
      <v-main :class="isLogin ? 'login-bg' : 'member-bg'">
        <router-view />
      </v-main>
    </template>

    <template v-else>
      <v-app-bar color="primary" elevation="0" :height="mdAndUp ? 56 : 48" class="app-bar">
        <router-link to="/" class="brand" :class="{ 'brand--mobile': !mdAndUp }" :title="GROUP_NAME">
          <img :src="LOGO_SRC" :alt="GROUP_NAME" class="brand-logo" />
          <span class="brand-name">{{ APP_TITLE }}</span>
        </router-link>

        <div class="nav-scroll d-none d-md-flex">
          <v-btn
            v-for="link in visibleLinks"
            :key="link.to"
            :to="link.to"
            :exact="link.exact"
            variant="text"
            size="small"
            class="nav-link"
          >
            {{ link.title }}
          </v-btn>
        </div>

        <v-spacer />

        <v-btn
          v-if="auth.can('loans.write')"
          variant="text"
          size="small"
          class="nav-icon-btn d-none d-md-inline-flex"
          to="/panier"
          aria-label="Panier"
        >
          <v-badge :content="String(cart.count || 0)" color="warning" :model-value="cart.count > 0">
            <v-icon size="22">mdi-cart-outline</v-icon>
          </v-badge>
        </v-btn>

        <v-menu location="bottom end" :menu-props="{ contentClass: 'kamg-nav-menu' }">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" size="small" class="nav-account" aria-label="Compte">
              <v-icon :start="mdAndUp" size="22">mdi-account-circle-outline</v-icon>
              <span class="d-none d-md-inline text-none">{{ auth.user?.nom }}</span>
            </v-btn>
          </template>
          <v-list density="compact" min-width="220" class="kamg-sheet-list">
            <v-list-item :title="auth.user?.nom" :subtitle="roleLabel" />
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

      <v-main>
        <v-container class="page-container" fluid>
          <v-alert v-if="inventory.error" type="error" class="mb-4" closable @click:close="inventory.error = ''">
            {{ inventory.error }}
          </v-alert>
          <v-progress-linear
            v-if="inventory.loading && !inventory.loaded"
            color="warning"
            indeterminate
            class="mb-3"
          />
          <router-view />
        </v-container>
      </v-main>

      <BottomTabBar
        v-if="!mdAndUp"
        :items="mobileTabs"
        :active-id="mobileActiveId"
        @select="onMobileTab"
      />

      <v-bottom-sheet v-model="moreOpen" class="kamg-more-sheet">
        <v-list class="kamg-sheet-list pa-2">
          <v-list-item
            v-for="link in plusLinks"
            :key="link.to"
            :to="link.to"
            :title="link.title"
            :prepend-icon="link.icon"
            @click="moreOpen = false"
          />
          <v-list-item
            v-if="auth.can('loans.write')"
            to="/panier"
            title="Panier"
            prepend-icon="mdi-cart-outline"
            @click="moreOpen = false"
          >
            <template v-if="cart.count" #append>
              <v-chip size="x-small" color="warning" variant="flat">{{ cart.count }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item
            v-if="auth.can('users.manage')"
            title="Comptes et accès"
            prepend-icon="mdi-account-key-outline"
            to="/utilisateurs"
            @click="moreOpen = false"
          />
          <v-list-item
            v-if="auth.can('audit.read')"
            title="Journal d’activité"
            prepend-icon="mdi-history"
            to="/journal"
            @click="moreOpen = false"
          />
          <v-list-item
            v-if="auth.can('settings.manage')"
            title="Paramètres"
            prepend-icon="mdi-cog-outline"
            to="/parametres"
            @click="moreOpen = false"
          />
          <v-list-item title="Déconnexion" prepend-icon="mdi-logout" @click="onMoreLogout" />
          <PushNotificationsToggle @click="moreOpen = false" />
        </v-list>
      </v-bottom-sheet>

      <v-snackbar v-model="snackOpen" :color="ui.color" timeout="3200" location="top">
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
import BottomTabBar from '@/components/BottomTabBar.vue'
import { registerPushServiceWorker } from '@/services/pushNotifications'

const route = useRoute()
const router = useRouter()
const display = useDisplay()
const inventory = useInventoryStore()
const cart = useCartStore()
const auth = useAuthStore()
const ui = useUiStore()
const snackOpen = ref(false)
const moreOpen = ref(false)

const mdAndUp = computed(() => display.mdAndUp.value)
const isLogin = computed(() => route.name === 'login')
const isMemberSpace = computed(() => route.meta.publicLayout === 'member')
const isStandalonePublic = computed(() => isLogin.value || isMemberSpace.value)

const links = [
  { to: '/', title: 'Accueil', icon: 'mdi-home-outline', activeIcon: 'mdi-home', permission: 'items.read', exact: true, tab: 'home' },
  { to: '/inventaire', title: 'Inventaire', icon: 'mdi-hanger', permission: 'items.read', tab: 'inventory', match: ['/inventaire', '/pieces'] },
  { to: '/agenda', title: 'Agenda', icon: 'mdi-calendar-month-outline', activeIcon: 'mdi-calendar-month', permission: 'agenda.read', tab: 'agenda', match: ['/agenda'] },
  { to: '/emprunts', title: 'Emprunts', icon: 'mdi-swap-horizontal', permission: 'loans.read', tab: 'loans', match: ['/emprunts'] },
  { to: '/personnes', title: 'Personnes', icon: 'mdi-account-group-outline', permission: 'people.read' },
  { to: '/contenus', title: 'Contenus', icon: 'mdi-book-open-page-variant-outline', permission: 'content.read' },
]

const visibleLinks = computed(() => links.filter((link) => auth.can(link.permission)))
const primaryTabs = computed(() => visibleLinks.value.filter((link) => link.tab))
const plusLinks = computed(() => visibleLinks.value.filter((link) => !link.tab))
const roleLabel = computed(() => ROLES.find((role) => role.id === auth.user?.role)?.label || auth.user?.role)

const mobileTabs = computed(() => [
  ...primaryTabs.value.map((link) => ({
    id: link.tab,
    label: link.title,
    icon: link.icon,
    activeIcon: link.activeIcon || link.icon,
    to: link.to,
  })),
  { id: 'more', label: 'Plus', icon: 'mdi-dots-horizontal', activeIcon: 'mdi-dots-horizontal' },
])

const mobileActiveId = computed(() => {
  const path = route.path
  const match = primaryTabs.value.find((link) => {
    if (link.exact) return path === link.to
    return (link.match || [link.to]).some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  })
  if (match) return match.tab
  return 'more'
})

function onMobileTab(id) {
  if (id === 'more') {
    moreOpen.value = true
    return
  }
  const link = primaryTabs.value.find((entry) => entry.tab === id)
  if (link) router.push(link.to)
}

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
    moreOpen.value = false
  },
)

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}

async function onMoreLogout() {
  moreOpen.value = false
  await logout()
}

onMounted(() => {
  document.title = APP_TITLE
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
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
  text-decoration: none;
  color: inherit;
  margin-right: 0.75rem;
}

.brand-logo {
  height: 36px;
  width: auto;
  flex-shrink: 0;
  object-fit: contain;
  display: block;
}

.brand--mobile .brand-logo {
  height: 28px;
}

.brand-name {
  font-size: 0.98rem;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.brand--mobile .brand-name {
  font-size: 0.88rem;
}

.nav-scroll {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.nav-link {
  flex: 0 0 auto;
  text-transform: none;
  letter-spacing: 0.01em;
  font-size: 0.92rem;
  font-weight: 600;
  min-height: 40px;
  padding-inline: 0.7rem !important;
}

.nav-icon-btn,
.nav-account {
  min-height: 40px;
  min-width: 40px;
}

.app-bar :deep(.v-toolbar__content) {
  padding-inline: clamp(0.4rem, 2vw, 1.25rem);
  gap: 0.15rem;
}
</style>
