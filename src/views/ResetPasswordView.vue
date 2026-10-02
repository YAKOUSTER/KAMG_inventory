<template>
  <div class="login-page">
    <div class="login-page__glow login-page__glow--one" aria-hidden="true" />
    <div class="login-page__glow login-page__glow--two" aria-hidden="true" />
    <div class="login-card">
      <header class="login-card__header">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="login-card__logo" />
        <p class="login-card__eyebrow">{{ GROUP_NAME }}</p>
        <h1 class="login-card__title">Nouveau mot de passe</h1>
        <p class="login-card__subtitle">Choisissez un mot de passe d’au moins 8 caractères.</p>
      </header>

      <v-alert v-if="done" type="success" variant="tonal" class="mb-4">
        {{ done }}
        <div class="mt-3">
          <v-btn color="primary" class="text-none" to="/connexion">Se connecter</v-btn>
        </div>
      </v-alert>
      <v-form v-else class="login-card__form" @submit.prevent="submit">
        <v-text-field
          v-model="password"
          label="Nouveau mot de passe"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
          :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          class="login-field"
          @click:append-inner="show = !show"
        />
        <v-text-field
          v-model="confirm"
          label="Confirmer"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
          class="login-field"
        />
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="login-card__alert">
          {{ error }}
        </v-alert>
        <v-btn type="submit" color="primary" block size="large" class="login-card__submit" :loading="loading" :disabled="!token">
          Enregistrer
        </v-btn>
      </v-form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/services/api'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'

const route = useRoute()
const password = ref('')
const confirm = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')
const done = ref('')
const token = ref('')

onMounted(() => {
  token.value = String(route.query.token || '').trim()
  if (!token.value) error.value = 'Lien invalide ou incomplet. Demandez un nouveau lien.'
})

async function submit() {
  if (!token.value) return
  if (password.value !== confirm.value) {
    error.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await api.resetPassword(token.value, password.value)
    done.value = 'Mot de passe enregistré. Vous pouvez vous connecter.'
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: clamp(1.25rem, 4vw, 2.5rem);
}
.login-page__glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(64px);
  opacity: 0.55;
}
.login-page__glow--one {
  width: min(420px, 70vw);
  height: min(420px, 70vw);
  top: -8%;
  right: -6%;
  background: rgba(106, 140, 105, 0.35);
}
.login-page__glow--two {
  width: min(360px, 65vw);
  height: min(360px, 65vw);
  bottom: -10%;
  left: -8%;
  background: rgba(83, 115, 106, 0.28);
}
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: clamp(1.75rem, 4vw, 2.25rem);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 24px 64px rgba(44, 51, 44, 0.12);
  backdrop-filter: blur(14px);
}
.login-card__header { text-align: center; margin-bottom: 1.5rem; }
.login-card__logo {
  max-width: min(160px, 50vw);
  max-height: min(120px, 20vh);
  display: block;
  margin: 0 auto 0.8rem;
}
.login-card__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--kamg-deep);
}
.login-card__title { margin: 0; font-size: 1.45rem; font-weight: 700; }
.login-card__subtitle {
  margin: 0.55rem 0 0;
  font-size: 0.9rem;
  color: rgba(44, 51, 44, 0.62);
  line-height: 1.45;
}
.login-card__form { display: flex; flex-direction: column; gap: 0.35rem; }
.login-field :deep(.v-field) { border-radius: 14px; background: rgba(255, 255, 255, 0.72); }
.login-card__alert, .login-card__submit { margin-top: 0.75rem; }
.login-card__submit { min-height: 48px; font-weight: 700; border-radius: 14px !important; }
</style>
