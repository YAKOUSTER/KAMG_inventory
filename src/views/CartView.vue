<template>
  <div>
    <h1 class="text-h4 page-title mb-6">Panier d'emprunt</h1>
    <v-card variant="outlined">
      <v-card-text>
        <v-alert v-if="!cart.items.length" type="info" variant="tonal">Le panier est vide.</v-alert>
        <v-list v-else>
          <v-list-item v-for="item in cart.items" :key="item.id">
            <v-list-item-title>{{ item.code }} — {{ item.nom }}</v-list-item-title>
            <v-list-item-subtitle>{{ item.type }} · {{ item.tailleLettre }}</v-list-item-subtitle>
            <template #append>
              <v-text-field
                :model-value="item.comment"
                label="Commentaire"
                hide-details
                class="mr-4"
                style="min-width: 220px"
                @update:model-value="cart.setComment(item.id, $event)"
              />
              <v-btn icon variant="text" @click="cart.remove(item.id)">
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>

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
          <v-btn color="primary" :disabled="!personId" :loading="saving" @click="validate">Valider l'emprunt</v-btn>
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
    await api.createLoan({
      personId: personId.value,
      titre: titre.value,
      dateRetourPrevue: dateRetourPrevue.value,
      items: cart.items.map((item) => ({ itemId: item.id, comment: item.comment })),
    })
    cart.clear()
    await inventory.refresh()
    router.push('/emprunts')
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>
