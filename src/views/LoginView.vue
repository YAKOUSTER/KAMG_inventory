<template>
  <v-container class="fill-height" style="max-width: 420px">
    <v-card class="w-100 pa-2" elevation="8">
      <v-card-title class="text-h5 page-title pt-6 px-6">Patrimoine textile</v-card-title>
      <v-card-subtitle class="px-6">Connexion</v-card-subtitle>
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
