<template>
  <v-list-item
    v-if="visible"
    lines="two"
    :title="subscribed ? 'Notifications activées' : 'Activer les notifications'"
    :subtitle="subtitle"
    :prepend-icon="subscribed ? 'mdi-bell-ring-outline' : 'mdi-bell-outline'"
    @click="toggle"
  />
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { canReceivePushNotifications } from '@/domain/auth'
import { iosNeedsHomeScreen, pushToggleSubtitle, pushUnsupportedMessage } from '@/domain/pushHints'
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  pushSupported,
} from '@/services/pushNotifications'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUiStore()
const loading = ref(false)
const subscribed = ref(false)
const enabled = ref(false)
const supported = ref(false)

const visible = computed(() => canReceivePushNotifications(auth.user))
const iosTab = computed(() =>
  iosNeedsHomeScreen({
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    platform: typeof navigator === 'undefined' ? '' : navigator.platform,
    maxTouchPoints: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
    standalone: typeof window === 'undefined' ? false : Boolean(window.navigator.standalone),
    displayMode:
      typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
        ? 'standalone'
        : 'browser',
  }),
)
const subtitle = computed(() =>
  pushToggleSubtitle({
    supported: supported.value,
    enabled: enabled.value,
    subscribed: subscribed.value,
    iosTab: iosTab.value,
  }),
)

onMounted(refresh)

async function refresh() {
  if (!visible.value || !pushSupported()) {
    supported.value = pushSupported()
    return
  }
  try {
    const status = await getPushStatus()
    supported.value = status.supported
    enabled.value = status.enabled
    subscribed.value = status.subscribed
  } catch {
    supported.value = pushSupported()
  }
}

async function toggle() {
  if (loading.value) return
  if (!supported.value) {
    ui.notify(pushUnsupportedMessage({ iosTab: iosTab.value }), {
      color: 'error',
    })
    return
  }
  if (!enabled.value) {
    ui.notify('Les notifications ne sont pas encore configurées sur le serveur. Rechargez la page dans un instant.', {
      color: 'error',
    })
    return
  }
  loading.value = true
  try {
    const status = subscribed.value ? await disablePushNotifications() : await enablePushNotifications()
    subscribed.value = status.subscribed
    ui.notify(subscribed.value ? 'Notifications activées' : 'Notifications désactivées')
  } catch (error) {
    ui.notify(error.message || 'Impossible de modifier les notifications', { color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>
