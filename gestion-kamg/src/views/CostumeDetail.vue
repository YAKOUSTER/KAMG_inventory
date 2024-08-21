<template>
  <div>
    <div v-if="costume">
      <h2>Détails du Costume</h2>
      <p><strong>Nom:</strong> {{ costume.name }}</p>
      <p><strong>Type:</strong> {{ costume.type }}</p>
      <p><strong>Description:</strong> {{ costume.description }}</p>
      <p><strong>Taille:</strong> {{ costume.size }}</p>
      <p><strong>Époque:</strong> {{ costume.epoque }}</p>
      <p><strong>Matériau:</strong> {{ costume.materiau }}</p>
      <p><strong>État:</strong> {{ costume.etat }}</p>
      <p><strong>Couleur:</strong> {{ costume.couleur }}</p>
      <p><strong>Disponibilité:</strong> {{ costume.disponibilite ? 'Disponible' : 'Indisponible' }}</p>
      
      <h2>Historique des Emprunts</h2>
      <ul>
        <li v-for="entry in loanHistory" :key="entry.loan_id">
          Emprunté par {{ entry.member_name }} le {{ entry.loan_date }} (retourné le {{ entry.return_date || 'en cours' }}).
          Commentaire: {{ entry.comment }}
        </li>
      </ul>

      <button @click="addCostumeToCart(costume)">Ajouter au panier</button>
    </div>
    <p v-else>Chargement...</p>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import { fetchCostumeById } from '../services/costumeService';

export default {
  name: 'CostumeDetail',
  data() {
    return {
      costume: null,
      error: null,
      loanHistory: []
    };
  },
  async created() {
    const costumeId = this.$route.params.id;
    try {
      this.costume = await fetchCostumeById(costumeId);
      await this.fetchLoanHistory(); // Fetch loan history only after costume is loaded
    } catch (error) {
      this.error = 'Erreur lors du chargement du costume.';
      console.error(error);
    }
  },
  computed: {
    ...mapGetters('store', ['cartItems']) // Accédez aux getters du store
  },
  methods: {
    ...mapActions('store', ['addToCart']), // Mappez les actions du store
    addCostumeToCart(costume) {
      console.log('Ajout au panier:', costume);
      this.addToCart(costume);
    },
    async fetchLoanHistory() {
      if (!this.costume) return;
      try {
        const response = await fetch(`http://localhost:5000/api/costumes/${this.costume.id}/history`);
        this.loanHistory = await response.json();
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des emprunts:', error);
      }
    }
  }
};
</script>
