<template>
  <div>
    <h2>Votre Panier</h2>
    <ul>
      <li v-for="item in cartItems" :key="item.id">
        {{ item.name }} - {{ item.type }} - {{ item.size }}
        <input v-model="comments[item.id]" placeholder="Ajouter un commentaire sur l'état du costume" />
      </li>
    </ul>
    <div v-if="cartItems.length === 0">Votre panier est vide.</div>

    <div v-else>
      <h3>Associer le panier à un membre</h3>
      <select v-model="selectedMemberId">
        <option v-for="member in members" :key="member.id" :value="member.id">
          {{ member.nom }}
        </option>
      </select>
      <button @click="validateCart">Valider le Panier</button>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import { fetchMembers } from '../services/memberService'; // Assurez-vous que ce service est correct

export default {
  name: 'Cart',
  data() {
    return {
      selectedMemberId: null,
      members: [], // Liste des membres de l'association
      comments: {} // Objet pour stocker les commentaires avec ID du costume comme clé
    };
  },
  computed: {
    ...mapGetters('store', ['cartItems'])
  },
  methods: {
    ...mapActions('store', ['validateCart']),
    async fetchMembers() {
      try {
        this.members = await fetchMembers(); // Récupère la liste des membres
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
          // Réinitialiser le panier après validation
          this.$store.commit('store/CLEAR_CART');
          this.$router.push('/'); // Retourner à l'accueil ou à une autre page après validation
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
