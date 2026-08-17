<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-2 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Panier</h1>
      <v-chip v-if="cart.items.length" size="small" color="primary" variant="tonal">
        {{ cart.items.length }} pièce{{ cart.items.length > 1 ? 's' : '' }}
      </v-chip>
      <v-spacer />
      <v-btn variant="text" to="/inventaire">Continuer l’inventaire</v-btn>
    </div>

    <v-alert v-if="!cart.items.length" type="info" variant="tonal">
      Le panier est vide. Parcourez l’inventaire et touchez « Emprunter » sur les pièces disponibles.
      <div class="mt-3">
        <v-btn color="primary" to="/inventaire">Voir l’inventaire</v-btn>
      </div>
    </v-alert>

    <v-alert v-if="unavailable.length && !archiveMode" type="warning" variant="tonal" class="mb-4">
      {{ unavailable.length === 1 ? 'Une pièce n’est plus disponible.' : 'Certaines pièces ne sont plus disponibles.' }}
      <v-btn class="ml-2" size="small" variant="text" @click="dropUnavailable">Retirer du panier</v-btn>
    </v-alert>

    <v-row v-if="cart.items.length" class="mb-6">
      <v-col v-for="line in cart.items" :key="line.id" cols="12" sm="6" lg="4">
        <CartItemCard
          :line="line"
          :item="inventory.itemById(line.id)"
          :unavailable="!archiveMode && isUnavailable(line.id)"
          @remove="cart.remove"
          @comment="cart.setComment"
        />
      </v-col>
    </v-row>

    <section v-if="cart.items.length" class="page-block cart-checkout">
      <h2 class="section-label">Finaliser l’emprunt</h2>
      <div class="form-fields">
        <FieldRow label="Emprunteur">
          <v-autocomplete
            v-model="personId"
            :items="peopleItems"
            item-title="title"
            item-value="id"
            hide-details
            :disabled="!peopleItems.length"
            :custom-filter="filterPerson"
          />
        </FieldRow>
        <p v-if="!inventory.people.length" class="text-body-2 mb-4">
          Aucune personne enregistrée.
          <router-link v-if="auth.can('people.write')" to="/personnes/nouvelle">Créer une fiche personne</router-link>
        </p>
        <FieldRow label="Titre de l'emprunt" hint="spectacle, répétition…">
          <v-text-field v-model="titre" hide-details />
        </FieldRow>
        <FieldRow label="Date d’emprunt">
          <v-text-field v-model="dateEmprunt" hide-details type="date" />
        </FieldRow>
        <FieldRow label="Retour prévu">
          <v-text-field v-model="dateRetourPrevue" hide-details type="date" />
        </FieldRow>
        <v-checkbox
          v-model="archiveMode"
          label="Archiver un emprunt déjà retourné (dates passées)"
          hide-details
          density="compact"
          class="mb-2"
        />
        <FieldRow v-if="archiveMode" label="Date de retour effectuée">
          <v-text-field v-model="dateRetourEffectuee" hide-details type="date" />
        </FieldRow>
        <v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
        <v-btn
          color="primary"
          block
          size="large"
          :disabled="!personId || (!archiveMode && Boolean(unavailable.length)) || (archiveMode && !dateRetourEffectuee)"
          :loading="saving"
          @click="validate"
        >
          {{ archiveMode ? 'Archiver l’emprunt' : 'Valider l’emprunt' }}
        </v-btn>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { api } from '@/services/api'
import { isLoanable } from '@/domain/item'
import { addDays, todayLocal } from '@/domain/dates'
import { matchesSearch, personDisplayName } from '@/domain/person'
import CartItemCard from '@/components/CartItemCard.vue'
import FieldRow from '@/components/FieldRow.vue'

const cart = useCartStore()
const inventory = useInventoryStore()
const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()
const personId = ref(route.query.person || null)
const titre = ref('')
const dateEmprunt = ref(todayLocal())
const dateRetourPrevue = ref(addDays(todayLocal(), 7))
const archiveMode = ref(false)
const dateRetourEffectuee = ref('')
const saving = ref(false)
const error = ref('')

const unavailable = computed(() =>
  cart.items.filter((line) => isUnavailable(line.id)),
)

const peopleItems = computed(() =>
  [...inventory.people]
    .sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), 'fr'))
    .map((person) => ({ id: person.id, title: personDisplayName(person) })),
)

function filterPerson(_value, query, item) {
  return matchesSearch(item.raw.title, query)
}

function isUnavailable(id) {
  const item = inventory.itemById(id)
  return !item || !isLoanable(item)
}

function dropUnavailable() {
  unavailable.value.forEach((line) => cart.remove(line.id))
}

watch(archiveMode, (enabled) => {
  if (enabled && !dateRetourEffectuee.value) {
    dateRetourEffectuee.value = dateEmprunt.value || todayLocal()
  }
})

onMounted(() => inventory.refresh().catch(() => {}))

async function validate() {
  saving.value = true
  error.value = ''
  try {
    const body = {
      personId: personId.value,
      titre: titre.value,
      dateEmprunt: dateEmprunt.value,
      dateRetourPrevue: archiveMode.value ? '' : dateRetourPrevue.value,
      items: cart.items.map((item) => ({ itemId: item.id, comment: item.comment })),
    }
    if (archiveMode.value) {
      body.dateRetour = dateRetourEffectuee.value
    }
    const loan = await api.createLoan(body)
    cart.clear()
    inventory.patchLoan(loan)
    ui.notify(archiveMode.value ? 'Emprunt archivé' : 'Emprunt enregistré')
    router.push({ name: 'loan-detail', params: { id: loan.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cart-checkout {
  max-width: 520px;
}
a {
  color: #53736a;
  text-decoration: none;
}
</style>
