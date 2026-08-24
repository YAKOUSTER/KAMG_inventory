<template>
  <v-list-item
    v-if="visible"
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
const subtitle = computed(() => {
  if (!supported.value) return 'Non supporté sur ce navigateur'
  if (!enabled.value) return 'Serveur non configuré (VAPID)'
  return subscribed.value ? 'Emprunts, retours et sorties' : 'Réservé aux gestionnaires'
})

onMounted(refresh)

async function refresh() {
  if (!visible.value || !pushSupported()) return
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
  if (loading.value || !supported.value || !enabled.value) return
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
