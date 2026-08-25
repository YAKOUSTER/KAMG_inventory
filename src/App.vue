<template>
  <v-app :class="{ 'app-shell--mobile': !mdAndUp && !isStandalonePublic }">
    <template v-if="isStandalonePublic">
      <v-main :class="isLogin ? 'login-bg' : 'member-bg'">
        <router-view />
      </v-main>
    </template>

    <template v-else>
      <v-app-bar
        v-if="mdAndUp"
        color="surface"
        elevation="0"
        height="64"
        :extended="showAreaToolbar"
        :extension-height="showAreaToolbar ? 44 : 0"
        class="app-bar app-bar--light"
      >
        <router-link to="/" class="brand" :class="{ 'brand--mobile': !mdAndUp }" :title="GROUP_NAME">
          <img :src="LOGO_SRC" :alt="GROUP_NAME" class="brand-logo" />
          <span class="brand-name">{{ APP_TITLE }}</span>
        </router-link>

        <div class="nav-scroll d-none d-md-flex">
          <v-btn
            v-for="area in areas"
            :key="area.id"
            :to="area.home"
            variant="text"
            size="small"
            class="nav-link"
            active-class=""
            exact-active-class=""
            :class="{ 'nav-link--active': currentArea?.id === area.id }"
          >
            <v-badge
              :content="pendingMembersBadge"
              color="warning"
              :model-value="area.id === 'membres' && Boolean(pendingMembersBadge)"
            >
              {{ area.title }}
            </v-badge>
          </v-btn>
        </div>

        <v-spacer />

        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="text-none nav-member-btn"
          to="/espace-membre"
        >
          <v-icon :start="mdAndUp" size="20">mdi-account-heart-outline</v-icon>
          <span class="d-none d-md-inline">Espace membres</span>
        </v-btn>

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

        <v-menu location="bottom end" content-class="kamg-nav-menu">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" size="small" class="nav-account" aria-label="Compte">
              <v-icon :start="mdAndUp" size="22">mdi-account-circle-outline</v-icon>
              <span class="d-none d-md-inline text-none">{{ auth.user?.nom }}</span>
            </v-btn>
          </template>
          <v-list density="compact" min-width="220" class="kamg-sheet-list bg-surface">
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

        <template v-if="showAreaToolbar" #extension>
          <div class="area-toolbar">
            <span class="area-toolbar__label">{{ currentArea.fullTitle || currentArea.title }}</span>
            <v-btn
              v-for="link in areaToolbarLinks"
              :key="link.to"
              :to="link.to"
              :exact="link.exact"
              variant="text"
              size="small"
              class="area-toolbar__link text-none"
            >
              {{ link.title }}
            </v-btn>
          </div>
        </template>
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
        <v-sheet class="kamg-sheet-panel">
          <v-list class="kamg-sheet-list pa-2 bg-surface">
          <v-list-item
            title="Espace membres"
            prepend-icon="mdi-account-heart-outline"
            to="/espace-membre"
            @click="moreOpen = false"
          />
          <template v-for="area in areas" :key="area.id">
            <v-list-subheader>{{ area.title }}</v-list-subheader>
            <v-list-item
              v-for="link in area.links"
              :key="link.to"
              :to="link.to"
              :title="link.title"
              :prepend-icon="link.icon"
              @click="moreOpen = false"
            >
              <template v-if="link.to === '/panier' && cart.count" #append>
                <v-chip size="x-small" color="warning" variant="flat">{{ cart.count }}</v-chip>
              </template>
            </v-list-item>
          </template>
          <v-list-subheader>Compte</v-list-subheader>
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
        </v-sheet>
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
import { gestionAreaForPath, toolbarLinksForArea, visibleGestionAreas } from '@/domain/gestionNav'
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
const isLogin = computed(() =>
  ['login', 'signup', 'forgot-password', 'reset-password'].includes(route.name),
)
const isMemberSpace = computed(() => route.meta.publicLayout === 'member')
const isStandalonePublic = computed(() => isLogin.value || isMemberSpace.value)

const areas = computed(() => visibleGestionAreas(auth.user))
const currentArea = computed(() => gestionAreaForPath(route.path, auth.user))
const areaToolbarLinks = computed(() => toolbarLinksForArea(currentArea.value))
const showAreaToolbar = computed(
  () => mdAndUp.value && areaToolbarLinks.value.length > 1,
)
const pendingMembersBadge = computed(() =>
  inventory.stats?.pendingMembers ? String(inventory.stats.pendingMembers) : '',
)
const roleLabel = computed(() => ROLES.find((role) => role.id === auth.user?.role)?.label || auth.user?.role)

const mobileTabs = computed(() => [
  ...areas.value.map((area) => ({
    id: area.id,
    label: area.short,
    icon: area.icon,
    activeIcon: area.activeIcon || area.icon,
    to: area.home,
    badge: area.id === 'membres' ? pendingMembersBadge.value : '',
  })),
  { id: 'more', label: 'Plus', icon: 'mdi-dots-horizontal', activeIcon: 'mdi-dots-horizontal' },
])

const mobileActiveId = computed(() =>
  moreOpen.value ? 'more' : currentArea.value?.id || 'more',
)

function onMobileTab(id) {
  if (id === 'more') {
    moreOpen.value = true
    return
  }
  const area = areas.value.find((entry) => entry.id === id)
  if (area) router.push(area.home)
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
    radial-gradient(circle at 12% 18%, rgba(83, 115, 106, 0.12), transparent 42%),
    radial-gradient(circle at 88% 82%, rgba(138, 163, 181, 0.12), transparent 40%),
    var(--kamg-mist);
}

.member-bg {
  background: var(--kamg-mist);
  min-height: 100vh;
}

.app-bar--light {
  border-bottom: 1px solid var(--kamg-border);
}

.app-bar--light :deep(.v-toolbar__content),
.app-bar--light :deep(.v-toolbar__extension) {
  color: var(--kamg-ink);
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
  font-size: 1rem;
  font-weight: 800;
  white-space: nowrap;
  letter-spacing: -0.03em;
  color: var(--kamg-ink);
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
  letter-spacing: 0;
  font-size: 0.92rem;
  font-weight: 600;
  min-height: 36px;
  padding-inline: 0.85rem !important;
  color: var(--kamg-muted) !important;
  border-radius: 999px !important;
}

.nav-link--active {
  color: var(--kamg-deep) !important;
  font-weight: 700;
  background: rgba(83, 115, 106, 0.12);
}

.nav-member-btn {
  min-height: 36px;
  font-weight: 700;
  box-shadow: none !important;
}

.area-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  min-height: 44px;
  padding-inline: clamp(0.4rem, 2vw, 1.25rem);
  background: transparent;
  border-top: 1px solid var(--kamg-border);
}

.area-toolbar__label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--kamg-muted);
  margin-right: 0.55rem;
  white-space: nowrap;
}

.area-toolbar__link {
  font-size: 0.86rem;
  font-weight: 600;
  min-height: 32px;
  color: var(--kamg-muted) !important;
  border-radius: 999px !important;
}

.area-toolbar__link.v-btn--active {
  color: var(--kamg-deep) !important;
  background: rgba(83, 115, 106, 0.12);
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

.app-bar :deep(.v-toolbar__extension) {
  padding: 0;
}
</style>
