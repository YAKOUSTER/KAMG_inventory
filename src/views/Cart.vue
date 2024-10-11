<template>
  <VContainer class="my-8">
    <VRow>
      <VCol cols="12">
        <VCard flat>
          <VCardTitle class="headline">Votre Panier</VCardTitle>
          <VDivider></VDivider>
          <VCardText>
            <!-- Liste des articles dans le panier -->
            <VList v-if="cartItems.length > 0">
              <VListItem v-for="item in cartItems" :key="item.id" class="cart-item">
                <VListItemContent>
                  <VListItemTitle>{{ item.name }}</VListItemTitle>
                  <VListItemSubtitle>
                    Type: {{ item.type }} | Taille: {{ item.size }}
                  </VListItemSubtitle>
                </VListItemContent>
                <VListItemAction>
                  <VTextField
                    v-model="comments[item.id]"
                    label="Commentaire"
                    placeholder="Ajouter un commentaire sur l'état du costume"
                    dense
                    outlined
                    clearable
                  ></VTextField>
                </VListItemAction>
              </VListItem>
            </VList>

            <!-- Alerte si le panier est vide -->
            <VAlert v-if="cartItems.length === 0" type="info" text>
              Votre panier est vide.
            </VAlert>

            <!-- Ligne de séparation -->
            <VDivider v-if="cartItems.length > 0" class="my-4"></VDivider>

            <!-- Sélection du membre -->
            <div v-if="cartItems.length > 0">
              <VCardTitle class="headline">Associer le panier à un membre</VCardTitle>
              <VAutocomplete
                v-model="selectedMemberId"
                :items="members"
                item-title="nom"
                item-value="id"
                label="Sélectionnez un membre"
                outlined
                dense
                placeholder="Choisir un membre"
              ></VAutocomplete>

              <!-- Bouton de validation -->
              <VBtn
                :disabled="!selectedMemberId"
                @click="validateCart"
                color="primary"
                class="mt-4"
                large
                block
              >
                Valider le Panier
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import { fetchMembers } from '../services/memberService';
// Importation des composants Vuetify requis
import { 
  VList, 
  VListItem, 
  VListItemContent, 
  VListItemTitle, 
  VListItemSubtitle, 
  VTextField, 
  VSelect, 
  VCard, 
  VCardTitle, 
  VCardText, 
  VDivider, 
  VContainer, 
  VRow, 
  VCol, 
  VAlert, 
  VBtn 
} from 'vuetify/lib/components';

export default {
  name: 'Cart',
  components: {
    VList,
    VListItem,
    VListItemContent,
    VListItemTitle,
    VListItemSubtitle,
    VTextField,
    VSelect,
    VCard,
    VCardTitle,
    VCardText,
    VDivider,
    VContainer,
    VRow,
    VCol,
    VAlert,
    VBtn
  },
  data() {
    return {
      selectedMemberId: null,
      members: [],  // Initialise le tableau des membres
      comments: {}
    };
  },
  computed: {
    ...mapGetters('store', ['cartItems'])
  },
  methods: {
    ...mapActions('store', ['validateCart']),
    async fetchMembers() {
      try {
        const membersData = await fetchMembers();
        // Transformez les objets membres en objets simples
        this.members = membersData.map(member => ({
          id: member.id,
          nom: member.nom
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération des membres:', error);
      }
    },
    async validateCart() {
      if (this.selectedMemberId) {
        try {
          await this.$store.dispatch('store/validateCart', {
            memberId: this.selectedMemberId,
            cartItems: this.cartItems,
            comments: this.comments
          });
          this.$store.commit('store/CLEAR_CART');
          this.$router.push('/');
        } catch (error) {
          console.error('Erreur lors de la validation du panier:', error);
        }
      } else {
        alert('Veuillez sélectionner un membre.');
      }
    }
  },
  async created() {
    await this.fetchMembers();
  }
};
</script>

<style scoped>
.cart-item {
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.headline {
  font-weight: bold;
  font-size: 24px;
}

.v-select {
  margin-bottom: 16px;
}
</style>
