import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import './assets/main.css'
import { registerPushServiceWorker } from '@/services/pushNotifications'

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  registerPushServiceWorker().catch(() => {})
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
app.mount('#app')
