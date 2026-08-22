<template>
  <div class="login-page">
    <div class="login-page__glow login-page__glow--one" aria-hidden="true" />
    <div class="login-page__glow login-page__glow--two" aria-hidden="true" />

    <div class="login-card">
      <header class="login-card__header">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="login-card__logo" />
        <p class="login-card__eyebrow">{{ GROUP_NAME }}</p>
        <h1 class="login-card__title">{{ APP_TITLE }}</h1>
        <p class="login-card__subtitle">Connectez-vous pour accéder à l’inventaire</p>
      </header>

      <v-form class="login-card__form" @submit.prevent="submit">
        <v-text-field
          v-model="login"
          label="Identifiant"
          prepend-inner-icon="mdi-account-outline"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          autocomplete="username"
          autofocus
          class="login-field"
        />
        <v-text-field
          v-model="password"
          label="Mot de passe"
          prepend-inner-icon="mdi-lock-outline"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          :type="show ? 'text' : 'password'"
          autocomplete="current-password"
          :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          class="login-field"
          @click:append-inner="show = !show"
        />

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="login-card__alert">
          {{ error }}
        </v-alert>

        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          class="login-card__submit"
          :loading="loading"
        >
          Entrer
        </v-btn>
      </v-form>

      <div class="login-card__member">
        <span class="login-card__member-label">Membres du cercle</span>
        <v-btn variant="tonal" block class="text-none mt-2" to="/espace-membre">
          Consulter l’agenda, les infos et les emprunts
        </v-btn>
      </div>
    </div>
  </div>
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
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: clamp(1.25rem, 4vw, 2.5rem);
  overflow: hidden;
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
  box-shadow:
    0 24px 64px rgba(44, 51, 44, 0.12),
    0 2px 8px rgba(44, 51, 44, 0.06);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.login-card__header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.login-card__logo {
  width: auto;
  height: auto;
  max-width: min(200px, 62vw);
  max-height: min(160px, 28vh);
  display: block;
  margin: 0 auto 1rem;
  object-fit: contain;
}

.login-card__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--kamg-deep);
}

.login-card__title {
  margin: 0;
  font-size: clamp(1.45rem, 4vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  color: #2c332c;
}

.login-card__subtitle {
  margin: 0.65rem 0 0;
  font-size: 0.92rem;
  color: rgba(44, 51, 44, 0.62);
  line-height: 1.45;
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.login-field :deep(.v-field) {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
}

.login-card__alert {
  margin-top: 0.5rem;
}

.login-card__submit {
  margin-top: 0.85rem;
  min-height: 48px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 14px !important;
}

.login-card__member {
  margin-top: 1.25rem;
  padding-top: 1.1rem;
  border-top: 1px solid rgba(83, 115, 106, 0.14);
}

.login-card__member-label {
  display: block;
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.62);
}

@media (max-width: 480px) {
  .login-card {
    padding: 1.35rem 1.15rem 1.5rem;
    border-radius: 20px;
  }

  .login-card__header {
    margin-bottom: 1.35rem;
  }
}
</style>
