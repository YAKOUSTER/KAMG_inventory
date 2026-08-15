<template>
  <v-container class="fill-height" style="max-width: 480px">
    <v-card class="w-100 pa-2" elevation="8">
      <div class="text-center px-6 pt-6">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="login-logo" width="240" height="226" />
        <h1 class="page-title login-title">{{ APP_TITLE }}</h1>
        <p class="text-subtitle-2 text-medium-emphasis mt-2 mb-0">Connexion</p>
      </div>
      <v-card-text class="px-6">
        <v-form @submit.prevent="submit">
          <v-text-field v-model="login" label="Identifiant" autocomplete="username" autofocus />
          <v-text-field
            v-model="password"
            label="Mot de passe"
            :type="show ? 'text' : 'password'"
            autocomplete="current-password"
            :append-inner-icon="show ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="show = !show"
          />
          <v-alert v-if="error" type="error" class="mb-3" density="compact">{{ error }}</v-alert>
          <v-btn type="submit" color="primary" block size="large" :loading="loading">Entrer</v-btn>
        </v-form>
        <p class="text-caption text-medium-emphasis mt-4">
          Comptes de départ : <code>admin</code> / <code>admin</code>,
          <code>gestion</code> / <code>gestion</code>,
          <code>lecteur</code> / <code>lecteur</code>.
          Changez-les ensuite via le menu du compte (Comptes et accès).
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { APP_TITLE, GROUP_NAME, LOGO_SRC } from '@/domain/brand'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const login = ref('')
const password = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(login.value, password.value)
    router.replace(route.query.redirect || '/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-logo {
  width: min(220px, 72%);
  height: auto;
  display: block;
  margin: 0 auto 16px;
}
.login-title {
  font-size: 1.12rem;
  line-height: 1.35;
  text-wrap: balance;
  font-weight: 700;
}
</style>
