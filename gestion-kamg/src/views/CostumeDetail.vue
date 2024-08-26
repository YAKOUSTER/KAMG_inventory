<template>
  <div v-if="costume">
    <v-container class="costume-detail-container my-8">
      <v-row>
        <v-col cols="12" md="6">
          <v-img :src="costume.image || 'https://via.placeholder.com/600'" class="costume-image" contain></v-img>
        </v-col>

        <v-col cols="12" md="6">
          <v-card flat>
            <v-card-title class="headline">
              {{ isEditing ? 'Modifier le Costume' : costume.name }}
            </v-card-title>
            <v-card-subtitle class="text-subtitle-1 text-grey-darken-1 mb-4">
              {{ isEditing ? '' : costume.type }}
            </v-card-subtitle>

            <v-divider class="my-4"></v-divider>

            <v-card-text class="costume-details">
              <div v-if="isEditing">
                <v-form ref="editForm">
                  <v-text-field v-model="editCostume.name" label="Nom"></v-text-field>
                  <v-text-field v-model="editCostume.type" label="Type"></v-text-field>
                  <v-textarea v-model="editCostume.description" label="Description"></v-textarea>
                  <v-text-field v-model="editCostume.size" label="Taille"></v-text-field>
                  <v-text-field v-model="editCostume.epoque" label="Époque"></v-text-field>
                  <v-text-field v-model="editCostume.materiau" label="Matériau"></v-text-field>
                  <v-text-field v-model="editCostume.etat" label="État"></v-text-field>
                  <v-text-field v-model="editCostume.couleur" label="Couleur"></v-text-field>
                  <v-switch v-model="editCostume.disponibilite" label="Disponible"></v-switch>
                </v-form>
              </div>

              <div v-else>
                <p><strong>Description :</strong> {{ costume.description }}</p>
                <p><strong>Taille :</strong> {{ costume.size }}</p>
                <p><strong>Époque :</strong> {{ costume.epoque }}</p>
                <p><strong>Matériau :</strong> {{ costume.materiau }}</p>
                <p><strong>État :</strong> {{ costume.etat }}</p>
                <p><strong>Couleur :</strong> {{ costume.couleur }}</p>
                <p><strong>Disponibilité :</strong> <span :class="{'text-success': costume.disponibilite, 'text-error': !costume.disponibilite}">{{ costume.disponibilite ? 'Disponible' : 'Indisponible' }}</span></p>
              </div>
            </v-card-text>

            <v-btn v-if="!isEditing" @click="addCostumeToCart(costume)" color="primary" large block class="mt-4">
              Ajouter au panier
            </v-btn>

            <v-btn v-if="isEditing" @click="saveChanges" color="success" large block class="mt-4">
              Sauvegarder les modifications
            </v-btn>

            <v-btn v-if="isEditing" @click="cancelEditing" color="error" large block class="mt-2">
              Annuler
            </v-btn>

            <v-btn v-else @click="toggleEditing" color="warning" large block class="mt-4">
              Modifier
            </v-btn>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-12" v-if="!isEditing">
        <v-col>
          <v-card flat>
            <v-card-title class="headline">Historique des Emprunts</v-card-title>
            <v-divider></v-divider>

            <v-list dense>
              <v-list-item v-for="entry in loanHistory" :key="entry.loan_id">
                <v-list-item-content>
                  <v-list-item-title>
                    Emprunté par <strong>{{ entry.member_name }}</strong> le <strong>{{ entry.loan_date }}</strong>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Retourné le {{ entry.return_date || 'en cours' }}<br>
                    <em>Commentaire:</em> {{ entry.comment }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>

            <v-alert v-if="loanHistory.length === 0" type="info" text>
              Aucun emprunt enregistré pour ce costume.
            </v-alert>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-if="error" class="mt-4">
        <v-col>
          <v-alert type="error" dismissible>{{ error }}</v-alert>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import { fetchCostumeById, updateCostumeById } from '../services/costumeService';

export default {
  name: 'CostumeDetail',
  data() {
    return {
      costume: null,
      error: null,
      loanHistory: [],
      isEditing: false, // Pour contrôler le mode édition
      editCostume: {} // Pour stocker les données du formulaire d'édition
    };
  },
  async created() {
    const costumeId = this.$route.params.id;
    try {
      this.costume = await fetchCostumeById(costumeId);
      this.editCostume = { ...this.costume }; // Clone l'objet costume pour l'édition
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
      if (costume.disponibilite === 'Disponible') {
        console.log('Ajout au panier:', costume);
        this.addToCart(costume);
      } else {
        this.error = 'Ce costume n\'est pas disponible pour l\'ajout au panier.';
      }
    },
    toggleEditing() {
      this.isEditing = !this.isEditing;
    },
    cancelEditing() {
      this.isEditing = false;
      this.editCostume = { ...this.costume }; // Réinitialise les changements
    },
    async saveChanges() {
      try {
        await updateCostumeById(this.costume.id, this.editCostume);
        this.costume = { ...this.editCostume }; // Met à jour le costume avec les nouvelles données
        this.isEditing = false;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des modifications:', error);
        this.error = 'Erreur lors de la sauvegarde des modifications.';
      }
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


<style scoped>
.costume-detail-container {
  max-width: 1200px;
  margin: auto;
}

.costume-image {
  width: 100%;
  border-radius: 8px;
}

.costume-details p {
  margin: 8px 0;
  line-height: 1.6;
}

.v-card-title.headline {
  font-weight: bold;
}

.v-card-subtitle {
  color: #6b6b6b;
}

.text-success {
  color: green;
}

.text-error {
  color: red;
}

.v-btn.large {
  height: 56px;
  font-size: 18px;
}
</style>
