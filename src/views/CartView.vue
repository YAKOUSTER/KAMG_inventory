<template>
  <div>
    <h1 class="text-h5 text-md-h4 page-title mb-6">Panier d'emprunt</h1>
    <v-card variant="outlined">
      <v-card-text>
        <v-alert v-if="!cart.items.length" type="info" variant="tonal">Le panier est vide.</v-alert>
        <div v-else>
          <div v-for="item in cart.items" :key="item.id" class="cart-line">
            <div class="d-flex align-start ga-2">
              <div class="flex-grow-1">
                <div class="text-subtitle-2">{{ item.code }} — {{ item.nom }}</div>
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
            :items="inventory.people"
            item-title="nom"
            item-value="id"
            label="Emprunteur"
          />
          <v-text-field v-model="titre" label="Titre de l'emprunt (spectacle, répétition…)" />
          <v-text-field v-model="dateRetourPrevue" label="Retour prévu" type="date" />
          <v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
          <v-btn color="primary" block size="large" :disabled="!personId" :loading="saving" @click="validate">
            Valider l'emprunt
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useInventoryStore } from '@/stores/inventory'
import { api } from '@/services/api'

const cart = useCartStore()
const inventory = useInventoryStore()
const router = useRouter()
const personId = ref(null)
const titre = ref('')
const dateRetourPrevue = ref('')
const saving = ref(false)
const error = ref('')

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
    await inventory.refresh()
    router.push({ name: 'loan-detail', params: { id: loan.id } })
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cart-line {
  padding: 12px 0;
  border-bottom: 1px solid #ecece4;
}
</style>
