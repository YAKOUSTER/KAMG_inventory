<template>
  <div class="login-page">
    <div class="login-page__glow login-page__glow--one" aria-hidden="true" />
    <div class="login-page__glow login-page__glow--two" aria-hidden="true" />

    <div class="login-card">
      <header class="login-card__header">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="login-card__logo" />
        <p class="login-card__eyebrow">{{ GROUP_NAME }}</p>
        <h1 class="login-card__title">Inscription</h1>
        <p class="login-card__subtitle">
          Créez un compte. Le bureau range ensuite votre fiche (groupe de danse, enfants…).
        </p>
      </header>

      <v-form class="login-card__form" @submit.prevent="submit">
        <v-text-field v-model="prenom" label="Prénom" variant="outlined" density="comfortable" hide-details="auto" autocomplete="given-name" class="login-field" />
        <v-text-field
          :model-value="nom"
          label="Nom"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          autocomplete="family-name"
          class="login-field"
          @update:model-value="nom = String($event || '').toLocaleUpperCase('fr')"
        />
        <v-text-field v-model="email" label="E-mail" type="email" variant="outlined" density="comfortable" hide-details="auto" autocomplete="email" class="login-field" />
        <v-text-field
          v-model="password"
          label="Mot de passe (8 caractères min.)"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          :type="show ? 'text' : 'password'"
          autocomplete="new-password"
          :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          class="login-field"
          @click:append-inner="show = !show"
        />
        <v-text-field v-model="telephone" label="Téléphone (facultatif)" variant="outlined" density="comfortable" hide-details="auto" autocomplete="tel" class="login-field" />
        <v-select
          v-model="relation"
          :items="relationItems"
          label="Vous êtes"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="login-field"
        />
        <v-textarea
          v-if="relation === 'parent'"
          v-model="childrenNames"
          label="Prénom de l’enfant (ou des enfants)"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          rows="2"
          class="login-field"
        />
        <v-textarea
          v-model="message"
          label="Message pour le bureau (facultatif)"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          rows="2"
          class="login-field"
        />

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="login-card__alert">
          {{ error }}
        </v-alert>

        <v-btn type="submit" color="primary" block size="large" class="login-card__submit" :loading="loading">
          Créer mon compte
        </v-btn>
      </v-form>

      <div class="login-card__member">
        <span class="login-card__member-label">Déjà inscrit·e ?</span>
        <v-btn variant="text" block class="text-none mt-1" to="/connexion">Se connecter</v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { SIGNUP_RELATIONS } from '@/domain/memberAccount'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'

const auth = useAuthStore()
const router = useRouter()
const prenom = ref('')
const nom = ref('')
const email = ref('')
const password = ref('')
const telephone = ref('')
const relation = ref('danseur')
const childrenNames = ref('')
const message = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')
const relationItems = SIGNUP_RELATIONS.map((entry) => ({ title: entry.label, value: entry.id }))

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.register({
      prenom: prenom.value,
      nom: nom.value,
      email: email.value,
      password: password.value,
      telephone: telephone.value,
      relation: relation.value,
      childrenNames: childrenNames.value,
      message: message.value,
    })
    router.replace('/espace-membre')
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
  max-width: 440px;
  padding: clamp(1.5rem, 4vw, 2.25rem);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    0 24px 64px rgba(44, 51, 44, 0.12),
    0 2px 8px rgba(44, 51, 44, 0.06);
  backdrop-filter: blur(14px);
}
.login-card__header {
  text-align: center;
  margin-bottom: 1.4rem;
}
.login-card__logo {
  max-width: min(160px, 50vw);
  max-height: min(120px, 20vh);
  display: block;
  margin: 0 auto 0.8rem;
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
  font-size: 1.45rem;
  font-weight: 700;
}
.login-card__subtitle {
  margin: 0.55rem 0 0;
  font-size: 0.9rem;
  color: rgba(44, 51, 44, 0.62);
  line-height: 1.45;
}
.login-card__form {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.login-field :deep(.v-field) {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
}
.login-card__alert,
.login-card__submit {
  margin-top: 0.7rem;
}
.login-card__submit {
  min-height: 48px;
  font-weight: 700;
  border-radius: 14px !important;
}
.login-card__member {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(83, 115, 106, 0.14);
  text-align: center;
}
.login-card__member-label {
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.62);
}
</style>
