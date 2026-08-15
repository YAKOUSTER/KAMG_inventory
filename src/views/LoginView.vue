<template>
  <v-container class="fill-height" style="max-width: 440px">
    <div class="w-100 text-center">
      <img :src="LOGO_SRC" :alt="GROUP_NAME" class="login-logo" />
      <h1 class="page-title login-title">{{ APP_TITLE }}</h1>
      <p class="text-body-2 text-medium-emphasis mb-8">{{ GROUP_NAME }}</p>
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
    </div>
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
  width: min(240px, 72vw);
  height: auto;
  display: block;
  margin: 0 auto 1.25rem;
}
.login-title {
  font-size: 1.6rem;
  line-height: 1.2;
}
</style>
