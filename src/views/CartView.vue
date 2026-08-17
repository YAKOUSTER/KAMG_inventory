<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h1 class="text-h5 text-md-h4 page-title">Panier</h1>
      <v-spacer />
      <v-btn variant="text" to="/inventaire">Continuer l’inventaire</v-btn>
    </div>

    <v-alert v-if="!cart.items.length" type="info" variant="tonal">
      Le panier est vide. Ouvrez une fiche disponible et touchez « Ajouter au panier ».
      <div class="mt-3">
        <v-btn color="primary" to="/inventaire">Voir l’inventaire</v-btn>
      </div>
    </v-alert>

    <v-alert v-if="unavailable.length" type="warning" variant="tonal" class="mb-4">
      {{ unavailable.length === 1 ? 'Une pièce n’est plus disponible.' : 'Certaines pièces ne sont plus disponibles.' }}
      <v-btn class="ml-2" size="small" variant="text" @click="dropUnavailable">Retirer du panier</v-btn>
    </v-alert>

    <div v-if="cart.items.length">
      <div v-for="item in cart.items" :key="item.id" class="stack-item">
        <div class="d-flex align-start ga-2">
          <div class="flex-grow-1">
            <router-link :to="{ name: 'item-detail', params: { id: item.id } }" class="text-subtitle-2">
              {{ item.code }} — {{ item.nom }}
            </router-link>
            <div class="text-caption text-medium-emphasis">{{ item.type }} · {{ item.tailleLettre }}</div>
          </div>
          <v-btn icon variant="text" aria-label="Retirer" @click="cart.remove(item.id)">
            <v-icon>mdi-delete-outline</v-icon>
          </v-btn>
        </div>
        <v-text-field
          class="mt-2"
          :model-value="item.comment"
          label="Commentaire (état, note de sortie…)"
          hide-details
          @update:model-value="cart.setComment(item.id, $event)"
        />
      </div>
    </div>

    <div v-if="cart.items.length" class="mt-6">
          <v-autocomplete
            v-model="personId"
            :items="peopleItems"
            item-title="title"
            item-value="id"
            label="Emprunteur"
            :disabled="!peopleItems.length"
          />
          <p v-if="!inventory.people.length" class="text-body-2 mb-4">
            Aucune personne enregistrée.
            <router-link v-if="auth.can('people.write')" to="/personnes/nouvelle">Créer une fiche personne</router-link>
          </p>
          <v-text-field v-model="titre" label="Titre de l'emprunt (spectacle, répétition…)" />
          <v-text-field v-model="dateRetourPrevue" label="Retour prévu" type="date" />
          <v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
          <v-btn
            color="primary"
            block
            size="large"
            :disabled="!personId || Boolean(unavailable.length)"
            :loading="saving"
            @click="validate"
          >
          Valider l'emprunt
        </v-btn>
      </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { api } from '@/services/api'
import { isLoanable } from '@/domain/item'
import { addDays, todayLocal } from '@/domain/dates'
import { personDisplayName } from '@/domain/person'

const cart = useCartStore()
const inventory = useInventoryStore()
const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()
const personId = ref(route.query.person || null)
const titre = ref('')
const dateRetourPrevue = ref(addDays(todayLocal(), 7))
const saving = ref(false)
const error = ref('')

const unavailable = computed(() =>
  cart.items.filter((line) => {
    const item = inventory.itemById(line.id)
    return !item || !isLoanable(item)
  }),
)

const peopleItems = computed(() =>
  [...inventory.people]
    .sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), 'fr'))
    .map((person) => ({ id: person.id, title: personDisplayName(person) })),
)

function dropUnavailable() {
  unavailable.value.forEach((line) => cart.remove(line.id))
}

onMounted(() => inventory.refresh().catch(() => {}))

async function validate() {
  saving.value = true
  error.value = ''
  try {
    const loan = await api.createLoan({
      personId: personId.value,
      titre: titre.value,
      dateRetourPrevue: dateRetourPrevue.value,
      items: cart.items.map((item) => ({ itemId: item.id, comment: item.comment })),
    })
    cart.clear()
    inventory.patchLoan(loan)
    ui.notify('Emprunt enregistré')
    router.push({ name: 'loan-detail', params: { id: loan.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
a {
  color: #53736a;
  text-decoration: none;
}
</style>
